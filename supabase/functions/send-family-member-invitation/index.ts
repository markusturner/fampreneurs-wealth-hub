import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@4.0.0";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface FamilyMemberInvitationRequest {
  familyMemberId: string;
  email: string;
  firstName: string;
  lastName?: string;
  familyPosition: string;
  tempPassword: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { 
      status: 405, 
      headers: corsHeaders 
    });
  }

  try {
    const apiKey = Deno.env.get('RESEND_API_KEY');
    if (!apiKey) {
      // Return 200 with explicit failure so client doesn't get generic FunctionsHttpError
      return new Response(
        JSON.stringify({
          success: false,
          code: 'RESEND_API_KEY_MISSING',
          error: 'Email service is not configured',
          hint: 'Add RESEND_API_KEY in Supabase secrets and set RESEND_FROM_EMAIL to a verified sender.'
        }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }
    const resend = new Resend(apiKey);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Use verified sender if provided, otherwise fall back to Resend sandbox sender
    const fromAddress = Deno.env.get('RESEND_FROM_EMAIL') || 'onboarding@resend.dev';

    const { 
      familyMemberId, 
      email, 
      firstName, 
      lastName, 
      familyPosition, 
      tempPassword 
    }: FamilyMemberInvitationRequest = await req.json();

    console.log('Processing family member invitation for:', { email, firstName, familyPosition });

    // Get the inviter's profile info
    const authHeader = req.headers.get('authorization') || '';
    const accessToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    let inviterProfile: { display_name: string | null; first_name: string | null; last_name: string | null } | null = null;
    try {
      if (accessToken) {
        const { data: userData } = await supabase.auth.getUser(accessToken);
        const inviterUserId = userData?.user?.id;
        if (inviterUserId) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('display_name, first_name, last_name')
            .eq('user_id', inviterUserId)
            .single();
          inviterProfile = profile;
        }
      }
    } catch (profileError) {
      console.warn('Inviter profile lookup warning (non-fatal):', profileError);
    }

    const inviterName = inviterProfile?.display_name || 
      `${inviterProfile?.first_name || ''} ${inviterProfile?.last_name || ''}`.trim() || 
      'Your Family Office';

    const fullName = `${firstName} ${lastName || ''}`.trim();

    // Send the invitation email (optimized for transactional deliverability)
    const { data: emailData, error: emailError } = await resend.emails.send({
      from: fromAddress,
      to: email,
      subject: `You're invited to join Fampreneurs Family Office, ${firstName}`,
      
      text: `Dear ${fullName},\n\n${inviterName} invited you to join as ${familyPosition}.\n\nEmail: ${email}\nTemporary password: ${tempPassword}\n\nSign in: https://27136ee7-1259-4a9a-9864-1109582fab4d.lovableproject.com/auth\n\nFor security, change your password after first login.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 16px; color:#222;">
          <p>Dear ${fullName},</p>
          <p><strong>${inviterName}</strong> invited you to join the family office platform as a <strong>${familyPosition}</strong>.</p>
          <p><strong>Email:</strong> ${email}<br/><strong>Temporary Password:</strong> <code style="background:#f2f4f7; padding:2px 6px; border-radius:4px;">${tempPassword}</code></p>
          <p>
            <a href="https://27136ee7-1259-4a9a-9864-1109582fab4d.lovableproject.com/auth" style="display:inline-block; background:#0a66c2; color:#fff; padding:10px 16px; text-decoration:none; border-radius:6px;">Sign in</a>
          </p>
          <p style="margin-top:12px;">For security, please change your password after your first login.</p>
        </div>
      `,
    });

    if (emailError) {
      console.error('Resend email error:', emailError);
      const sc = (emailError as any)?.statusCode;
      const message = (emailError as any)?.error || (emailError as any)?.message || 'Failed to send invitation email';
      // Return 200 with explicit failure details to avoid generic FunctionsHttpError on client
      return new Response(
        JSON.stringify({
          success: false,
          code: sc === 403 ? 'RESEND_DOMAIN_NOT_VERIFIED' : 'RESEND_ERROR',
          error: message,
          hint: sc === 403 
            ? 'Verify your domain at resend.com/domains and set RESEND_FROM_EMAIL to a verified sender on that domain.' 
            : 'Check RESEND_API_KEY and sender/from address.'
        }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    console.log('Email sent with id:', emailData?.id);

    // Update the family member record to mark as invited
    const { error: updateError } = await supabase
      .from('family_members')
      .update({
        is_invited: true,
        invitation_sent_at: new Date().toISOString(),
        status: 'invited'
      })
      .eq('id', familyMemberId);

    if (updateError) {
      console.error('Error updating family member status:', updateError);
      // Still return success false if DB update failed
      return new Response(
        JSON.stringify({
          success: false,
          code: 'DB_UPDATE_FAILED',
          error: updateError.message || 'Failed to update member status'
        }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Invitation sent successfully',
        emailId: emailData?.id 
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );

  } catch (error: any) {
    console.error('Error in send-family-member-invitation function:', error);
    // Return 200 with failure to avoid FunctionsHttpError masking message
    return new Response(
      JSON.stringify({ 
        error: error?.message || 'Unexpected error sending invitation',
        success: false 
      }),
      {
        status: 200,
        headers: { 
          'Content-Type': 'application/json', 
          ...corsHeaders 
        },
      }
    );
  }
};

serve(handler);
