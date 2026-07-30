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

async function fathomJson(url: URL, key: string) {
  for (let attempt = 0; attempt < 3; attempt++) {
    let res: Response | null = null
    try {
      res = await fetch(url.toString(), { headers: { 'X-Api-Key': key, Accept: 'application/json' } })
    } catch (_e) { /* retry */ }
    if (res?.ok) return await res.json().catch(() => null)
    const status = res?.status ?? 0
    if (![0, 429, 500, 502, 503, 504].includes(status)) {
      console.error('fathom error', status, res ? await res.text().catch(() => '') : '')
      return null
    }
    await new Promise((r) => setTimeout(r, 500 * Math.pow(2, attempt)))
  }
  return null
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
    let cursor: string | undefined
    let pages = 0
    do {
      const url = new URL('https://api.fathom.ai/external/v1/meetings')
      url.searchParams.set('created_after', since)
      url.searchParams.set('calendar_invitees_domains_type', 'all')
      url.searchParams.set('include_transcript', 'true')
      url.searchParams.set('limit', '50')
      if (cursor) url.searchParams.set('cursor', cursor)
      const json = await fathomJson(url, key)
      if (!json) break
      for (const m of json.items ?? []) {
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
        const durationMinutes = start && end ? Math.max(1, Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000)) : null
        if (!isAccountabilityCall(title, transcriptText)) continue
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
    for (const p of profiles ?? []) {
      if (p.email) byEmail.set(String(p.email).toLowerCase(), p)
      const full = (p.display_name || `${p.first_name ?? ''} ${p.last_name ?? ''}`).trim().toLowerCase()
      if (full) byName.set(full, p)
    }

    // 3) Build attendance rows
    const rows: any[] = []
    const seen = new Set<string>()
    for (const m of meetings) {
      const matched = new Map<string, any>()
      for (const inv of m.invitees) {
        const p = inv.email ? byEmail.get(inv.email) : null
        const p2 = p ?? (inv.name ? byName.get(inv.name.trim().toLowerCase()) : null)
        if (p2) matched.set(p2.user_id, p2)
      }
      for (const em of m.speakerEmails) {
        const p = byEmail.get(em)
        if (p) matched.set(p.user_id, p)
      }
      for (const nm of m.speakerNames) {
        const p = byName.get(nm.trim().toLowerCase())
        if (p) matched.set(p.user_id, p)
      }
      for (const [userId] of matched) {
        const ref = `fathom:${m.id}`
        const dedupe = `${userId}|${ref}`
        if (seen.has(dedupe)) continue
        seen.add(dedupe)
        rows.push({
          user_id: userId,
          session_id: null,
          session_type: matched.size <= 2 ? 'individual' : 'group',
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

    return new Response(
      JSON.stringify({ success: true, meetings_scanned: meetings.length, rows_considered: rows.length, inserted }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (e: any) {
    console.error('sync-fathom-attendance failed', e)
    return new Response(JSON.stringify({ error: e?.message ?? String(e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
