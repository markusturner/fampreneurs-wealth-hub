import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Resend } from 'npm:resend@4.0.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AdminNotifyRequest {
  type: 'agreement' | 'onboarding';
  userName: string;
  userEmail: string;
  programName?: string;
  details?: Record<string, string>;
}

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

    const { type, userName, userEmail, programName, details }: AdminNotifyRequest = await req.json();
    console.log('Admin notification request:', { type, userName, userEmail });

    // Get all admins and owners
    const { data: adminProfiles } = await supabase
      .from('profiles')
      .select('user_id, display_name, email')
      .eq('is_admin', true);

    const { data: ownerRoles } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'owner');

    const ownerUserIds = (ownerRoles || []).map(r => r.user_id);

    // Get owner profiles not already in admin list
    let ownerProfiles: any[] = [];
    if (ownerUserIds.length > 0) {
      const { data: owners } = await supabase
        .from('profiles')
        .select('user_id, display_name, email')
        .in('user_id', ownerUserIds);
      ownerProfiles = owners || [];
    }

    // Merge and deduplicate by user_id
    const recipientMap = new Map<string, { user_id: string; display_name: string | null; email: string | null }>();
    for (const p of [...(adminProfiles || []), ...ownerProfiles]) {
      if (!recipientMap.has(p.user_id)) {
        recipientMap.set(p.user_id, p);
      }
    }

    // Get auth emails for all recipients
    const { data: authUsers } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    const authEmailMap = new Map<string, string>();
    if (authUsers?.users) {
      authUsers.users.forEach(u => {
        if (u.email) authEmailMap.set(u.id, u.email);
      });
    }

    const recipients = Array.from(recipientMap.values());
    console.log(`Found ${recipients.length} admin/owner recipients`);

    if (recipients.length === 0) {
      return new Response(
        JSON.stringify({ success: true, emailsSent: 0 }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    const isAgreement = type === 'agreement';
    const subject = isAgreement
      ? `📝 ${userName} signed the ${programName || 'Program'} Agreement`
      : `📋 ${userName} completed the Onboarding Form`;

    const detailRows = details
      ? Object.entries(details)
          .map(([key, value]) => `<tr><td style="padding:6px 12px;font-weight:600;color:#290a52;font-size:13px;white-space:nowrap;vertical-align:top;">${key}</td><td style="padding:6px 12px;font-size:13px;color:#333;">${value}</td></tr>`)
          .join('')
      : '';

    let emailsSent = 0;

    const emailPromises = recipients.map(async (recipient) => {
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
                .details-table { width: 100%; border-collapse: collapse; margin: 16px 0; }
                .details-table tr:nth-child(even) { background: #f9fafb; }
                .badge { display: inline-block; background: #ffb500; color: #290a52; padding: 4px 14px; border-radius: 12px; font-size: 12px; font-weight: bold; margin-bottom: 16px; }
                .button { display: inline-block; background: #ffb500; color: #290a52; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: bold; }
                .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1 style="margin: 0; font-size: 24px;">${isAgreement ? '📝 Agreement Signed' : '📋 Onboarding Completed'}</h1>
                </div>
                <div class="content">
                  <p>Hi ${recipient.display_name || 'Admin'},</p>
                  <span class="badge">${isAgreement ? 'AGREEMENT' : 'ONBOARDING'}</span>
                  <p><strong>${userName}</strong> (${userEmail}) has ${isAgreement ? `signed the <strong>${programName || 'Program'}</strong> agreement` : 'completed the onboarding form'}.</p>
                  ${detailRows ? `
                    <table class="details-table">
                      ${detailRows}
                    </table>
                  ` : ''}
                  <a href="https://fampreneurs-wealth-hub.lovable.app/admin-settings" class="button">View in Admin Dashboard</a>
                  <div class="footer">
                    <p>This is an automated admin notification from Fampreneurs Wealth Hub.</p>
                  </div>
                </div>
              </div>
            </body>
          </html>
        `;

        await resend.emails.send({
          from: `Fampreneurs Admin <${fromEmail}>`,
          to: [recipientEmail],
          subject,
          html: emailHtml,
        });

        emailsSent++;
        console.log(`Admin notification email sent to ${recipientEmail}`);
      } catch (emailError) {
        console.error(`Failed to send admin email to ${recipientEmail}:`, emailError);
      }
    });

    await Promise.all(emailPromises);

    return new Response(
      JSON.stringify({ success: true, emailsSent }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  } catch (error: any) {
    console.error('Error in notify-admin-submission:', error);
    return new Response(
      JSON.stringify({ error: error.message, success: false }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
};

serve(handler);
