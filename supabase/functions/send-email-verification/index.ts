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

    // Send email via Resend
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    const fromEmail = Deno.env.get('RESEND_FROM_EMAIL') || 'noreply@thefampreneurs.com';

    if (resendApiKey) {
      const emailResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [email],
          subject: 'Your TruHeirs Verification Code',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
              <div style="text-align: center; margin-bottom: 24px;">
                <h1 style="color: #290a52; font-size: 24px; margin: 0;">TruHeirs</h1>
                <p style="color: #666; margin-top: 8px;">Identity Verification</p>
              </div>
              <div style="background: #f9f9f9; border-radius: 12px; padding: 24px; text-align: center;">
                <p style="color: #333; margin: 0 0 16px;">Your verification code is:</p>
                <div style="background: #ffb500; color: #290a52; font-size: 32px; font-weight: bold; letter-spacing: 8px; padding: 16px 24px; border-radius: 8px; display: inline-block;">
                  ${verificationCode}
                </div>
                <p style="color: #666; font-size: 13px; margin-top: 16px;">This code expires in 10 minutes.</p>
              </div>
              <p style="color: #999; font-size: 12px; text-align: center; margin-top: 24px;">
                If you did not request this code, please ignore this email.
              </p>
            </div>
          `,
        }),
      });

      if (!emailResponse.ok) {
        const errorData = await emailResponse.text();
        console.error('Resend error:', errorData);
        throw new Error('Failed to send verification email');
      }
    } else {
      console.log(`[DEV] Email Verification Code for ${email}: ${verificationCode}`);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Verification code sent successfully',
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
