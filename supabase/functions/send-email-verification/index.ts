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
    const body: EmailVerificationRequest = await req.json();
    const requestedEmail = (body.email || '').trim().toLowerCase();

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const authHeader = req.headers.get('Authorization');
    if (!supabaseUrl || !supabaseKey || !authHeader) {
      throw new Error('You must be signed in to request a verification code');
    }

    const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });
    const token = authHeader.replace(/^Bearer\s+/i, '');
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    const email = userData.user?.email?.trim().toLowerCase() || '';

    if (userError || !email || (requestedEmail && requestedEmail !== email)) {
      throw new Error('We could not confirm this email belongs to your account');
    }

    // Use secure randomness for the 6-digit verification code.
    const random = new Uint32Array(1);
    crypto.getRandomValues(random);
    const verificationCode = (100000 + (random[0] % 900000)).toString();

    // Prevent repeated requests from replacing a code before the email arrives.
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000).toISOString();
    const { data: recentCode, error: recentCodeError } = await supabase
      .from('verification_codes')
      .select('id')
      .ilike('email', email)
      .eq('method', 'email')
      .eq('verified', false)
      .gte('created_at', oneMinuteAgo)
      .limit(1)
      .maybeSingle();

    if (recentCodeError) throw new Error('Could not check your recent verification request. Please try again.');
    if (recentCode) {
      return new Response(
        JSON.stringify({ error: 'A code was just sent. Please wait one minute before requesting another.' }),
        { status: 429, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
      );
    }

    // Store verification code temporarily (expires in 15 minutes)
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    
    // Clear any stale codes for this email so only the newest one is valid
    const { error: deleteError } = await supabase
      .from('verification_codes')
      .delete()
      .ilike('email', email)
      .eq('method', 'email')
      .eq('verified', false);

    if (deleteError) {
      console.error('Failed to clear stale verification codes:', deleteError);
      throw new Error('Could not prepare a new verification code. Please try again.');
    }

    const { error: insertError } = await supabase
      .from('verification_codes')
      .insert({
        email,
        code: verificationCode,
        method: 'email',
        expires_at: expiresAt,
        verified: false
      });

    if (insertError) {
      console.error('Failed to store verification code:', insertError);
      throw new Error('Could not create a verification code. Please try again.');
    }

    // Send email via Resend
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    const fromEmail = Deno.env.get('RESEND_FROM_EMAIL') || 'noreply@thefampreneurs.com';

    if (!resendApiKey) {
      // Never report success when no email can actually be sent.
      await supabase.from('verification_codes').delete().ilike('email', email).eq('code', verificationCode);
      throw new Error('Email delivery is not configured. Please contact support.');
    }

    {
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
                <p style="color: #666; font-size: 13px; margin-top: 16px;">This code expires in 15 minutes.</p>
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
        await supabase.from('verification_codes').delete().ilike('email', email).eq('code', verificationCode);
        throw new Error('We could not send your verification email. Please try again or contact support.');
      }
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
