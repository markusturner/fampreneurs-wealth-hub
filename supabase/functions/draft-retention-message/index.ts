import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'

interface Body {
  client_name: string
  status: 'at_risk' | 'slipping' | 'stable' | 'expansion_ready'
  signals: { label: string }[]
  program?: string
}

const PROMPTS: Record<Body['status'], string> = {
  at_risk: 'The client is at risk of churning. Write a short, warm, empathetic check-in (3-5 sentences). Acknowledge they\'ve been quiet, ask how they\'re doing personally, offer a no-pressure 15-min call. Sign off "— Markus".',
  slipping: 'The client is slipping in engagement. Write a light re-engagement message (3-4 sentences) referencing a relevant program win they could pursue this week. Sign off "— Markus".',
  stable: 'The client is doing well. Write a friendly testimonial/referral ask (3-4 sentences). Acknowledge their wins and ask if they know a family we should be talking to. Sign off "— Markus".',
  expansion_ready: 'The client is ready for an upsell to the next program tier (TFV→TFBA→TFFM Succession Society). Write an upbeat invitation (3-4 sentences) to a strategy call to discuss the next step. Sign off "— Markus".',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const key = Deno.env.get('LOVABLE_API_KEY')
    if (!key) return new Response(JSON.stringify({ error: 'Missing LOVABLE_API_KEY' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    const body: Body = await req.json()
    const signalsText = (body.signals ?? []).map(s => `- ${s.label}`).join('\n') || '- (none)'

    const systemPrompt = `You are Markus's retention assistant. Write personal, brief outreach in his voice — warm, direct, no fluff, no exclamation marks unless celebrating. Avoid corporate language.`
    const userPrompt = `${PROMPTS[body.status]}\n\nClient: ${body.client_name}\nProgram: ${body.program ?? 'unknown'}\nSignals detected:\n${signalsText}\n\nReturn only the message body — no subject line, no headers.`

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
