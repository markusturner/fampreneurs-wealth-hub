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
          account_name: string;
          account_type: string;
          provider: string;
          external_account_id?: string;
          balance: number;
          currency: string;
          last_sync: string;
          status: string;
          plaid_access_token?: string;
          plaid_item_id?: string;
          metadata?: any;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          account_name: string;
          account_type: string;
          provider: string;
          external_account_id?: string;
          balance?: number;
          currency?: string;
          last_sync?: string;
          status?: string;
          plaid_access_token?: string;
          plaid_item_id?: string;
          metadata?: any;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          account_name?: string;
          account_type?: string;
          provider?: string;
          external_account_id?: string;
          balance?: number;
          currency?: string;
          last_sync?: string;
          status?: string;
          plaid_access_token?: string;
          plaid_item_id?: string;
          metadata?: any;
          created_at?: string;
          updated_at?: string;
        };
      };
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
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
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

    const { public_token } = await req.json();

    if (!public_token) {
      return new Response(JSON.stringify({ error: 'Public token is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const plaidClientId = Deno.env.get('PLAID_CLIENT_ID');
    const plaidSecret = Deno.env.get('PLAID_SECRET_KEY');

    if (!plaidClientId || !plaidSecret) {
      console.error('Missing Plaid credentials');
      return new Response(JSON.stringify({ error: 'Server configuration error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Exchanging public token for access token');

    // Exchange public token for access token - FIXED: correct endpoint
    const exchangeResponse = await fetch('https://production.plaid.com/item/public_token/exchange', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: plaidClientId,
        secret: plaidSecret,
        public_token,
      }),
    });

    const exchangeData = await exchangeResponse.json();

    if (!exchangeResponse.ok) {
      console.error('Plaid exchange error:', exchangeData);
      return new Response(JSON.stringify({ error: 'Failed to exchange token', details: exchangeData }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { access_token, item_id } = exchangeData;

    console.log('Access token obtained, fetching accounts');

    // Get accounts information
    const accountsResponse = await fetch('https://production.plaid.com/accounts/get', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: plaidClientId,
        secret: plaidSecret,
        access_token,
      }),
    });

    const accountsData = await accountsResponse.json();

    if (!accountsResponse.ok) {
      console.error('Plaid accounts error:', accountsData);
      return new Response(JSON.stringify({ error: 'Failed to fetch accounts', details: accountsData }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Processing ${accountsData.accounts.length} accounts`);

    // Store accounts in database
    const accountInserts = accountsData.accounts.map((account: any) => {
      const accountType = account.type === 'investment' ? 'brokerage' : 
                         account.type === 'depository' ? 'bank' : 
                         account.type;

      return {
        user_id: user.id,
        account_name: account.name,
        account_type: accountType,
        provider: 'plaid',
        external_account_id: account.account_id,
        balance: account.balances.current || 0,
        currency: account.balances.iso_currency_code || 'USD',
        status: 'connected',
        plaid_access_token: access_token,
        plaid_item_id: item_id,
        metadata: {
          account_id: account.account_id,
          institution_id: accountsData.item.institution_id,
          mask: account.mask,
          official_name: account.official_name,
          subtype: account.subtype,
          plaid_type: account.type,
        },
      };
    });

    const { data: insertedAccounts, error: insertError } = await supabaseClient
      .from('connected_accounts')
      .insert(accountInserts)
      .select();

    if (insertError) {
      console.error('Database insert error:', insertError);
      return new Response(JSON.stringify({ error: 'Failed to save accounts', details: insertError }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Successfully saved ${insertedAccounts?.length} accounts`);

    return new Response(JSON.stringify({
      success: true,
      accounts: insertedAccounts,
      message: `Successfully connected ${insertedAccounts?.length} accounts`,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in token exchange:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});