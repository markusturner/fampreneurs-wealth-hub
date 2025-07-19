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
          google_sheet_id?: string;
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
          google_sheet_id?: string;
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

    const { sheet_url, account_name } = await req.json();

    if (!sheet_url || !account_name) {
      return new Response(JSON.stringify({ error: 'Sheet URL and account name are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Processing Google Sheets integration for user:', user.id);

    // Extract sheet ID from URL
    let sheetId = '';
    try {
      const urlPattern = /\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/;
      const match = sheet_url.match(urlPattern);
      if (match) {
        sheetId = match[1];
      } else {
        throw new Error('Invalid Google Sheets URL format');
      }
    } catch (error) {
      console.error('Error parsing sheet URL:', error);
      return new Response(JSON.stringify({ error: 'Invalid Google Sheets URL format' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create connected account entry
    const accountData = {
      user_id: user.id,
      account_name: account_name,
      account_type: 'business',
      provider: 'google_sheets',
      balance: 0, // Will be updated when we sync data
      currency: 'USD',
      status: 'connected',
      google_sheet_id: sheetId,
      metadata: {
        sheet_url: sheet_url,
        integration_type: 'google_sheets',
        last_row_processed: 0,
      },
    };

    const { data: insertedAccount, error: insertError } = await supabaseClient
      .from('connected_accounts')
      .insert(accountData)
      .select()
      .single();

    if (insertError) {
      console.error('Database insert error:', insertError);
      return new Response(JSON.stringify({ error: 'Failed to save account', details: insertError }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Successfully connected Google Sheets account');

    return new Response(JSON.stringify({
      success: true,
      account: insertedAccount,
      message: `Successfully connected Google Sheets: ${account_name}`,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in Google Sheets integration:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});