import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { createClient } from 'npm:@supabase/supabase-js@2'

interface Signal { label: string; severity: 'info' | 'warn' | 'critical' }

interface ClientScore {
  user_id: string
  full_name: string
  email: string
  program: string | null
  score: number
  status: 'at_risk' | 'slipping' | 'stable' | 'expansion_ready'
  signals: Signal[]
  arr_value: number
  last_active_at: string | null
  metrics: Record<string, number | null | string>
  linked_users?: { user_id: string; full_name: string }[]
}

const PROGRAM_DURATION_DAYS: Record<string, number> = { tfv: 180, tfba: 90, tffm: 365 }
const PROGRAM_ARR: Record<string, number> = { tfv: 5000, tfba: 9000, tffm: 40000 }
const DRIVE_ROOT_FOLDER = '1qdgqj51PK5oAsgA9A6iExwzKZR3rxo5B' // AI Trust Software

function daysSince(date: string | null | undefined, now = Date.now()): number | null {
  if (!date) return null
  return Math.floor((now - new Date(date).getTime()) / 86400000)
}

function classify(score: number): ClientScore['status'] {
  if (score < 4) return 'at_risk'
  if (score < 6.5) return 'slipping'
  if (score < 8.5) return 'stable'
  return 'expansion_ready'
}

