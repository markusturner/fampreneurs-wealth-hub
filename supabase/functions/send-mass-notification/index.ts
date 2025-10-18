import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Resend } from 'npm:resend@4.0.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MassNotificationRequest {
  title: string;
  message: string;
  notificationType: string;
}

const handler = async (req: Request): Promise<Response> => {
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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    const fromEmail = Deno.env.get('RESEND_FROM_EMAIL') || 'onboarding@resend.dev';
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const resend = resendApiKey ? new Resend(resendApiKey) : null;

    // Get the authorization header to verify admin access
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Verify the user is an admin
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Check if user is admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile?.is_admin) {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    const { title, message, notificationType }: MassNotificationRequest = await req.json();

    console.log('Sending mass notification:', { title, notificationType });

    // Get all users
    const { data: allUsers, error: usersError } = await supabase
      .from('profiles')
      .select('user_id, email, display_name');

    if (usersError) {
      console.error('Error fetching users:', usersError);
      throw usersError;
    }

    console.log(`Found ${allUsers?.length || 0} users to notify`);

    // Create in-app notifications for all users
    const notifications = (allUsers || []).map(profile => ({
      user_id: profile.user_id,
      sender_id: user.id,
      notification_type: notificationType,
      title: title,
      message: message,
      is_read: false
    }));

    if (notifications.length > 0) {
      const { error: notificationError } = await supabase
        .from('notifications')
        .insert(notifications);

      if (notificationError) {
        console.error('Error creating notifications:', notificationError);
        throw notificationError;
      }

      console.log(`Successfully created ${notifications.length} in-app notifications`);
    }

    // Send email notifications
    let emailsSent = 0;
    if (resend && allUsers && allUsers.length > 0) {
      const emailPromises = allUsers
        .filter(u => u.email)
        .map(async (userProfile) => {
          try {
            const emailHtml = `
              <!DOCTYPE html>
              <html>
                <head>
                  <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0; }
                    .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
                    .message-box { background: #f9fafb; border-left: 4px solid #667eea; padding: 20px; margin: 20px 0; border-radius: 4px; }
                    .button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
                    .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }
                  </style>
                </head>
                <body>
                  <div class="container">
                    <div class="header">
                      <h1 style="margin: 0; font-size: 24px;">🎉 ${title}</h1>
                    </div>
                    <div class="content">
                      <p>Hi ${userProfile.display_name || 'there'},</p>
                      <div class="message-box">
                        <p style="margin: 0; white-space: pre-wrap;">${message}</p>
                      </div>
                      <p>Log in to your dashboard to explore the latest features and improvements.</p>
                      <a href="${supabaseUrl.replace('.supabase.co', '.lovable.app')}" class="button">Open Dashboard</a>
                      <div class="footer">
                        <p>This is an important update from your Family Office platform.</p>
                      </div>
                    </div>
                  </div>
                </body>
              </html>
            `;

            await resend.emails.send({
              from: `Family Office <${fromEmail}>`,
              to: [userProfile.email],
              subject: title,
              html: emailHtml,
            });

            emailsSent++;
            console.log(`Email sent to ${userProfile.email}`);
          } catch (emailError) {
            console.error(`Failed to send email to ${userProfile.email}:`, emailError);
          }
        });

      await Promise.all(emailPromises);
      console.log(`Sent ${emailsSent} email notifications`);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        userCount: allUsers?.length || 0,
        notificationsSent: notifications.length,
        emailsSent: emailsSent
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
    console.error('Error in send-mass-notification function:', error);
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
