import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.51.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EmailVerificationRequest {
  email: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email }: EmailVerificationRequest = await req.json();

    if (!email) {
      throw new Error('Email is required');
    }

    // Generate a 6-digit verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Store verification code temporarily (expires in 10 minutes)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    
    await supabase
      .from('verification_codes')
      .upsert({
        email,
        code: verificationCode,
        method: 'email',
        expires_at: expiresAt,
        verified: false
      });

    // For demo purposes, we'll simulate email sending
    // In production, you would integrate with Resend, SendGrid, or similar service
    console.log(`Email Verification Code for ${email}: ${verificationCode}`);
    
    // Simulate email service call
    // await sendEmail(email, 'Your Fampreneurs Verification Code', `Your verification code is: ${verificationCode}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Verification code sent successfully',
        // In development, return the code for testing
        ...(Deno.env.get('ENVIRONMENT') === 'development' && { code: verificationCode })
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error('Error in send-email-verification:', error);
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