// ---------- Google Service Account token ----------
async function getGoogleAccessToken(): Promise<string | null> {
  try {
    const raw = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_JSON')
    if (!raw) return null
    const sa = JSON.parse(raw)
    const now = Math.floor(Date.now() / 1000)
    const header = { alg: 'RS256', typ: 'JWT' }
    const claim = {
      iss: sa.client_email,
      scope: 'https://www.googleapis.com/auth/drive.readonly',
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600,
    }
    const enc = (o: any) => btoa(JSON.stringify(o)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
    const unsigned = `${enc(header)}.${enc(claim)}`
    const pem = sa.private_key.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '')
    const der = Uint8Array.from(atob(pem), c => c.charCodeAt(0))
    const key = await crypto.subtle.importKey('pkcs8', der, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign'])
    const sigBuf = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(unsigned))
    const sig = btoa(String.fromCharCode(...new Uint8Array(sigBuf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
    const jwt = `${unsigned}.${sig}`
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
    })
    const json = await res.json()
    return json.access_token ?? null
  } catch (e) {
    console.error('google token error', e)
    return null
  }
}

// Pull every file/folder name under the AI Trust Software root (recursive, breadth-first, capped)
async function listDriveTree(token: string): Promise<{ name: string; mimeType: string; parents?: string[] }[]> {
  const all: { name: string; mimeType: string; parents?: string[] }[] = []
  const queue: string[] = [DRIVE_ROOT_FOLDER]
  const seen = new Set<string>()
  let safety = 200 // cap folders walked

  while (queue.length && safety-- > 0) {
    const folder = queue.shift()!
    if (seen.has(folder)) continue
    seen.add(folder)
    let pageToken: string | undefined
    do {
      const url = new URL('https://www.googleapis.com/drive/v3/files')
      url.searchParams.set('q', `'${folder}' in parents and trashed=false`)
      url.searchParams.set('fields', 'nextPageToken, files(id,name,mimeType,parents)')
      url.searchParams.set('pageSize', '200')
      url.searchParams.set('supportsAllDrives', 'true')
      url.searchParams.set('includeItemsFromAllDrives', 'true')
      if (pageToken) url.searchParams.set('pageToken', pageToken)
      const res = await fetch(url.toString(), { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) { console.error('drive list err', res.status, await res.text()); break }
      const json = await res.json()
      for (const f of json.files ?? []) {
        all.push({ name: f.name, mimeType: f.mimeType, parents: f.parents })
        if (f.mimeType === 'application/vnd.google-apps.folder') queue.push(f.id)
      }
      pageToken = json.nextPageToken
    } while (pageToken)
  }
  return all
}

// ---------- Fathom: recent meetings + transcripts (paginated) ----------
interface FathomMeeting { id: string; title: string; meeting_type: string; created_at: string; transcript: string; summary: string; invitees: string; speakers: string; identity: string; invitee_count: number; external_count: number; share_url?: string }
interface FathomListResult { meetings: FathomMeeting[]; complete: boolean; rateLimited: boolean }
// Module-scope cache so repeat invocations in the same isolate don't hammer Fathom
let _fathomCache: { at: number; data: FathomListResult } | null = null
let _fathomInflight: Promise<FathomListResult> | null = null
const _fathomDetailsCache = new Map<string, Promise<{ meeting: FathomMeeting; complete: boolean; rateLimited: boolean }>>()
const FATHOM_TTL_MS = 60 * 60 * 1000

async function fathomJson(url: URL, key: string): Promise<{ ok: boolean; status: number; json: any; body: string; rateLimited: boolean }> {
  let lastStatus = 0
  let lastBody = ''
  let rateLimited = false
  for (let attempt = 0; attempt < 4; attempt++) {
    let res: Response | null = null
    try {
      res = await fetch(url.toString(), { headers: { 'X-Api-Key': key, 'Accept': 'application/json' } })
    } catch (e) {
      console.error('fathom fetch attempt failed', e)
    }
    if (res?.ok) {
      const json = await res.json().catch(() => null)
      return { ok: true, status: res.status, json, body: '', rateLimited }
    }
    lastStatus = res?.status ?? 0
    lastBody = res ? await res.text().catch(() => '') : ''
    if (lastStatus === 429) rateLimited = true
    if (![429, 502, 503, 504].includes(lastStatus)) break
    const retryAfter = res?.headers.get('Retry-After')
    const retryMs = retryAfter && !Number.isNaN(Number(retryAfter)) ? Number(retryAfter) * 1000 : 800 * Math.pow(2, attempt)
    await new Promise((r) => setTimeout(r, Math.min(10000, retryMs)))
  }
  return { ok: false, status: lastStatus, json: null, body: lastBody, rateLimited }
}

function transcriptToText(raw: any): { text: string; speakers: string; speakerEmails: string } {
  if (!Array.isArray(raw)) return { text: typeof raw === 'string' ? raw : (raw?.text ?? ''), speakers: '', speakerEmails: '' }
  const speakerSet = new Set<string>()
  const speakerEmailSet = new Set<string>()
  const text = raw.map((t: any) => {
    const sp = t?.speaker?.display_name ?? ''
    const speakerEmail = t?.speaker?.matched_calendar_invitee_email ?? ''
    if (sp) speakerSet.add(sp)
    if (speakerEmail) speakerEmailSet.add(speakerEmail)
    return `${sp}: ${t?.text ?? ''}`
  }).join('\n')
  return { text, speakers: Array.from(speakerSet).join(', '), speakerEmails: Array.from(speakerEmailSet).join(' ') }
}

function summaryToText(raw: any): string {
  if (!raw) return ''
  if (typeof raw === 'string') return raw
  return raw.markdown_formatted ?? raw.text ?? ''
}

async function listFathomMeetings(): Promise<FathomListResult> {
  if (_fathomCache && (Date.now() - _fathomCache.at) < FATHOM_TTL_MS) return _fathomCache.data
  if (_fathomInflight) return _fathomInflight
  _fathomInflight = (async () => {
    const key = Deno.env.get('FATHOM_API_KEY')
    if (!key) return { meetings: [], complete: true, rateLimited: false }
    const out: FathomMeeting[] = []
    let complete = false
    let rateLimited = false
    try {
      const since = new Date(Date.now() - 730 * 86400000).toISOString()
      let cursor: string | undefined
      let pages = 0
      do {
        const url = new URL('https://api.fathom.ai/external/v1/meetings')
        url.searchParams.set('created_after', since)
        // List metadata first. Pulling every transcript here hits Fathom rate limits
        // and can poison the retention cache with empty/partial results.
        url.searchParams.set('calendar_invitees_domains_type', 'all')
        url.searchParams.set('limit', '100')
        if (cursor) url.searchParams.set('cursor', cursor)

        const response = await fathomJson(url, key)
        if (!response.ok) {
          if (response.rateLimited) rateLimited = true
          console.error('fathom err', response.status, response.body)
          break
        }

      const json = response.json
      const items = json?.items ?? []
      for (const m of items) {
        const transcriptResult = transcriptToText(m.transcript)
        const summary = summaryToText(m.default_summary ?? m.summary)
        const inviteeArr = Array.isArray(m.calendar_invitees) ? m.calendar_invitees : []
        const invitees = inviteeArr.map((i: any) => `${i?.name ?? ''} <${i?.email ?? ''}>`).join(', ')
        const inviteeIdentity = inviteeArr.map((i: any) => `${i?.name ?? ''} ${i?.email ?? ''} ${i?.matched_speaker_display_name ?? ''}`).join(' ')
        const title = `${m.meeting_title ?? ''} ${m.title ?? ''}`.trim()
        const meetingType = String(m.meeting_type ?? '')
        const speakers = transcriptResult.speakers
        out.push({
          id: String(m.recording_id ?? m.id ?? ''),
          title,
          meeting_type: meetingType,
          created_at: m.created_at ?? m.scheduled_start_time ?? m.recording_start_time ?? new Date().toISOString(),
          transcript: transcriptResult.text, summary, invitees,
          speakers,
          share_url: m.share_url ?? m.url,
          identity: `${title} ${meetingType} ${inviteeIdentity} ${speakers} ${transcriptResult.speakerEmails} ${summary}`,
          invitee_count: inviteeArr.length,
          external_count: inviteeArr.filter((i: any) => i?.is_external === true).length,
        })
      }

      cursor = json?.next_cursor ?? undefined
      pages++
    } while (cursor && pages < 50)
      complete = !cursor
    } catch (e) {
      console.error('fathom fetch failed', e)
    }
    const result = { meetings: out, complete, rateLimited }
    if (complete) _fathomCache = { at: Date.now(), data: result }
    else if (_fathomCache?.data?.meetings?.length) return { ..._fathomCache.data, complete: _fathomCache.data.complete }
    return result
  })()
  try {
    const result = await _fathomInflight
    return result
  } finally {
    _fathomInflight = null
  }
}

async function hydrateFathomMeetings(meetings: FathomMeeting[]): Promise<{ meetings: FathomMeeting[]; complete: boolean; rateLimited: boolean }> {
  const key = Deno.env.get('FATHOM_API_KEY')
  if (!key || meetings.length === 0) return { meetings, complete: true, rateLimited: false }
  const detailed = await Promise.all(meetings.map((m) => {
    if (!m.id) return Promise.resolve({ meeting: m, complete: true, rateLimited: false })
    const cached = _fathomDetailsCache.get(m.id)
    if (cached) return cached
    const task = (async () => {
      const transcriptUrl = new URL(`https://api.fathom.ai/external/v1/recordings/${encodeURIComponent(m.id)}/transcript`)
      const summaryUrl = new URL(`https://api.fathom.ai/external/v1/recordings/${encodeURIComponent(m.id)}/summary`)
      const [transcriptResp, summaryResp] = await Promise.all([fathomJson(transcriptUrl, key), fathomJson(summaryUrl, key)])
      const rateLimited = transcriptResp.rateLimited || summaryResp.rateLimited
      const complete = !rateLimited && ![0, 502, 503, 504].includes(transcriptResp.status) && ![0, 502, 503, 504].includes(summaryResp.status)
      if (!transcriptResp.ok && transcriptResp.status !== 404) console.error('fathom transcript err', m.id, transcriptResp.status, transcriptResp.body)
      if (!summaryResp.ok && summaryResp.status !== 404) console.error('fathom summary err', m.id, summaryResp.status, summaryResp.body)
      const transcriptResult = transcriptResp.ok ? transcriptToText(transcriptResp.json?.transcript) : { text: m.transcript, speakers: m.speakers, speakerEmails: '' }
      const summary = summaryResp.ok ? summaryToText(summaryResp.json?.summary) : m.summary
      const speakers = transcriptResult.speakers || m.speakers
      return {
        meeting: {
          ...m,
          transcript: transcriptResult.text || m.transcript,
          summary: summary || m.summary,
          speakers,
          identity: `${m.identity} ${speakers} ${transcriptResult.speakerEmails} ${summary || ''}`,
        },
        complete,
        rateLimited,
      }
    })()
    _fathomDetailsCache.set(m.id, task)
    return task
  }))
  return {
    meetings: detailed.map((d) => d.meeting),
    complete: detailed.every((d) => d.complete),
    rateLimited: detailed.some((d) => d.rateLimited),
  }
}


function nameMatches(haystack: string, fullName: string): boolean {
  const h = haystack.toLowerCase()
  const parts = fullName.toLowerCase().split(/\s+/).filter(Boolean)
  if (!parts.length) return false
  if (h.includes(fullName.toLowerCase())) return true
  // Match if first + last name both appear
  if (parts.length >= 2) return h.includes(parts[0]) && h.includes(parts[parts.length - 1])
  return h.includes(parts[0])
}

function tokenMatches(haystack: string, token: string): boolean {
  if (!token) return false
  const escaped = token.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, 'i').test(haystack)
}

function clientMeetingScore(meeting: FathomMeeting, fullName: string, email: string | null | undefined, firstNameCounts: Map<string, number>, lastNameCounts: Map<string, number>): number {
  const identity = (meeting.identity || `${meeting.title} ${meeting.invitees} ${meeting.speakers}`).toLowerCase()
  const emailLc = (email || '').toLowerCase().trim()
  const parts = fullName.toLowerCase().split(/\s+/).filter(Boolean)
  const first = parts[0] ?? ''
  const last = parts.length > 1 ? parts[parts.length - 1] : ''
  let score = 0
  if (emailLc && identity.includes(emailLc)) score += 100
  if (fullName && identity.includes(fullName.toLowerCase())) score += 80
  if (first && last && tokenMatches(identity, first) && tokenMatches(identity, last)) score += 75
  if (first && firstNameCounts.get(first) === 1 && tokenMatches(identity, first)) score += 45
  if (last && lastNameCounts.get(last) === 1 && tokenMatches(identity, last)) score += 35
  return score
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Active non-Lite clients
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, display_name, email, program_name, created_at, needs_profile_completion, membership_type, linked_user_ids')
      .not('program_name', 'is', null)

    const clients = (profiles ?? []).filter((p) => {
      const prog = (p.program_name || '').toLowerCase()
      if (!prog || prog === 'fbu' || prog === 'truheirs-lite' || prog === 'lite') return false
      if (p.needs_profile_completion === true) return false
      if ((p.first_name || '').toLowerCase() === 'invited') return false
      if (p.membership_type === 'family_member') return false
      return true
    })

    // External sources — fetch once, reuse per client
    const [driveToken, fathomResult] = await Promise.all([
      getGoogleAccessToken(),
      listFathomMeetings(),
    ])
    const fathomMeetings = fathomResult.meetings
    if (!fathomResult.complete) {
      console.error(`fathom incomplete; refusing to compute inaccurate retention results. meetings fetched: ${fathomMeetings.length}, rate limited: ${fathomResult.rateLimited}`)
      return new Response(JSON.stringify({ error: 'Fathom is still syncing/rate-limited. Keeping existing retention data until a full transcript scan completes.', sources: { fathom_meetings: fathomMeetings.length, fathom_complete: false, fathom_rate_limited: fathomResult.rateLimited } }), {
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    const driveTree = driveToken ? await listDriveTree(driveToken) : []
    console.log(`drive files: ${driveTree.length}, fathom meetings: ${fathomMeetings.length}, fathom complete: ${fathomResult.complete}, rate limited: ${fathomResult.rateLimited}`)

    const firstNameCounts = new Map<string, number>()
    const lastNameCounts = new Map<string, number>()
    for (const c of clients) {
      const clientName = [c.first_name, c.last_name].filter(Boolean).join(' ') || c.display_name || c.email || ''
      const parts = clientName.toLowerCase().split(/\s+/).filter(Boolean)
      const first = parts[0]
      const last = parts.length > 1 ? parts[parts.length - 1] : ''
      if (first) firstNameCounts.set(first, (firstNameCounts.get(first) ?? 0) + 1)
      if (last) lastNameCounts.set(last, (lastNameCounts.get(last) ?? 0) + 1)
    }

    const results: ClientScore[] = []

    for (const p of clients) {
      const prog = (p.program_name || '').toLowerCase()
      const programKey = prog.includes('tffm') || prog.includes('succession') ? 'tffm'
        : prog.includes('tfba') || prog.includes('accelerator') ? 'tfba'
        : prog.includes('tfv') || prog.includes('vault') ? 'tfv'
        : 'tfv'

      const tenureDays = daysSince(p.created_at) ?? 0
      const programLen = PROGRAM_DURATION_DAYS[programKey] ?? 180
      const daysToEnd = Math.max(0, programLen - Math.min(tenureDays, programLen))

      const fullName = [p.first_name, p.last_name].filter(Boolean).join(' ') || p.display_name || p.email

      const signals: Signal[] = []
      // Default neutral score when no data exists for a dimension (so missing data ≠ failure)
      let attendanceScore = 6
      let communityScore = 6
      let trustScore = 6
      let successionScore = 6
      let responseScore = 6
      let tenureScore = 6
      let fathomScore = 6

      // -------- Community: posts + DMs + group messages --------
      const [posts, dms, gms] = await Promise.all([
        supabase.from('community_posts').select('created_at').eq('user_id', p.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('direct_messages').select('created_at').eq('sender_id', p.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('group_messages').select('created_at').eq('sender_id', p.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      ])
      const lastCommunityAt = [posts.data?.created_at, dms.data?.created_at, gms.data?.created_at]
        .filter(Boolean)
        .sort()
        .reverse()[0] ?? null
      const lastCommunityDays = daysSince(lastCommunityAt)
      if (lastCommunityDays === null) {
        signals.push({ label: 'No community activity on record', severity: 'warn' })
        communityScore = 4
      } else if (lastCommunityDays > 21) { communityScore = 2; signals.push({ label: `No community activity in ${lastCommunityDays}d`, severity: 'critical' }) }
      else if (lastCommunityDays > 10) { communityScore = 5; signals.push({ label: `Posting cadence dropped (${lastCommunityDays}d)`, severity: 'warn' }) }
      else if (lastCommunityDays > 4) { communityScore = 7 }
      else communityScore = 9

      // -------- Attendance (TFV has no coaching calls — skip) --------
      const { data: lastAttended } = await supabase
        .from('session_attendance')
        .select('joined_at').eq('user_id', p.id).order('joined_at', { ascending: false }).limit(1).maybeSingle()
      const lastAttendedDays = daysSince(lastAttended?.joined_at)
      if (programKey === 'tfv') {
        attendanceScore = 8 // neutral-positive; TFV doesn't include coaching calls
      } else if (lastAttendedDays === null) {
        signals.push({ label: 'No coaching call attendance logged', severity: 'warn' })
        attendanceScore = 4
      } else if (lastAttendedDays > 30) { attendanceScore = 2; signals.push({ label: `Missed coaching calls (${lastAttendedDays}d)`, severity: 'critical' }) }
      else if (lastAttendedDays > 14) { attendanceScore = 5; signals.push({ label: `1–2 missed sessions`, severity: 'warn' }) }
      else if (lastAttendedDays > 7) { attendanceScore = 7 }
      else attendanceScore = 9

      // -------- Trust progress: DB submission + Drive folder presence --------
      const { data: lastTrust } = await supabase
        .from('trust_submissions')
        .select('updated_at, status').eq('user_id', p.id).order('updated_at', { ascending: false }).limit(1).maybeSingle()
      const trustDays = daysSince(lastTrust?.updated_at)

      // Ascension eligibility per Customer Feedback Framework:
      //   1) Family Protection Plan complete  2) All 3 trusts drafted (family, business, ministry)  3) Assets moved into trusts
      const [{ data: allTrusts }, { count: assetCount }] = await Promise.all([
        supabase.from('trust_submissions').select('trust_type, status').eq('user_id', p.id),
        supabase.from('trust_asset_uploads').select('id', { count: 'exact', head: true }).eq('user_id', p.id),
      ])
      const trustTypes = new Set((allTrusts ?? []).map((t: any) => (t.trust_type || '').toLowerCase()))
      const hasFamily = [...trustTypes].some((t) => t.includes('family'))
      const hasBusiness = [...trustTypes].some((t) => t.includes('business'))
      const hasMinistry = [...trustTypes].some((t) => t.includes('ministry'))
      const assetsMoved = (assetCount ?? 0) > 0
      const ascensionEligible = hasFamily && hasBusiness && hasMinistry && assetsMoved

      const driveMatches = driveTree.filter((f) => nameMatches(f.name, fullName))
      const trustCompletedInDrive = driveMatches.some((f) =>
        /complete|final|signed|executed|done/i.test(f.name) ||
        (f.mimeType === 'application/vnd.google-apps.folder' && driveMatches.length >= 2)
      )

      if (ascensionEligible) {
        trustScore = 10
        signals.push({ label: 'Ascension-ready: 3 trusts drafted + assets funded', severity: 'info' })
      } else if (trustCompletedInDrive) {
        trustScore = 10
        signals.push({ label: 'Trust folder found in AI Trust Software (likely complete)', severity: 'info' })
      } else if (driveMatches.length > 0) {
        trustScore = 7
        signals.push({ label: `Drive: ${driveMatches.length} matching file(s) — trust in progress`, severity: 'info' })
      } else if (trustDays === null) {
        signals.push({ label: 'No trust progress yet', severity: 'warn' })
        trustScore = 4
      } else if (trustDays > 14) { trustScore = 3; signals.push({ label: `Trust progress stalled ${trustDays}d`, severity: 'critical' }) }
      else if (trustDays > 7) { trustScore = 6; signals.push({ label: `Trust step stuck ${trustDays}d`, severity: 'warn' }) }
      else trustScore = 8

      // -------- Succession --------
      const { data: lastSucc } = await supabase
        .from('succession_progress')
        .select('updated_at').eq('user_id', p.id).order('updated_at', { ascending: false }).limit(1).maybeSingle()
      const succDays = daysSince(lastSucc?.updated_at)
      if (programKey === 'tffm') {
        if (succDays === null) { successionScore = 4; signals.push({ label: 'No succession plan activity', severity: 'warn' }) }
        else if (succDays > 21) { successionScore = 4; signals.push({ label: `Succession plan idle ${succDays}d`, severity: 'warn' }) }
        else successionScore = 8
      }

      // -------- Response time (DM) --------
      const dmDays = daysSince(dms.data?.created_at)
      if (dmDays === null) responseScore = 5
      else if (dmDays > 18) { responseScore = 4; signals.push({ label: `No DM activity ${dmDays}d`, severity: 'warn' }) }
      else if (dmDays <= 3) responseScore = 9
      else responseScore = 7

      // -------- Fathom transcript scan --------
      // Attribute calls only from Fathom identity fields (email, invitees,
      // matched speaker, title/type). Do not match on transcript body because
      // that wrongly assigns one client's story to another client.
      const isSalesMeeting = (m: FathomMeeting) => {
        const transcript = `${m.transcript ?? ''} ${m.summary ?? ''}`.toLowerCase()
        const context = `${m.title ?? ''} ${m.meeting_type ?? ''}`.toLowerCase()
        const bookingTalk = /\b(book(ing)?|schedul(e|ing)|calendar|setter|appointment)\s+(more\s+|sales\s+|strategy\s+|discovery\s+|intro\s+|consultation\s+)?calls?\b|\bget\s+calls?\s+(booked|on\s+the\s+calendar)\b|\bcall\s+booking\b/.test(transcript)
        const salesContext = /\b(sales|prospect|lead|setter|closer|pipeline|discovery|consultation|strategy\s+call|application|enrollment|offer)\b/.test(`${transcript} ${context}`)
        const coachingContext = /\b(1[:\s-]?1|one[\s-]?on[\s-]?one|coaching|client\s+session|trust\s+design|onboard|onboarding)\b/.test(context)
        return bookingTalk && salesContext && !coachingContext
      }
      const scoredMeetings = fathomMeetings
        .map((m) => ({ meeting: m, matchScore: clientMeetingScore(m, fullName, p.email, firstNameCounts, lastNameCounts) }))
        .filter((x) => x.matchScore >= 35)
      const hydrated = await hydrateFathomMeetings(scoredMeetings.map((x) => x.meeting))
      if (!hydrated.complete) {
        console.error(`fathom detail incomplete for ${fullName}; refusing inaccurate result. meetings matched: ${scoredMeetings.length}, rate limited: ${hydrated.rateLimited}`)
        return new Response(JSON.stringify({ error: 'Fathom is still syncing/rate-limited. Keeping existing retention data until the matching transcripts finish loading.', sources: { fathom_meetings: fathomMeetings.length, fathom_complete: false, fathom_rate_limited: hydrated.rateLimited } }), {
          status: 503,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      const myMeetings = hydrated.meetings
        .filter((x) => !isSalesMeeting(x))
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

      let lastFathomDays: number | null = null
      if (myMeetings.length > 0) {
        // Most recent call
        const sorted = [...myMeetings].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        const latestMeeting = sorted[0]
        lastFathomDays = Math.floor((Date.now() - new Date(latestMeeting.created_at).getTime()) / 86400000)

        // Clean the summary: drop markdown links, brackets, headings, field labels, then take first sentence
        const cleaned = (latestMeeting.summary || '')
          .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')     // [text](url) -> text
          .replace(/https?:\/\/\S+/g, '')              // bare urls
          .replace(/[#*_>`]+/g, ' ')                   // markdown noise
          .replace(/^\s*[-•]\s*/gm, ' ')               // list bullets
          .replace(/\b(Meeting Purpose|Key Takeaways?|Next Steps?|Action Items?|Summary|Notes)\b\s*:?/gi, ' ')
          .replace(/[\[\]]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
        let oneLine = ''
        if (cleaned) {
          const sentence = cleaned.split(/(?<=[.!?])\s+/).find((s) => s.length > 20) || cleaned
          oneLine = sentence.length > 160 ? sentence.slice(0, 157).trim() + '…' : sentence
        }
        if (!oneLine && latestMeeting.title) oneLine = latestMeeting.title

        // Scan ALL transcripts for this person, but weight the latest convo most.
        const latestBlob = `${latestMeeting.summary ?? ''} ${latestMeeting.transcript ?? ''}`.toLowerCase()
        const historyBlob = sorted.slice(1).map((m) => `${m.summary ?? ''} ${m.transcript ?? ''}`).join(' ').toLowerCase()
        const negRe = /(frustrat|cancel|refund|angry|upset|disappoint|leaving|quit|unhappy|complain)/i
        const posRe = /(love|amazing|excited|referral|expand|upgrade|grateful|huge win|game.?changer|breakthrough)/i
        const latestNeg = negRe.test(latestBlob)
        const latestPos = posRe.test(latestBlob)
        const histNeg = negRe.test(historyBlob)
        const histPos = posRe.test(historyBlob)
        // Latest call drives the score; history nudges it.
        if (latestNeg) fathomScore = histPos ? 5 : 4
        else if (latestPos) fathomScore = histNeg ? 7 : 8
        else if (histNeg) fathomScore = 6
        else if (histPos) fathomScore = 7
        else fathomScore = 7
        const negative = latestNeg || histNeg

        const scanned = myMeetings.length
        if (oneLine) {
          signals.push({ label: `Fathom — Last call (${lastFathomDays}d ago): ${oneLine}`, severity: negative ? 'warn' : 'info' })
        } else {
          signals.push({ label: `Fathom — Last call ${lastFathomDays}d ago`, severity: 'info' })
        }
        signals.push({ label: `Fathom — Scanned ${scanned} transcript${scanned === 1 ? '' : 's'} for this client`, severity: 'info' })
      } else if (fathomMeetings.length > 0) {
        signals.push({ label: 'Fathom — No 1:1 coaching calls found for this client (last 2 years)', severity: 'warn' })
        fathomScore = 4
      } else {
        signals.push({ label: 'Fathom — No transcripts available yet', severity: 'info' })
      }

      // -------- Tenure / renewal window --------
      let renewalWindow = false
      if (daysToEnd <= 30) {
        renewalWindow = true
        tenureScore = 10
        signals.push({ label: `Renewal window: ${daysToEnd}d to program end`, severity: 'info' })
      } else if (daysToEnd <= 60) tenureScore = 8

      // -------- Weighted score --------
      const raw =
        (attendanceScore * 0.20) +
        (communityScore * 0.15) +
        (trustScore * 0.20) +
        (successionScore * 0.10) +
        (responseScore * 0.10) +
        (tenureScore * 0.10) +
        (fathomScore * 0.15)

      let score = Math.max(1, Math.min(10, Number(raw.toFixed(1))))
      if (score >= 7 && renewalWindow) score = Math.min(10, score + 1.5)
      // Framework override: meeting all 3 ascension criteria forces expansion_ready
      let status = classify(score)
      if (ascensionEligible) { status = 'expansion_ready'; score = Math.max(score, 9) }
      const arr_value = PROGRAM_ARR[programKey] ?? 0

      const linkedIds = ((p as any).linked_user_ids as string[] | null) ?? []

      results.push({
        user_id: p.id,
        full_name: fullName,
        email: p.email,
        program: programKey,
        score,
        status,
        signals,
        arr_value,
        last_active_at: lastCommunityAt ?? dms.data?.created_at ?? lastAttended?.joined_at ?? null,
        metrics: {
          last_community_days: lastCommunityDays,
          last_attended_days: lastAttendedDays,
          last_trust_days: trustDays,
          last_succession_days: succDays,
          last_dm_days: dmDays,
          last_fathom_days: lastFathomDays,
          fathom_meetings_found: myMeetings.length,
          drive_files_found: driveMatches.length,
          trust_completed_in_drive: trustCompletedInDrive ? 'yes' : 'no',
          ascension_eligible: ascensionEligible ? 'yes' : 'no',
          trusts_drafted: `${[hasFamily && 'family', hasBusiness && 'business', hasMinistry && 'ministry'].filter(Boolean).join(',') || 'none'}`,
          assets_funded_count: assetCount ?? 0,
          days_to_program_end: daysToEnd,
          tenure_days: tenureDays,
        },
        linked_users: linkedIds.map((id) => ({ user_id: id, full_name: '' })),
      })

      // Persist snapshot (one per day per user)
      const today = new Date().toISOString().slice(0, 10)
      const { data: existing } = await supabase
        .from('client_health_snapshots').select('id').eq('user_id', p.id)
        .gte('computed_at', `${today}T00:00:00Z`).limit(1).maybeSingle()
      if (existing) {
        await supabase.from('client_health_snapshots').update({
          score, status, signals, arr_value, program: programKey, computed_at: new Date().toISOString(),
        }).eq('id', existing.id)
      } else {
        await supabase.from('client_health_snapshots').insert({
          user_id: p.id, score, status, signals, arr_value, program: programKey,
        })
      }
    }

    // -------- Auto-draft retention messages for every client (parallel) --------
    const lovableKey = Deno.env.get('LOVABLE_API_KEY')
    if (lovableKey) {
      const PROMPTS: Record<string, string> = {
        at_risk: 'Client is at risk of churning. Write a short, warm, empathetic check-in (3-5 sentences). Acknowledge they have been quiet, ask how they are personally, offer a no-pressure 15-min call. Sign off "— Markus".',
        slipping: 'Client is slipping in engagement. Write a light re-engagement message (3-4 sentences) referencing a relevant program win they could pursue this week. Sign off "— Markus".',
        stable: `Client is doing well — send the TESTIMONIAL ASK from the Customer Feedback Framework. Use this voice and structure (personalize [Name] and [achievement]):\n\n"Hey [Name], congrats on [specific achievement]. We're going to keep helping you crush it, let us know what you need from our side. BTW, let us know if you're able to film a testimonial for us. It would be great to celebrate your success and this helps us out a lot."\n\nReturn only the text message body. Sign off "— Markus".`,
        expansion_ready: `Client has hit ASCENSION CRITERIA (Family Protection Plan done, all 3 trusts drafted — Family/Business/Ministry, assets moved into trusts). Per the Customer Feedback Framework, send the Graduation/Ascension Call invite right after their testimonial moment. Use Markus's voice and this exact tone:\n\n"[Name], this was incredible. Because of where you are right now we want to get you on a quick legacy evaluation call to review everything you've built, make sure everything is locked in correctly, map out what's next for your family, and celebrate everything you've built. Depending on where you are we can do this in person or virtually — which works best for you?"\n\nIf they are TFBA → invite to Graduation Call (next step: Succession Society $22k / 6mo or $4k/mo). If TFV → invite to Accelerator strategy call. If TFFM Succession Society → soft-seed a Founding Families nomination conversation WITHOUT naming Founding Families. Keep it 3-5 sentences. Sign off "— Markus".`,
      }
      const systemPrompt = `You are Markus's retention assistant for Fampreneurs/TruHeirs. Write personal, brief outreach in his voice — warm, direct, no fluff, no exclamation marks unless celebrating. Avoid corporate language. Follow the Customer Feedback Framework scripts when provided.`

      await Promise.all(results.map(async (r) => {
        try {
          const signalsText = r.signals.map((s) => `- ${s.label}`).join('\n') || '- (none)'
          const metricsText = Object.entries(r.metrics).map(([k, v]) => `- ${k}: ${v ?? 'no data'}`).join('\n')
          const userPrompt = `${PROMPTS[r.status]}\n\nClient: ${r.full_name}\nProgram: ${r.program ?? 'unknown'}\nHealth score: ${r.score}/10\nSignals:\n${signalsText}\nMetrics:\n${metricsText}\n\nReturn only the message body — no subject line, no headers.`
          const resp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
            method: 'POST',
            headers: { 'Lovable-API-Key': lovableKey, 'Content-Type': 'application/json', 'X-Lovable-AIG-SDK': 'manual' },
            body: JSON.stringify({
              model: 'google/gemini-3-flash-preview',
              messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
            }),
          })
          if (resp.ok) {
            const data = await resp.json()
            ;(r as any).draft = data?.choices?.[0]?.message?.content ?? ''
          } else {
            ;(r as any).draft = ''
          }
        } catch (e) {
          console.error('auto-draft error', r.user_id, e)
          ;(r as any).draft = ''
        }
      }))
    }

    const payload = {
      clients: results,
      computed_at: new Date().toISOString(),
      sources: { drive_files: driveTree.length, fathom_meetings: fathomMeetings.length, fathom_complete: fathomResult.complete, fathom_rate_limited: fathomResult.rateLimited },
    }

    // Persist full payload for instant loads on the Client Retention page
    try {
      await supabase.from('platform_settings').upsert(
        [{ setting_key: 'client_retention_cache', setting_value: JSON.stringify(payload), description: 'Cached client retention payload for instant page loads' }],
        { onConflict: 'setting_key' }
      )
    } catch (e) {
      console.error('cache persist error', e)
    }

    return new Response(JSON.stringify(payload), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (e) {
    console.error('compute-client-health error', e)
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
