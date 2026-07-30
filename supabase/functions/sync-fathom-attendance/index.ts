import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface Invitee { name: string; email: string }
interface Meeting {
  id: string
  title: string
  date: string
  invitees: Invitee[]
  speakerNames: string[]
  speakerEmails: string[]
  durationMinutes: number | null
  host: string
}

interface FathomResponse {
  json: any | null
  status: number
  body: string
}

function normalizeName(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

async function fathomJson(url: URL, key: string): Promise<FathomResponse> {
  let lastStatus = 0
  let lastBody = ''
  for (let attempt = 0; attempt < 3; attempt++) {
    let res: Response | null = null
    try {
      res = await fetch(url.toString(), { headers: { 'X-Api-Key': key, Accept: 'application/json' } })
    } catch (_e) { /* retry */ }
    if (res?.ok) {
      return { json: await res.json().catch(() => null), status: res.status, body: '' }
    }
    const status = res?.status ?? 0
    lastStatus = status
    lastBody = res ? await res.text().catch(() => '') : ''
    if (![0, 429, 500, 502, 503, 504].includes(status)) {
      console.error('fathom list error', status, lastBody)
      return { json: null, status, body: lastBody }
    }
    await new Promise((r) => setTimeout(r, 500 * Math.pow(2, attempt)))
  }
  console.error('fathom list failed after retries', lastStatus, lastBody)
  return { json: null, status: lastStatus, body: lastBody }
}

// An "accountability call" is a coaching / accountability session — not a sales call.
const ACCOUNTABILITY_HINTS = ['accountability', 'coaching', '1-1', '1:1', 'one on one', 'check-in', 'check in']
const SALES_HINTS = ['sales', 'discovery', 'intro call', 'strategy session', 'onboarding call', 'consult']

function isAccountabilityCall(title: string, transcript: string): boolean {
  const t = title.toLowerCase()
  if (SALES_HINTS.some((h) => t.includes(h))) return false
  const tr = transcript.toLowerCase()
  // Sales meetings talk about booking calls / signing up — exclude those.
  const salesTalk = ['book a call', 'booking a call', 'get you booked', 'schedule a call with', 'the investment is', 'payment plan today']
  if (salesTalk.some((p) => tr.includes(p))) return false
  // Title hints are a strong yes; otherwise fall back to "not a sales call"
  // so real coaching calls with generic titles still get logged.
  return true
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Auth: admins / owners only
    const token = req.headers.get('Authorization')?.replace('Bearer ', '') ?? ''
    const { data: userData } = await supabase.auth.getUser(token)
    const caller = userData?.user
    if (!caller) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
    const { data: roles } = await supabase.from('user_roles').select('role').eq('user_id', caller.id)
    const allowed = (roles ?? []).some((r: any) => r.role === 'admin' || r.role === 'owner')
    if (!allowed) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const key = Deno.env.get('FATHOM_API_KEY')
    if (!key) {
      return new Response(JSON.stringify({ error: 'FATHOM_API_KEY is not configured' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const body = await req.json().catch(() => ({}))
    const days = Math.min(Math.max(Number(body?.days ?? 365), 1), 365)
    const since = new Date(Date.now() - days * 86400000).toISOString()
    const deadline = Date.now() + 110000

    // 1) Pull meetings
    const meetings: Meeting[] = []
    const skippedTitles: string[] = []
    let totalFetched = 0
    let cursor: string | undefined
    let pages = 0
    do {
      const url = new URL('https://api.fathom.ai/external/v1/meetings')
      url.searchParams.set('calendar_invitees_domains_type', 'all')
      url.searchParams.set('limit', '100')
      if (cursor) url.searchParams.set('cursor', cursor)
      let response = await fathomJson(url, key)
      // Some Fathom accounts reject the optional invitee-domain filter. Retry
      // the first page with only the documented date and pagination fields.
      if (!response.json && pages === 0 && response.status >= 400 && response.status < 500 && response.status !== 429) {
        url.searchParams.delete('calendar_invitees_domains_type')
        response = await fathomJson(url, key)
      }
      const json = response.json
      if (!json) {
        return new Response(
          JSON.stringify({ error: 'Fathom could not return meetings', status: response.status, detail: response.body.slice(0, 300) }),
          { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
      }
      const pageItems = json.items ?? json.meetings ?? json.data ?? []
      for (const m of pageItems) {
        totalFetched++
        const title = `${m.meeting_title ?? ''} ${m.title ?? ''}`.trim()
        const inviteeArr = Array.isArray(m.calendar_invitees) ? m.calendar_invitees : []
        const transcriptArr = Array.isArray(m.transcript) ? m.transcript : []
        const speakerNames = new Set<string>()
        const speakerEmails = new Set<string>()
        let transcriptText = ''
        for (const t of transcriptArr) {
          const sp = t?.speaker?.display_name
          const em = t?.speaker?.matched_calendar_invitee_email
          if (sp) speakerNames.add(String(sp))
          if (em) speakerEmails.add(String(em).toLowerCase())
          if (transcriptText.length < 20000) transcriptText += ` ${t?.text ?? ''}`
        }
        const start = m.recording_start_time ?? m.scheduled_start_time ?? m.created_at
        const end = m.recording_end_time ?? m.scheduled_end_time
        if (start && new Date(start).getTime() < new Date(since).getTime()) continue
        const durationMinutes = start && end ? Math.max(1, Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000)) : null
        if (!isAccountabilityCall(title, transcriptText)) {
          if (skippedTitles.length < 25) skippedTitles.push(title || '(untitled)')
          continue
        }
        meetings.push({
          id: String(m.recording_id ?? m.id ?? ''),
          title: title || 'Accountability Call',
          date: (start ?? new Date().toISOString()).slice(0, 10),
          invitees: inviteeArr.map((i: any) => ({ name: String(i?.name ?? ''), email: String(i?.email ?? '').toLowerCase() })),
          speakerNames: Array.from(speakerNames),
          speakerEmails: Array.from(speakerEmails),
          durationMinutes,
          host: String(m.recorded_by?.name ?? m.host?.name ?? ''),
        })
      }
      cursor = json.next_cursor ?? undefined
      pages++
    } while (cursor && pages < 40 && Date.now() < deadline)

    // 2) Load members
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, email, first_name, last_name, display_name')
      .limit(5000)

    const byEmail = new Map<string, any>()
    const byName = new Map<string, any>()
    const profilesByName: Array<{ profile: any; normalizedName: string }> = []
    for (const p of profiles ?? []) {
      if (p.email) byEmail.set(String(p.email).toLowerCase(), p)
      const full = (p.display_name || `${p.first_name ?? ''} ${p.last_name ?? ''}`).trim().toLowerCase()
      if (full) {
        byName.set(full, p)
        const normalizedName = normalizeName(full)
        // Require at least a first and last name so common single words cannot
        // accidentally attach a recording to the wrong member.
        if (normalizedName.split(' ').length >= 2 && normalizedName.length >= 6) {
          profilesByName.push({ profile: p, normalizedName })
        }
      }
    }

    // 2b) Coaches / admins are excluded from attendance — only clients get logged
    const { data: coachRows } = await supabase.from('coaches').select('full_name, email')
    const { data: staffRoles } = await supabase.from('user_roles').select('user_id').in('role', ['admin', 'owner'])
    const coachEmails = new Set<string>()
    const coachNames = new Set<string>()
    const staffUserIds = new Set<string>((staffRoles ?? []).map((r: any) => r.user_id))
    for (const c of coachRows ?? []) {
      if (c.email) coachEmails.add(String(c.email).toLowerCase())
      if (c.full_name) coachNames.add(String(c.full_name).trim().toLowerCase())
      const p = c.email ? byEmail.get(String(c.email).toLowerCase()) : null
      if (p) staffUserIds.add(p.user_id)
      const pn = c.full_name ? byName.get(String(c.full_name).trim().toLowerCase()) : null
      if (pn) staffUserIds.add(pn.user_id)
    }
    const isStaff = (userId: string, email?: string, name?: string) =>
      staffUserIds.has(userId) ||
      (email ? coachEmails.has(email.toLowerCase()) : false) ||
      (name ? coachNames.has(name.trim().toLowerCase()) : false)

    // 3) Build attendance rows
    const rows: any[] = []
    const seen = new Set<string>()
    const unmatched: string[] = []
    for (const m of meetings) {
      const matched = new Map<string, any>()
      const add = (p: any, email?: string, name?: string) => {
        if (!p) return
        if (isStaff(p.user_id, email ?? p.email, name)) return
        matched.set(p.user_id, p)
      }
      for (const inv of m.invitees) {
        if (isStaff('', inv.email, inv.name)) continue
        const p = inv.email ? byEmail.get(inv.email) : null
        const p2 = p ?? (inv.name ? byName.get(inv.name.trim().toLowerCase()) : null)
        add(p2, inv.email, inv.name)
      }
      for (const em of m.speakerEmails) {
        add(byEmail.get(em), em)
      }
      for (const nm of m.speakerNames) {
        add(byName.get(nm.trim().toLowerCase()), undefined, nm)
      }
      // Fathom's meeting-list endpoint often returns only the recorder's email,
      // while the client's full name remains in the accountability call title.
      // Match that exact normalized full name so those historical calls can be
      // backfilled without assigning one client's call to another member.
      const normalizedTitle = ` ${normalizeName(m.title)} `
      for (const candidate of profilesByName) {
        if (normalizedTitle.includes(` ${candidate.normalizedName} `)) {
          add(candidate.profile, candidate.profile.email, candidate.normalizedName)
        }
      }
      if (matched.size === 0 && unmatched.length < 25) {
        unmatched.push(`${m.title}: ${[...m.invitees.map((i) => i.email || i.name), ...m.speakerNames].join(', ')}`)
      }
      for (const [userId] of matched) {
        const ref = `fathom:${m.id}`
        const dedupe = `${userId}|${ref}`
        if (seen.has(dedupe)) continue
        seen.add(dedupe)
        rows.push({
          user_id: userId,
          session_id: null,
          session_type: matched.size <= 1 ? 'individual' : 'group',
          attended: true,
          attendance_duration_minutes: m.durationMinutes,
          manual_session_title: m.title,
          manual_coach_name: m.host || null,
          manual_session_date: m.date,
          source: 'fathom',
          external_ref: ref,
          notes: 'Auto-logged from Fathom accountability call',
        })
      }
    }


    let inserted = 0
    if (rows.length) {
      const { data, error } = await supabase
        .from('session_attendance')
        .upsert(rows, { onConflict: 'user_id,external_ref', ignoreDuplicates: true })
        .select('id')
      if (error) throw error
      inserted = data?.length ?? 0
    }

    console.log('fathom sync', { totalFetched, kept: meetings.length, rows: rows.length, inserted, skippedTitles, unmatched })
    return new Response(
      JSON.stringify({
        success: true,
        total_fetched: totalFetched,
        meetings_scanned: meetings.length,
        rows_considered: rows.length,
        inserted,
        skipped_titles: skippedTitles,
        unmatched_participants: unmatched,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (e: any) {
    console.error('sync-fathom-attendance failed', e)
    return new Response(JSON.stringify({ error: e?.message ?? String(e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
