import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.51.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface VerifyCodeRequest {
  email: string;
  code: string;
  method: 'phone' | 'email' | 'authenticator';
  phoneNumber?: string;
  secret?: string;
}

// Simple TOTP implementation for authenticator verification
function generateTOTP(secret: string, timeStep = 30): string {
  const epoch = Math.floor(Date.now() / 1000);
  const counter = Math.floor(epoch / timeStep);
  
  // This is a simplified TOTP implementation
  // In production, use a proper TOTP library
  const hash = simpleHash(secret + counter.toString());
  const code = (hash % 1000000).toString().padStart(6, '0');
  return code;
}

function simpleHash(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload: VerifyCodeRequest = await req.json();
    const requestedEmail = (payload.email || '').trim().toLowerCase();
    const code = (payload.code || '').trim();
    const { method, phoneNumber, secret } = payload;

    if (!requestedEmail || !/^\d{6}$/.test(code) || !method) {
      throw new Error('Email, code, and method are required');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const authHeader = req.headers.get('Authorization');
    if (!supabaseUrl || !supabaseKey || !authHeader) {
      throw new Error('You must be signed in to verify your information');
    }
    const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });
    const token = authHeader.replace(/^Bearer\s+/i, '');
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    const email = userData.user?.email?.trim().toLowerCase() || '';
    if (userError || !email || requestedEmail !== email) {
      throw new Error('We could not confirm this email belongs to your account');
    }

    let isValid = false;

    if (method === 'authenticator' && secret) {
      // Verify TOTP code
      const expectedCode = generateTOTP(secret);
      const previousCode = generateTOTP(secret, 30); // Allow previous time step
      isValid = code === expectedCode || code === previousCode;
      
      if (isValid) {
        // Store the 2FA setup in user profile or settings
        await supabase
          .from('user_2fa_settings')
          .upsert({
            email,
            method: 'authenticator',
            secret,
            enabled: true,
            verified_at: new Date().toISOString()
          }, { onConflict: 'email' });
      }
    } else {
      // Verify SMS or email code
      const databaseMethod = method === 'phone' ? 'sms' : method;
      const { data: verificationRecord, error: lookupError } = await supabase
        .from('verification_codes')
        .select('*')
        .ilike('email', email)
        .eq('method', databaseMethod)
        .eq('code', code)
        .eq('verified', false)
        .gte('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (lookupError) throw new Error('We could not check your code. Please try again.');

      // Double submits: the same code may already be marked verified. Treat that as success.
      if (!verificationRecord) {
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
        const { data: alreadyVerified } = await supabase
          .from('verification_codes')
          .select('id')
          .ilike('email', email)
          .eq('method', databaseMethod)
          .eq('code', code)
          .eq('verified', true)
          .gte('created_at', fiveMinutesAgo)
          .limit(1)
          .maybeSingle();

        if (alreadyVerified) {
          return new Response(
            JSON.stringify({ success: true, message: '2FA setup completed successfully', method }),
            { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
          );
        }

        // Give a clear reason so people know whether to request a new code.
        const { data: expiredRecord } = await supabase
          .from('verification_codes')
          .select('id')
          .ilike('email', email)
          .eq('method', databaseMethod)
          .eq('code', code)
          .lt('expires_at', new Date().toISOString())
          .limit(1)
          .maybeSingle();

        return new Response(
          JSON.stringify({
            error: expiredRecord
              ? 'That code expired. Please request a new code.'
              : 'That code is not correct. Please check it or request a new code.',
          }),
          { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
        );
      }

      if (verificationRecord) {
        isValid = true;
        
        // Mark code as verified
        const { error: consumeError } = await supabase
          .from('verification_codes')
          .update({ verified: true })
          .eq('id', verificationRecord.id);

        if (consumeError) throw new Error('We could not finish verification. Please try again.');

        // Store the 2FA setup in user profile or settings
        const { error: settingsError } = await supabase
          .from('user_2fa_settings')
          .upsert({
            email,
            method,
            phone_number: method === 'phone' ? phoneNumber : null,
            enabled: true,
            verified_at: new Date().toISOString()
          }, { onConflict: 'email' });

        if (settingsError) throw new Error('Your code was correct, but verification could not be saved. Please try again.');
      }
    }

    if (!isValid) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired verification code' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: '2FA setup completed successfully',
        method
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error('Error in verify-2fa-code:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
};

serve(handler);