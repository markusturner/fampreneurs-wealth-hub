import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { syncUserTellerAccounts } from '../_shared/teller.ts'

// Pulls live balances and the last 90 days of transactions for the signed-in
// user's Teller accounts. Call with { account_id } for one account, or no
// body to sync every Teller account the user has.

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const sb = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } },
    )

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    const { data: { user }, error: userError } = await sb.auth.getUser(authHeader.replace('Bearer ', ''))
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const body = await req.json().catch(() => ({}))
    const accountId = typeof body.account_id === 'string' && body.account_id ? body.account_id : undefined

    const result = await syncUserTellerAccounts(sb, user.id, accountId)

    return new Response(
      JSON.stringify({
        success: result.accounts_synced > 0 || result.errors.length === 0,
        accounts_synced: result.accounts_synced,
        transactions_added: result.transactions_added,
        errors: result.errors,
        message:
          result.accounts_synced === 0 && result.errors.length > 0
            ? result.errors[0]
            : `Synced ${result.accounts_synced} account${result.accounts_synced === 1 ? '' : 's'}, ${result.transactions_added} transactions`,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (error) {
    console.error('Error in teller-sync:', error)
    return new Response(
      JSON.stringify({ error: error?.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
