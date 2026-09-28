import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { syncUserTellerAccounts } from '../_shared/teller.ts'

// Receives Teller webhooks. Teller signs each delivery in the
// "Teller-Signature" header as t=<unix time>,v1=<hex HMAC-SHA256> where the
// HMAC is computed over "<t>.<raw request body>" with the webhook signing
// secret. Deliveries older than ~5 minutes are rejected (replay protection).

function verifyTellerSignature(rawBody: string, header: string, secret: string): boolean {
  try {
    const parts: Record<string, string[]> = {}
    for (const piece of header.split(',')) {
      const [k, v] = piece.split('=')
      if (!k || !v) continue
      const key = k.trim()
      parts[key] = parts[key] || []
      parts[key].push(v.trim())
    }
    const timestamp = parts['t']?.[0]
    const signatures = parts['v1'] || []
    if (!timestamp || signatures.length === 0) return false

    const ageSeconds = Math.abs(Date.now() / 1000 - Number(timestamp))
    if (!Number.isFinite(ageSeconds) || ageSeconds > 300) return false

    const encoder = new TextEncoder()
    const keyData = encoder.encode(secret)
    const signedPayload = encoder.encode(`${timestamp}.${rawBody}`)
    // SubtleCrypto verify runs constant-time under the hood
    return crypto.subtle
      .verify('HMAC', crypto.subtle.importKey('raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']), hexToBytes(signatures[0]), signedPayload)
      .catch(() => false)
  } catch (_) {
    return false
  }
}

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.trim()
  const bytes = new Uint8Array(clean.length / 2)
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16)
  }
  return bytes
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const rawBody = await req.text()
    const webhookSecret = Deno.env.get('TELLER_WEBHOOK_SECRET')
    if (!webhookSecret) {
      console.error('TELLER_WEBHOOK_SECRET is not configured')
      return new Response(JSON.stringify({ error: 'Webhook secret not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const signatureHeader = req.headers.get('Teller-Signature') || ''
    const valid = await verifyTellerSignature(rawBody, signatureHeader, webhookSecret)
    if (!valid) {
      return new Response(JSON.stringify({ error: 'Invalid webhook signature' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const event = JSON.parse(rawBody)
    const sb = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } },
    )

    const enrollmentId: string | undefined = event?.payload?.enrollment_id || event?.enrollment_id

    if (event?.type === 'transactions.processed' && enrollmentId) {
      const { data: accounts } = await sb
        .from('connected_accounts')
        .select('user_id')
        .eq('provider', 'teller')
        .eq('plaid_item_id', enrollmentId)

      const userIds = new Set<string>((accounts || []).map((a: any) => a.user_id).filter(Boolean))
      for (const userId of userIds) {
        try {
          const result = await syncUserTellerAccounts(sb, userId)
          console.log(`Webhook sync for user ${userId}:`, result)
        } catch (err) {
          console.error(`Webhook sync failed for user ${userId}:`, err)
        }
      }
    } else if (event?.type === 'enrollment.disconnected' && enrollmentId) {
      const { error } = await sb
        .from('connected_accounts')
        .update({ status: 'disconnected' })
        .eq('provider', 'teller')
        .eq('plaid_item_id', enrollmentId)
      if (error) console.error('Failed to mark enrollment disconnected:', error)
    } else {
      console.log(`Unhandled Teller webhook event: ${event?.type || 'unknown'}`)
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Error in teller-webhook:', error)
    // Return 200 for unexpected internal errors so Teller does not retry forever;
    // signature failures above already return 400.
    return new Response(JSON.stringify({ received: true, error: error?.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
