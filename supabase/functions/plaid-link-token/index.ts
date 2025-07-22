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
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
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
    const plaidSecret = Deno.env.get('PLAID_SECRET') || Deno.env.get('PLAID_SECRET_KEY');

    console.log('Plaid credentials check:', {
      hasClientId: !!plaidClientId,
      hasSecret: !!plaidSecret,
      clientIdLength: plaidClientId?.length || 0,
      secretLength: plaidSecret?.length || 0
    });

    if (!plaidClientId || !plaidSecret) {
      console.error('Missing Plaid credentials');
      return new Response(JSON.stringify({ error: 'Server configuration error' }), {
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
      products: ['transactions'],
      account_filters: {
        depository: {
          account_subtypes: ['checking', 'savings']
        }
      },
    };

    console.log('Creating link token for user:', user.id);
    console.log('Link token request payload:', JSON.stringify(linkTokenRequest, null, 2));

    // Call Plaid API to create link token
    const response = await fetch('https://production.plaid.com/link/token/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(linkTokenRequest),
    });

    console.log('Plaid API response status:', response.status);
    const plaidResponse = await response.json();
    console.log('Plaid API response body:', JSON.stringify(plaidResponse, null, 2));

    if (!response.ok) {
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