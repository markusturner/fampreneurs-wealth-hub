import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@4.0.0";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
    const resend = new Resend(Deno.env.get('RESEND_API_KEY'));
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

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
    const { data: inviterProfile, error: profileError } = await supabase
      .from('profiles')
      .select('display_name, first_name, last_name')
      .eq('user_id', req.headers.get('authorization')?.split(' ')[1] || '')
      .single();

    const inviterName = inviterProfile?.display_name || 
      `${inviterProfile?.first_name || ''} ${inviterProfile?.last_name || ''}`.trim() || 
      'Your Family Office';

    const fullName = `${firstName} ${lastName || ''}`.trim();

    // Send the invitation email
    const emailResponse = await resend.emails.send({
      from: 'Family Office <onboarding@resend.dev>',
      to: [email],
      subject: `Family Office Invitation - Welcome ${firstName}!`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #333; text-align: center;">Welcome to the Family Office</h1>
          
          <p>Dear ${fullName},</p>
          
          <p>You have been invited by <strong>${inviterName}</strong> to join the family office platform as a <strong>${familyPosition}</strong>.</p>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #333;">Your Login Credentials:</h3>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Temporary Password:</strong> <code style="background-color: #e9ecef; padding: 4px 8px; border-radius: 4px;">${tempPassword}</code></p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${supabaseUrl.replace('.supabase.co', '.vercel.app')}/auth" 
               style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Access Family Office Platform
            </a>
          </div>
          
          <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 6px; margin: 20px 0;">
            <p style="margin: 0; color: #856404;"><strong>Security Notice:</strong> Please change your password after your first login for security purposes.</p>
          </div>
          
          <p>If you have any questions or need assistance, please contact your family office administrator.</p>
          
          <p>Best regards,<br>The Family Office Team</p>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="font-size: 12px; color: #666; text-align: center;">
            This is an automated message. Please do not reply to this email.
          </p>
        </div>
      `,
    });

    console.log('Email sent successfully:', emailResponse);

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
      throw updateError;
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Invitation sent successfully',
        emailId: emailResponse.data?.id 
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
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      {
        status: 500,
        headers: { 
          'Content-Type': 'application/json', 
          ...corsHeaders 
        },
      }
    );
  }
};

serve(handler);