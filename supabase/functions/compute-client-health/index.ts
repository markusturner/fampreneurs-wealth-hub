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
}

const PROGRAM_DURATION_DAYS: Record<string, number> = {
  tfv: 180,   // 6 months
  tfba: 90,   // 3 months
  tffm: 365,  // 12 months
}

const PROGRAM_ARR: Record<string, number> = {
  tfv: 5000,
  tfba: 9000,
  tffm: 40000,
}

function daysBetween(date: string | null | undefined, now = Date.now()): number {
  if (!date) return 9999
  return Math.floor((now - new Date(date).getTime()) / 86400000)
}

function classify(score: number): ClientScore['status'] {
  if (score < 4) return 'at_risk'
  if (score < 6.5) return 'slipping'
  if (score < 8.5) return 'stable'
  return 'expansion_ready'
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Fetch all active non-Lite, non-FBU-only clients (exclude invited/incomplete profiles)
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, display_name, email, program_name, created_at, needs_profile_completion, membership_type')
      .not('program_name', 'is', null)

    const clients = (profiles ?? []).filter((p) => {
      const prog = (p.program_name || '').toLowerCase()
      if (!prog || prog === 'fbu' || prog === 'truheirs-lite' || prog === 'lite') return false
      // Exclude invited users who haven't completed signup
      if (p.needs_profile_completion === true) return false
      if ((p.first_name || '').toLowerCase() === 'invited') return false
      if (p.membership_type === 'family_member') return false
      return true
    })

    const results: ClientScore[] = []

    for (const p of clients) {
      const prog = (p.program_name || '').toLowerCase()
      const programKey = prog.includes('tffm') || prog.includes('succession')
        ? 'tffm'
        : prog.includes('tfba') || prog.includes('accelerator')
        ? 'tfba'
        : prog.includes('tfv') || prog.includes('vault')
        ? 'tfv'
        : 'tfv'

      const tenureDays = daysBetween(p.created_at)
      const programLen = PROGRAM_DURATION_DAYS[programKey] ?? 180
      const daysIntoProgram = Math.min(tenureDays, programLen)
      const daysToEnd = programLen - daysIntoProgram

      const signals: Signal[] = []
      let attendanceScore = 10
      let communityScore = 10
      let trustScore = 10
      let successionScore = 10
      let responseScore = 10
      let tenureScore = 10

      // Community engagement
      const { data: lastPost } = await supabase
        .from('community_posts')
        .select('created_at')
        .eq('user_id', p.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      const lastPostDays = daysBetween(lastPost?.created_at)
      if (lastPostDays > 21) { communityScore = 2; signals.push({ label: `No community activity in ${lastPostDays}d`, severity: 'critical' }) }
      else if (lastPostDays > 10) { communityScore = 5; signals.push({ label: `Posting cadence dropped (${lastPostDays}d)`, severity: 'warn' }) }
      else if (lastPostDays > 4) { communityScore = 7 }

      // Attendance — last meeting attended
      const { data: lastAttended } = await supabase
        .from('session_attendance')
        .select('joined_at')
        .eq('user_id', p.id)
        .order('joined_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      const lastAttendedDays = daysBetween(lastAttended?.joined_at)
      if (lastAttendedDays > 30) { attendanceScore = 2; signals.push({ label: `Missed coaching calls (${lastAttendedDays}d)`, severity: 'critical' }) }
      else if (lastAttendedDays > 14) { attendanceScore = 5; signals.push({ label: `1–2 missed sessions`, severity: 'warn' }) }
      else if (lastAttendedDays > 7) { attendanceScore = 7 }

      // Trust progress
      const { data: lastTrust } = await supabase
        .from('trust_submissions')
        .select('updated_at, status')
        .eq('user_id', p.id)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      const trustDays = daysBetween(lastTrust?.updated_at)
      if (trustDays > 14) { trustScore = 3; signals.push({ label: `Trust progress stalled ${trustDays}d`, severity: 'critical' }) }
      else if (trustDays > 7) { trustScore = 6; signals.push({ label: `Trust step stuck ${trustDays}d`, severity: 'warn' }) }

      // Succession progress
      const { data: lastSucc } = await supabase
        .from('succession_progress')
        .select('updated_at')
        .eq('user_id', p.id)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      const succDays = daysBetween(lastSucc?.updated_at)
      if (succDays > 21) { successionScore = 4; signals.push({ label: `Succession plan idle ${succDays}d`, severity: 'warn' }) }

      // Response time — last DM sent
      const { data: lastDm } = await supabase
        .from('direct_messages')
        .select('created_at')
        .eq('sender_id', p.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      const dmDays = daysBetween(lastDm?.created_at)
      if (dmDays > 18) { responseScore = 4; signals.push({ label: `No DM activity ${dmDays}d`, severity: 'warn' }) }

      // Tenure / renewal proximity (boosts expansion)
      let renewalWindow = false
      if (daysToEnd <= 30 && daysToEnd >= 0) {
        renewalWindow = true
        tenureScore = 10
        signals.push({ label: `Renewal window: ${daysToEnd}d to program end`, severity: 'info' })
      }

      // Weighted (using default weights — 25/20/20/15/10/10)
      const raw =
        (attendanceScore * 0.25) +
        (communityScore * 0.20) +
        (trustScore * 0.20) +
        (successionScore * 0.15) +
        (responseScore * 0.10) +
        (tenureScore * 0.10)

      let score = Math.max(1, Math.min(10, Number(raw.toFixed(1))))

      // Expansion boost: if scores are healthy AND in renewal window
      if (score >= 7 && renewalWindow) score = Math.min(10, score + 1.5)

      const status = classify(score)
      const arr_value = PROGRAM_ARR[programKey] ?? 0

      const fullName = [p.first_name, p.last_name].filter(Boolean).join(' ') || p.display_name || p.email

      results.push({
        user_id: p.id,
        full_name: fullName,
        email: p.email,
        program: programKey,
        score,
        status,
        signals,
        arr_value,
        last_active_at: lastPost?.created_at ?? lastDm?.created_at ?? lastAttended?.joined_at ?? null,
      })

      // Persist snapshot (one per day per user)
      const today = new Date().toISOString().slice(0, 10)
      const { data: existing } = await supabase
        .from('client_health_snapshots')
        .select('id')
        .eq('user_id', p.id)
        .gte('computed_at', `${today}T00:00:00Z`)
        .limit(1)
        .maybeSingle()

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

    return new Response(JSON.stringify({ clients: results, computed_at: new Date().toISOString() }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    console.error('compute-client-health error', e)
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
