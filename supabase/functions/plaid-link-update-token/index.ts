import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Database {
  public: {
    Tables: {
      connected_accounts: {
        Row: {
          id: string;
          user_id: string;
          provider: string;
          plaid_access_token: string | null;
          account_name: string | null;
        };
      };
    };
  };
}

serve(async (req) => {
  console.log('=== Plaid Link Update Token Function Started ===');
  console.log('Request method:', req.method);
  console.log('Request URL:', req.url);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient<Database>(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      console.error('Auth error:', userError);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { account_id } = await req.json().catch(() => ({ account_id: null }));
    if (!account_id) {
      return new Response(JSON.stringify({ error: 'account_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch the connected account to get the Plaid access token
    const { data: account, error: accError } = await supabaseClient
      .from('connected_accounts')
      .select('*')
      .eq('id', account_id)
      .eq('user_id', user.id)
      .eq('provider', 'plaid')
      .maybeSingle();

    if (accError || !account) {
      console.error('Account fetch error:', accError);
      return new Response(JSON.stringify({ error: 'Account not found or not authorized' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!account.plaid_access_token) {
      return new Response(JSON.stringify({ error: 'No Plaid access token for this account' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const plaidClientId = Deno.env.get('PLAID_CLIENT_ID');
    const plaidSecret = Deno.env.get('PLAID_SECRET_KEY');

    if (!plaidClientId || !plaidSecret) {
      console.error('Missing Plaid credentials');
      return new Response(JSON.stringify({ error: 'Server configuration error - missing Plaid credentials' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = {
      client_id: plaidClientId,
      secret: plaidSecret,
      access_token: account.plaid_access_token,
      client_name: 'Family Office Dashboard',
      country_codes: ['US'],
      language: 'en',
      user: { client_user_id: user.id },
      products: ['transactions'], // Request upgrade to Transactions
    };

    console.log('Requesting update-mode link token for account', account_id, '(', account.account_name, ')');

    // Infer Plaid environment from access token prefix
    const inferPlaidBaseUrl = (accessToken: string): string => {
      if (accessToken.startsWith('access-sandbox')) return 'https://sandbox.plaid.com';
      if (accessToken.startsWith('access-development')) return 'https://development.plaid.com';
      return 'https://production.plaid.com';
    };
    const baseUrl = inferPlaidBaseUrl(account.plaid_access_token);

    // First attempt: request update-mode link token including Transactions
    let response = await fetch(`${baseUrl}/link/token/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    let plaidResponse = await response.json();
    console.log('Plaid update token response status:', response.status);

    if (!response.ok && plaidResponse?.error_code === 'INVALID_PRODUCT' &&
        (plaidResponse?.error_message?.includes('transactions') || JSON.stringify(plaidResponse).includes('transactions'))) {
      console.warn('Transactions not enabled for this Plaid app. Falling back to update link without requesting new products.');
      // Omit products to avoid requesting an unauthorized upgrade
      const { products, ...fallbackBody } = body as Record<string, unknown>;
      response = await fetch(`${baseUrl}/link/token/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fallbackBody),
      });
      plaidResponse = await response.json();
      console.log('Fallback update token response status:', response.status);

      if (!response.ok) {
        console.error('Plaid update token error after fallback:', plaidResponse);
        return new Response(JSON.stringify({ error: 'Failed to create update link token', details: plaidResponse }), {
          status: response.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({
        link_token: plaidResponse.link_token,
        expiration: plaidResponse.expiration,
        warning: 'Plaid Transactions not enabled. Created update link without product upgrade.'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!response.ok) {
      console.error('Plaid update token error:', plaidResponse);
      return new Response(JSON.stringify({ error: 'Failed to create update link token', details: plaidResponse }), {
        status: response.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({
      link_token: plaidResponse.link_token,
      expiration: plaidResponse.expiration,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Unexpected error creating update link token:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
