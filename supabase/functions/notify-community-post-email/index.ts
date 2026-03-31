import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Resend } from 'npm:resend@4.0.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    const fromEmail = Deno.env.get('RESEND_FROM_EMAIL') || 'onboarding@resend.dev';

    if (!resendApiKey) {
      console.error('RESEND_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'Email service not configured' }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const resend = new Resend(resendApiKey);

    const { post_id, user_id, content, program, category } = await req.json();
    console.log('Processing community post email notification:', { post_id, user_id });

    // Get poster's profile
    const { data: posterProfile } = await supabase
      .from('profiles')
      .select('display_name, first_name, last_name')
      .eq('user_id', user_id)
      .single();

    const posterName = posterProfile?.display_name ||
      `${posterProfile?.first_name || ''} ${posterProfile?.last_name || ''}`.trim() ||
      'A member';

    // Get all users except the poster, using auth.users for login email
    const { data: allProfiles } = await supabase
      .from('profiles')
      .select('user_id, display_name, email')
      .neq('user_id', user_id);

    if (!allProfiles || allProfiles.length === 0) {
      return new Response(
        JSON.stringify({ success: true, emailsSent: 0 }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Also fetch login emails from auth.users via admin API
    const userIds = allProfiles.map(p => p.user_id);
    const { data: authUsers } = await supabase.auth.admin.listUsers({ perPage: 1000 });

    const authEmailMap = new Map<string, string>();
    if (authUsers?.users) {
      authUsers.users.forEach(u => {
        if (u.email) authEmailMap.set(u.id, u.email);
      });
    }

    const previewContent = content.length > 300
      ? content.substring(0, 300) + '...'
      : content;

    const communityLabel = program || category || 'Community';
    const appUrl = 'https://fampreneurs-wealth-hub.lovable.app';

    let emailsSent = 0;

    const emailPromises = allProfiles.map(async (recipient) => {
      // Prefer auth email (login email), fall back to profile email
      const recipientEmail = authEmailMap.get(recipient.user_id) || recipient.email;
      if (!recipientEmail) return;

      try {
        const emailHtml = `
          <!DOCTYPE html>
          <html>
            <head>
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #290a52 0%, #4a1a8a 100%); color: white; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0; }
                .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
                .post-box { background: #f9fafb; border-left: 4px solid #ffb500; padding: 15px; margin: 20px 0; border-radius: 4px; }
                .button { display: inline-block; background: #ffb500; color: #290a52; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: bold; }
                .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }
                .badge { display: inline-block; background: #ffb500; color: #290a52; padding: 2px 10px; border-radius: 12px; font-size: 12px; font-weight: bold; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1 style="margin: 0; font-size: 24px;">📢 New Community Post</h1>
                  <p style="margin: 8px 0 0; opacity: 0.9;">${communityLabel}</p>
                </div>
                <div class="content">
                  <p>Hi ${recipient.display_name || 'there'},</p>
                  <p><strong>${posterName}</strong> posted in the community:</p>
                  <div class="post-box">
                    <p style="margin: 0; white-space: pre-wrap;">${previewContent}</p>
                  </div>
                  <p>Log in to view the full post and join the conversation.</p>
                  <a href="${appUrl}/community" class="button">View Post</a>
                  <div class="footer">
                    <p>This is an automated notification from Fampreneurs Wealth Hub.</p>
                  </div>
                </div>
              </div>
            </body>
          </html>
        `;

        await resend.emails.send({
          from: `Fampreneurs <${fromEmail}>`,
          to: [recipientEmail],
          subject: `${posterName} posted in ${communityLabel}`,
          html: emailHtml,
        });

        emailsSent++;
        console.log(`Community post email sent to ${recipientEmail}`);
      } catch (emailError) {
        console.error(`Failed to send email to ${recipientEmail}:`, emailError);
      }
    });

    await Promise.all(emailPromises);

    return new Response(
      JSON.stringify({ success: true, emailsSent }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  } catch (error: any) {
    console.error('Error in notify-community-post-email:', error);
    return new Response(
      JSON.stringify({ error: error.message, success: false }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
};

serve(handler);
