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

// ---------- Fathom: recent meetings + transcripts ----------
async function listFathomMeetings(): Promise<{ id: string; title: string; created_at: string; transcript?: string; summary?: string }[]> {
  const key = Deno.env.get('FATHOM_API_KEY')
  if (!key) return []
  try {
    const since = new Date(Date.now() - 180 * 86400000).toISOString()
    const url = `https://api.fathom.ai/external/v1/meetings?created_after=${encodeURIComponent(since)}&include=transcript,summary&limit=200`
    const res = await fetch(url, { headers: { 'X-Api-Key': key, 'Accept': 'application/json' } })
    if (!res.ok) { console.error('fathom err', res.status, await res.text()); return [] }
    const json = await res.json()
    const items = json?.items ?? json?.meetings ?? json?.data ?? []
    return items.map((m: any) => ({
      id: String(m.id ?? m.uuid ?? ''),
      title: m.title ?? m.name ?? '',
      created_at: m.created_at ?? m.scheduled_start_time ?? m.start_time ?? new Date().toISOString(),
      transcript: typeof m.transcript === 'string' ? m.transcript : m.transcript?.text ?? '',
      summary: typeof m.summary === 'string' ? m.summary : m.summary?.text ?? '',
    }))
  } catch (e) {
    console.error('fathom fetch failed', e)
    return []
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
      .select('id, first_name, last_name, display_name, email, program_name, created_at, needs_profile_completion, membership_type')
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
    const [driveToken, fathomMeetings] = await Promise.all([
      getGoogleAccessToken(),
      listFathomMeetings(),
    ])
    const driveTree = driveToken ? await listDriveTree(driveToken) : []
    console.log(`drive files: ${driveTree.length}, fathom meetings: ${fathomMeetings.length}`)

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

      // -------- Attendance --------
      const { data: lastAttended } = await supabase
        .from('session_attendance')
        .select('joined_at').eq('user_id', p.id).order('joined_at', { ascending: false }).limit(1).maybeSingle()
      const lastAttendedDays = daysSince(lastAttended?.joined_at)
      if (lastAttendedDays === null) {
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

      const driveMatches = driveTree.filter((f) => nameMatches(f.name, fullName))
      const trustCompletedInDrive = driveMatches.some((f) =>
        /complete|final|signed|executed|done/i.test(f.name) ||
        (f.mimeType === 'application/vnd.google-apps.folder' && driveMatches.length >= 2)
      )

      if (trustCompletedInDrive) {
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
      const myMeetings = fathomMeetings.filter((m) =>
        nameMatches(`${m.title}\n${m.transcript ?? ''}\n${m.summary ?? ''}`, fullName)
      )
      let lastFathomDays: number | null = null
      if (myMeetings.length > 0) {
        const latest = myMeetings.map((m) => new Date(m.created_at).getTime()).sort().reverse()[0]
        lastFathomDays = Math.floor((Date.now() - latest) / 86400000)
        const blob = myMeetings.map((m) => `${m.summary ?? ''} ${m.transcript ?? ''}`).join(' ').toLowerCase()
        const negative = /(frustrat|cancel|refund|angry|upset|confus|disappoint|leaving|quit|unhappy|not working|complain)/i.test(blob)
        const positive = /(love|amazing|excited|referral|expand|upgrade|grateful|huge win|game.?changer|breakthrough)/i.test(blob)
        if (negative) { fathomScore = 3; signals.push({ label: `Fathom: negative sentiment in recent call`, severity: 'critical' }) }
        else if (positive) { fathomScore = 9; signals.push({ label: `Fathom: positive sentiment — expansion candidate`, severity: 'info' }) }
        else fathomScore = 7
        if (lastFathomDays > 30) signals.push({ label: `Last call ${lastFathomDays}d ago`, severity: 'warn' })
      } else if (fathomMeetings.length > 0) {
        signals.push({ label: 'No recent calls found in Fathom', severity: 'warn' })
        fathomScore = 4
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
      const status = classify(score)
      const arr_value = PROGRAM_ARR[programKey] ?? 0

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
          days_to_program_end: daysToEnd,
          tenure_days: tenureDays,
        },
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

    return new Response(JSON.stringify({
      clients: results,
      computed_at: new Date().toISOString(),
      sources: { drive_files: driveTree.length, fathom_meetings: fathomMeetings.length },
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (e) {
    console.error('compute-client-health error', e)
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
