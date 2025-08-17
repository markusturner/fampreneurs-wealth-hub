import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Database {
  public: {
    Tables: {
      [_ in never]: never;
    };
  };
}

serve(async (req) => {
  console.log('=== Plaid Link Token Function Started ===');
  console.log('Request method:', req.method);
  console.log('Request URL:', req.url);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('Handling CORS preflight');
    return new Response(null, { headers: corsHeaders });
  }

  // Add a test response to verify function is working
  if (req.url.includes('?test=true')) {
    return new Response(JSON.stringify({ 
      message: 'Function is working',
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const supabaseClient = createClient<Database>(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        auth: {
          persistSession: false,
        },
      }
    );

    // Get the authorization header from the request
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    
    // Get user from token
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !user) {
      console.error('Auth error:', userError);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const plaidClientId = Deno.env.get('PLAID_CLIENT_ID');
    const plaidSecret = Deno.env.get('PLAID_SECRET_KEY');

    console.log('Plaid credentials check:', {
      hasClientId: !!plaidClientId,
      hasSecret: !!plaidSecret,
      clientIdLength: plaidClientId?.length || 0,
      secretLength: plaidSecret?.length || 0
    });

    if (!plaidClientId || !plaidSecret) {
      console.error('Missing Plaid credentials', {
        PLAID_CLIENT_ID: !!plaidClientId,
        PLAID_SECRET: !!plaidSecret
      });
      return new Response(JSON.stringify({ 
        error: 'Server configuration error - missing Plaid credentials',
        debug: {
          hasClientId: !!plaidClientId,
          hasSecret: !!plaidSecret
        }
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create link token request
    const linkTokenRequest = {
      client_id: plaidClientId,
      secret: plaidSecret,
      client_name: "Family Office Dashboard",
      country_codes: ['US'],
      language: 'en',
      user: {
        client_user_id: user.id,
      },
      products: ['auth', 'transactions'],
      account_filters: {
        depository: {
          account_subtypes: ['checking', 'savings']
        }
      },
    };

    console.log('Creating link token for user:', user.id);
    console.log('Link token request payload:', JSON.stringify(linkTokenRequest, null, 2));

    // Call Plaid API to create link token (requesting transactions)
    const initialResponse = await fetch('https://production.plaid.com/link/token/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(linkTokenRequest),
    });

    console.log('Plaid API response status:', initialResponse.status);
    let plaidResponse = await initialResponse.json();
    console.log('Plaid API response body:', JSON.stringify(plaidResponse, null, 2));

    // Fallback: if Transactions product isn't enabled, retry without it so linking can proceed
    if (!initialResponse.ok && plaidResponse?.error_code === 'INVALID_PRODUCT' &&
        (plaidResponse?.error_message?.includes('transactions') || JSON.stringify(plaidResponse).includes('transactions'))) {
      console.warn('Transactions not enabled for this Plaid app. Falling back to auth-only link token.');
      const fallbackRequest = { ...linkTokenRequest, products: ['auth'] as const };
      const fallbackResp = await fetch('https://production.plaid.com/link/token/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fallbackRequest),
      });
      const fallbackBody = await fallbackResp.json();
      console.log('Fallback Plaid response status:', fallbackResp.status);
      console.log('Fallback Plaid response body:', JSON.stringify(fallbackBody, null, 2));

      if (!fallbackResp.ok) {
        console.error('Plaid API error after fallback:', fallbackBody);
        return new Response(JSON.stringify({ error: 'Failed to create link token', details: fallbackBody }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      console.log('Auth-only link token created successfully');
      return new Response(JSON.stringify({
        link_token: fallbackBody.link_token,
        expiration: fallbackBody.expiration,
        warning: 'Plaid Transactions not enabled for this app. Created auth-only link token.'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!initialResponse.ok) {
      console.error('Plaid API error:', plaidResponse);
      return new Response(JSON.stringify({ error: 'Failed to create link token', details: plaidResponse }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Link token created successfully');

    return new Response(JSON.stringify({
      link_token: plaidResponse.link_token,
      expiration: plaidResponse.expiration,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error creating link token:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});