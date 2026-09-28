import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { tellerFetch } from '../_shared/teller.ts'

// Saves a brand new Teller enrollment: takes the access token from Teller
// Connect, lists the accounts, stores them under the signed-in user, and
// imports their current balances.

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
    const accessToken = typeof body.access_token === 'string' ? body.access_token : ''
    if (!accessToken) {
      return new Response(JSON.stringify({ error: 'Missing access token' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // List the accounts on this enrollment
    const tellerAccounts = await tellerFetch(accessToken, '/accounts')
    if (!Array.isArray(tellerAccounts)) {
      throw new Error('Unexpected response from Teller when listing accounts')
    }

    // Existing Teller accounts for this user, to avoid duplicates
    const { data: existing } = await sb
      .from('connected_accounts')
      .select('id, external_account_id')
      .eq('user_id', user.id)
      .eq('provider', 'teller')
    const existingByExternal = new Map<string, string>()
    for (const row of existing || []) {
      existingByExternal.set((row as any).external_account_id, (row as any).id)
    }

    let saved = 0
    for (const acct of tellerAccounts) {
      let balance = 0
      try {
        const balances = await tellerFetch(accessToken, `/accounts/${acct.id}/balances`)
        balance = Number(balances.available ?? balances.ledger ?? 0) || 0
      } catch (err) {
        console.error(`Balance fetch failed for ${acct.id}:`, err)
      }

      const rowData = {
        user_id: user.id,
        account_name: acct.nickname || acct.name || 'Bank Account',
        account_type: acct.type === 'credit' ? 'bank' : 'bank',
        account_subtype: acct.subtype || null,
        provider: 'teller',
        external_account_id: acct.id,
        balance,
        currency: acct.currency || 'USD',
        status: 'connected',
        plaid_access_token: accessToken, // reuse the token column for the Teller access token
        plaid_item_id: acct.enrollment_id || null,
        metadata: {
          teller_enrollment_id: acct.enrollment_id || null,
          institution: acct.institution || null,
          last_four: acct.last_four || null,
          teller_user_id: body.teller_user_id || null,
          provider_label: 'Teller',
        },
        last_sync: new Date().toISOString(),
      }

      const existingId = existingByExternal.get(acct.id)
      if (existingId) {
        const { error: updateError } = await sb
          .from('connected_accounts')
          .update(rowData)
          .eq('id', existingId)
        if (updateError) throw new Error(`Failed to update account: ${updateError.message}`)
      } else {
        const { error: insertError } = await sb
          .from('connected_accounts')
          .insert(rowData)
        if (insertError) throw new Error(`Failed to save account: ${insertError.message}`)
      }
      saved++
    }

    return new Response(
      JSON.stringify({
        success: true,
        accounts_saved: saved,
        message: `Successfully connected ${saved} account${saved === 1 ? '' : 's'}`,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (error) {
    console.error('Error in teller-enroll:', error)
    return new Response(
      JSON.stringify({ error: error?.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
