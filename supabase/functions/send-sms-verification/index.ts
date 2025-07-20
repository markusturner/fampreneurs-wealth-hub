import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.51.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SMSVerificationRequest {
  phoneNumber: string;
  email: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { phoneNumber, email }: SMSVerificationRequest = await req.json();

    if (!phoneNumber || !email) {
      throw new Error('Phone number and email are required');
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
        phone_number: phoneNumber,
        code: verificationCode,
        method: 'sms',
        expires_at: expiresAt,
        verified: false
      });

    // For demo purposes, we'll simulate SMS sending
    // In production, you would integrate with Twilio, AWS SNS, or similar service
    console.log(`SMS Verification Code for ${phoneNumber}: ${verificationCode}`);
    
    // Simulate SMS service call
    // await sendSMS(phoneNumber, `Your Fampreneurs verification code is: ${verificationCode}`);

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
    console.error('Error in send-sms-verification:', error);
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