import { Webhook } from 'npm:standardwebhooks@1'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'

const projectId = '27136ee7-1259-4a9a-9864-1109582fab4d'
const reply = (status: number, body: Record<string, unknown>) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return reply(405, { error: 'POST required' })
  const secret = Deno.env.get('LOVABLE_EVENTS_SIGNING_SECRET')
  if (!secret) return reply(503, { error: 'Connect the publish signing secret first' })
  const raw = await req.text()
  if (raw.length > 100_000) return reply(413, { error: 'Delivery too large' })
  let event: Record<string, unknown>
  try {
    event = new Webhook(secret).verify(raw, Object.fromEntries(req.headers)) as Record<string, unknown>
  } catch {
    return reply(401, { error: 'Invalid delivery signature' })
  }
  // Fail closed until the signed event has the expected type and project.
  const data = event.data && typeof event.data === 'object' ? event.data as Record<string, unknown> : {}
  const project = data.project && typeof data.project === 'object' ? data.project as Record<string, unknown> : {}
  const type = event.type ?? event.event_type
  const id = data.project_id ?? project.id ?? event.project_id
  if (type !== 'project.published.v1' || id !== projectId) return reply(200, { ignored: true })
  const eventId = req.headers.get('webhook-id')
  if (!eventId || eventId.length > 200) return reply(400, { error: 'Delivery ID required' })
  try {
    const client = createClient(Deno.env.get('SUPABASE_URL') || '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '')
    const { data: count, error } = await client.rpc('notify_software_update', { p_event_id: eventId })
    if (error) throw error
    return reply(200, { notified: count })
  } catch {
    return reply(500, { error: 'Update alerts could not be saved' })
  }
})