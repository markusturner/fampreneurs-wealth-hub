import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get user from Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { account_id } = await req.json();

    if (!account_id) {
      return new Response(JSON.stringify({ error: 'Account ID is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get the connected account with Plaid access token
    const { data: account, error: accountError } = await supabaseClient
      .from('connected_accounts')
      .select('*')
      .eq('id', account_id)
      .eq('user_id', user.id)
      .eq('provider', 'plaid')
      .single();

    if (accountError || !account) {
      return new Response(JSON.stringify({ error: 'Account not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const plaidClientId = Deno.env.get('PLAID_CLIENT_ID');
    const plaidSecret = Deno.env.get('PLAID_SECRET_KEY');

    if (!plaidClientId || !plaidSecret) {
      return new Response(JSON.stringify({ error: 'Plaid credentials not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch transactions from Plaid
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // 30 days ago

    const plaidResponse = await fetch('https://production.plaid.com/transactions/get', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: plaidClientId,
        secret: plaidSecret,
        access_token: account.plaid_access_token,
        start_date: startDate,
        end_date: endDate,
        account_ids: [account.external_account_id],
      }),
    });

    if (!plaidResponse.ok) {
      const error = await plaidResponse.text();
      console.error('Plaid API error:', error);
      return new Response(JSON.stringify({ error: 'Failed to fetch transactions from Plaid' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const plaidData = await plaidResponse.json();
    console.log(`Fetched ${plaidData.transactions.length} transactions from Plaid`);

    // Transform and insert transactions
    const transactionInserts = plaidData.transactions.map((transaction: any) => ({
      user_id: user.id,
      account_id: account.id,
      transaction_id: transaction.transaction_id,
      description: transaction.name,
      merchant_name: transaction.merchant_name,
      amount: Math.abs(transaction.amount), // Plaid amounts are negative for debits
      transaction_type: transaction.amount > 0 ? 'credit' : 'debit',
      category: transaction.category ? transaction.category[0] : 'Other',
      transaction_date: transaction.date,
      authorized_date: transaction.authorized_date,
      pending: transaction.pending,
      currency: transaction.iso_currency_code || 'USD',
      location: transaction.location ? {
        address: transaction.location.address,
        city: transaction.location.city,
        region: transaction.location.region,
        postal_code: transaction.location.postal_code,
        country: transaction.location.country,
      } : null,
      metadata: {
        plaid_account_id: transaction.account_id,
        plaid_transaction_id: transaction.transaction_id,
        original_amount: transaction.amount,
        subcategory: transaction.category ? transaction.category.slice(1) : [],
      }
    }));

    // Insert transactions, handling duplicates
    const { data: insertedTransactions, error: insertError } = await supabaseClient
      .from('account_transactions')
      .upsert(transactionInserts, { 
        onConflict: 'transaction_id',
        ignoreDuplicates: false 
      })
      .select();

    if (insertError) {
      console.error('Database insert error:', insertError);
      return new Response(JSON.stringify({ error: 'Failed to save transactions', details: insertError }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Update account's last sync time
    await supabaseClient
      .from('connected_accounts')
      .update({ last_sync: new Date().toISOString() })
      .eq('id', account_id);

    console.log(`Successfully saved ${insertedTransactions?.length} transactions`);

    return new Response(JSON.stringify({
      success: true,
      transactions: insertedTransactions,
      message: `Successfully synced ${insertedTransactions?.length} transactions`,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error fetching transactions:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});