import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'

interface Body {
  client_name: string
  status: 'at_risk' | 'slipping' | 'stable' | 'expansion_ready' | 'continuity'
  signals: { label: string }[]
  program?: string
  program_name?: string | null
  score?: number
  contract_start_date?: string | null
  contract_due_date?: string | null
  contract_extension_date?: string | null
  last_active_at?: string | null
  notes?: string[]
}

const PROMPTS: Record<string, string> = {
  at_risk: 'The client is at risk of churning. Write a very short, warm SMS-style check-in (1-2 sentences, max ~40 words). Acknowledge they\'ve been quiet and offer a no-pressure 15-min call. No fluff.',
  slipping: 'The client is slipping in engagement. Write a very short SMS-style re-engagement message (1-2 sentences, max ~40 words). Reference one relevant next step this week. No fluff.',
  stable: 'The client is doing well. Write a very short SMS-style message (1-2 sentences, max ~40 words). Acknowledge their wins and ask if they know a family we should be talking to. No fluff.',
  expansion_ready: 'The client is ready for an upsell to the next program tier (TTV→PEA→Succession Society→TFFM). Write a very short SMS-style invitation (1-2 sentences, max ~40 words) to a strategy call. No fluff.',
  continuity: 'The client is not upgrading but should continue or renew. Write a very short SMS-style renewal message (1-2 sentences, max ~40 words) focused on keeping momentum. No fluff.',
}

function daysBetween(a: Date, b: Date) {
  return Math.round((a.getTime() - b.getTime()) / 86400000)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const key = Deno.env.get('LOVABLE_API_KEY')
    if (!key) return new Response(JSON.stringify({ error: 'Missing LOVABLE_API_KEY' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    const body: Body = await req.json()
    const now = new Date()
    const signalsText = (body.signals ?? []).map(s => `- ${s.label}`).join('\n') || '- (none)'

    // Contract window: extension wins over the original due date.
    const endRaw = body.contract_extension_date || body.contract_due_date || null
    const end = endRaw ? new Date(endRaw) : null
    let contractLine = 'Contract window: unknown — do NOT mention deadlines, windows, renewals dates or "before your window closes".'
    if (end && !isNaN(end.getTime())) {
      const daysLeft = daysBetween(end, now)
      if (daysLeft < 0) {
        contractLine = `Contract window: EXPIRED ${Math.abs(daysLeft)} days ago (ended ${endRaw}). Their access window is already closed. NEVER imply it is still open, never say "before your window closes" or "while you still have time". Speak about re-activating, renewing, or picking things back up.`
      } else if (daysLeft <= 45) {
        contractLine = `Contract window: closing in ${daysLeft} days (ends ${endRaw}). It is fine to reference the time remaining accurately.`
      } else {
        contractLine = `Contract window: open, ${daysLeft} days remaining (ends ${endRaw}). Do not create false urgency about it closing.`
      }
    }

    let activityLine = 'Last activity: unknown — do not guess or claim recent participation.'
    if (body.last_active_at) {
      const la = new Date(body.last_active_at)
      if (!isNaN(la.getTime())) {
        const d = daysBetween(now, la)
        activityLine = d <= 7
          ? `Last activity: ${d} days ago — they are currently active.`
          : `Last activity: ${d} days ago — do NOT say things like "great to see you on the calls" unless that is recent.`
      }
    }

    const startLine = body.contract_start_date ? `Started with us: ${body.contract_start_date} (${daysBetween(now, new Date(body.contract_start_date))} days ago).` : 'Start date: unknown.'
    const notesLine = (body.notes ?? []).length
      ? `Recent private notes about this client (treat as facts, never quote them directly):\n${(body.notes ?? []).map(n => `- ${n}`).join('\n')}`
      : 'Recent private notes: none.'

    const systemPrompt = `You are Markus's retention assistant at TruHeirs. Write personal, brief outreach in his voice — warm, direct, no fluff, no corporate language.
HARD RULES:
- Never state a fact that is not supported by the client data below. No invented calls, wins, dates, deadlines or milestones.
- Respect the contract window exactly as given. If it is expired, never imply it is still open.
- Never contradict the private notes (unpaid balances, no-shows, silence, disputes).
- Sign off "— The Fampreneurs Team".`

    const userPrompt = `${PROMPTS[body.status] ?? PROMPTS.slipping}

Client: ${body.client_name}
Program: ${body.program_name || body.program || 'unknown'}
Health score: ${body.score ?? 'unknown'}/10 (${body.status})
${startLine}
${contractLine}
${activityLine}
Signals detected:
${signalsText}
${notesLine}

Return only the message body — no subject line, no headers.`

    const resp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Lovable-API-Key': key,
        'Content-Type': 'application/json',
        'X-Lovable-AIG-SDK': 'manual',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      }),
    })

    if (!resp.ok) {
      const text = await resp.text()
      return new Response(JSON.stringify({ error: `AI gateway ${resp.status}: ${text}` }), {
        status: resp.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const data = await resp.json()
    const draft = data?.choices?.[0]?.message?.content ?? ''

    return new Response(JSON.stringify({ draft }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
