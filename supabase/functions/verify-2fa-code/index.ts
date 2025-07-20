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
    const { email, code, method, phoneNumber, secret }: VerifyCodeRequest = await req.json();

    if (!email || !code || !method) {
      throw new Error('Email, code, and method are required');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

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
          });
      }
    } else {
      // Verify SMS or email code
      const { data: verificationRecord } = await supabase
        .from('verification_codes')
        .select('*')
        .eq('email', email)
        .eq('method', method)
        .eq('code', code)
        .eq('verified', false)
        .gte('expires_at', new Date().toISOString())
        .single();

      if (verificationRecord) {
        isValid = true;
        
        // Mark code as verified
        await supabase
          .from('verification_codes')
          .update({ verified: true })
          .eq('id', verificationRecord.id);

        // Store the 2FA setup in user profile or settings
        await supabase
          .from('user_2fa_settings')
          .upsert({
            email,
            method,
            phone_number: method === 'phone' ? phoneNumber : null,
            enabled: true,
            verified_at: new Date().toISOString()
          });
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