import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { createClient } from 'npm:@supabase/supabase-js@2'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Check autopilot flag
    const { data: setting } = await supabase
      .from('platform_settings')
      .select('setting_value')
      .eq('setting_key', 'client_retention_autopilot')
      .maybeSingle()

    const enabled = setting?.setting_value === true || setting?.setting_value === 'true' ||
      (typeof setting?.setting_value === 'object' && (setting?.setting_value as any)?.enabled === true)

    // Allow ?force=1 to bypass for manual runs
    const url = new URL(req.url)
    const force = url.searchParams.get('force') === '1'
    if (!enabled && !force) {
      return new Response(JSON.stringify({ skipped: true, reason: 'autopilot_off' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Find the admin/owner who will be marked as sender (first owner)
    const { data: ownerRole } = await supabase
      .from('user_roles')
      .select('user_id')
      .in('role', ['owner', 'admin'])
      .limit(1)
      .maybeSingle()
    const senderId = ownerRole?.user_id ?? null

    // Pull current health
    const healthResp = await supabase.functions.invoke('compute-client-health', { body: {} })
    const clients: any[] = healthResp.data?.clients ?? []
    const targets = clients.filter((c) => c.status === 'at_risk' || c.status === 'slipping')

    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString()
    const sent: string[] = []
    const skipped: string[] = []

    for (const c of targets) {
      // Skip if a retention_message was sent to this client in last 7 days
      const { data: recent } = await supabase
        .from('retention_messages')
        .select('id')
        .eq('client_id', c.user_id)
        .gte('sent_at', sevenDaysAgo)
        .limit(1)
        .maybeSingle()

      if (recent) { skipped.push(c.user_id); continue }

      // Draft message
      const draftResp = await supabase.functions.invoke('draft-retention-message', {
        body: {
          client_name: c.full_name,
          status: c.status,
          signals: c.signals,
          program: c.program,
        },
      })
      const draft = draftResp.data?.draft as string | undefined
      if (!draft) { skipped.push(c.user_id); continue }

      await supabase.from('retention_messages').insert({
        client_id: c.user_id,
        status: c.status,
        channel: 'inapp',
        draft,
        sent_at: new Date().toISOString(),
        sent_by: senderId,
      })

      if (senderId) {
        await supabase.from('messages').insert({
          sender_id: senderId,
          recipient_id: c.user_id,
          content: draft,
        })
      }

      sent.push(c.user_id)
    }

    return new Response(JSON.stringify({ sent: sent.length, skipped: skipped.length, ran_at: new Date().toISOString() }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    console.error('autopilot-send-retention error', e)
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
