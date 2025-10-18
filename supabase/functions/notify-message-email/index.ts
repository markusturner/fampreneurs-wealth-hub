import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Resend } from 'npm:resend@4.0.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotifyMessageRequest {
  messageId: string;
  messageContent: string;
  senderId: string;
  recipientId?: string;
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
    
    if (!resendApiKey) {
      console.error('RESEND_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'Email service not configured' }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const resend = new Resend(resendApiKey);

    const { messageId, messageContent, senderId, recipientId }: NotifyMessageRequest = await req.json();

    console.log('Processing message notification:', { messageId, senderId, recipientId });

    // Get sender's profile
    const { data: senderProfile, error: senderError } = await supabase
      .from('profiles')
      .select('display_name, first_name, last_name, email')
      .eq('user_id', senderId)
      .single();

    if (senderError) {
      console.error('Error fetching sender profile:', senderError);
      throw senderError;
    }

    const senderName = senderProfile?.display_name || 
      `${senderProfile?.first_name || ''} ${senderProfile?.last_name || ''}`.trim() || 
      'Someone';

    // Determine recipients
    let recipients: { user_id: string; email: string; display_name?: string }[] = [];

    if (recipientId) {
      // Direct message to specific recipient
      const { data: recipientProfile, error: recipientError } = await supabase
        .from('profiles')
        .select('user_id, email, display_name')
        .eq('user_id', recipientId)
        .single();

      if (!recipientError && recipientProfile) {
        recipients = [recipientProfile];
      }
    } else {
      // Broadcast to all family members in ecosystem (exclude sender)
      const { data: allUsers, error: usersError } = await supabase
        .from('profiles')
        .select('user_id, email, display_name')
        .neq('user_id', senderId);

      if (!usersError && allUsers) {
        recipients = allUsers;
      }
    }

    console.log(`Found ${recipients.length} recipients for message notification`);

    // Create in-app notifications
    const notifications = recipients.map(recipient => ({
      user_id: recipient.user_id,
      sender_id: senderId,
      notification_type: 'family_message',
      title: 'New Message',
      message: `${senderName} sent you a message`,
      reference_id: messageId,
      is_read: false
    }));

    if (notifications.length > 0) {
      const { error: notificationError } = await supabase
        .from('notifications')
        .insert(notifications);

      if (notificationError) {
        console.error('Error creating notifications:', notificationError);
      }
    }

    // Send email notifications
    const emailPromises = recipients
      .filter(r => r.email)
      .map(async (recipient) => {
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
                  .message-box { background: #f9fafb; border-left: 4px solid #667eea; padding: 15px; margin: 20px 0; border-radius: 4px; }
                  .button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
                  .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }
                </style>
              </head>
              <body>
                <div class="container">
                  <div class="header">
                    <h1 style="margin: 0; font-size: 24px;">📬 New Message</h1>
                  </div>
                  <div class="content">
                    <p>Hi ${recipient.display_name || 'there'},</p>
                    <p><strong>${senderName}</strong> sent you a message:</p>
                    <div class="message-box">
                      <p style="margin: 0;">${messageContent.substring(0, 200)}${messageContent.length > 200 ? '...' : ''}</p>
                    </div>
                    <p>Log in to your dashboard to view the full message and reply.</p>
                    <a href="${supabaseUrl.replace('.supabase.co', '.lovable.app')}" class="button">View Message</a>
                    <div class="footer">
                      <p>This is an automated notification from your Family Office platform.</p>
                    </div>
                  </div>
                </div>
              </body>
            </html>
          `;

          await resend.emails.send({
            from: `Family Office <${fromEmail}>`,
            to: [recipient.email],
            subject: `New message from ${senderName}`,
            html: emailHtml,
          });

          console.log(`Email sent to ${recipient.email}`);
        } catch (emailError) {
          console.error(`Failed to send email to ${recipient.email}:`, emailError);
        }
      });

    await Promise.all(emailPromises);

    return new Response(
      JSON.stringify({ 
        success: true, 
        notificationsSent: notifications.length,
        emailsSent: emailPromises.length 
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
    console.error('Error in notify-message-email function:', error);
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
