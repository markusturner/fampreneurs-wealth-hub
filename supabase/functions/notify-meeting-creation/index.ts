import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Resend } from 'npm:resend@4.0.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotifyMeetingRequest {
  meetingId: string;
  meetingTitle: string;
  meetingDate: string;
  meetingTime: string;
  createdBy: string;
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

    const { meetingId, meetingTitle, meetingDate, meetingTime, createdBy }: NotifyMeetingRequest = await req.json();

    console.log('Processing meeting notification request:', { meetingId, meetingTitle, meetingDate, meetingTime, createdBy });

    // Get the creator's profile info
    const { data: creatorProfile, error: profileError } = await supabase
      .from('profiles')
      .select('display_name, first_name, last_name')
      .eq('user_id', createdBy)
      .single();

    if (profileError) {
      console.error('Error fetching creator profile:', profileError);
      throw profileError;
    }

    const creatorName = creatorProfile?.display_name || 
      `${creatorProfile?.first_name || ''} ${creatorProfile?.last_name || ''}`.trim() || 
      'Someone';

    // Get all users except the creator
    const { data: allUsers, error: usersError } = await supabase
      .from('profiles')
      .select('user_id')
      .neq('user_id', createdBy);

    if (usersError) {
      console.error('Error fetching users:', usersError);
      throw usersError;
    }

    console.log(`Found ${allUsers?.length || 0} users to notify`);

    // Format the date and time for display
    const formattedDate = new Date(meetingDate).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });

    // Create notifications for all users
    const notifications = (allUsers || []).map(user => ({
      user_id: user.user_id,
      sender_id: createdBy,
      notification_type: 'meeting_scheduled',
      title: 'New Meeting Scheduled',
      message: `${creatorName} scheduled "${meetingTitle}" for ${formattedDate} at ${meetingTime}`,
      reference_id: meetingId,
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

      console.log(`Successfully created ${notifications.length} notifications`);
    }

    // Send email notifications to all users
    if (resend && allUsers && allUsers.length > 0) {
      const emailPromises = allUsers.map(async (user) => {
        try {
          // Get user email
          const { data: userProfile } = await supabase
            .from('profiles')
            .select('email, display_name')
            .eq('user_id', user.user_id)
            .single();

          if (!userProfile?.email) return;

          const emailHtml = `
            <!DOCTYPE html>
            <html>
              <head>
                <style>
                  body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
                  .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                  .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0; }
                  .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
                  .meeting-details { background: #f9fafb; border-left: 4px solid #667eea; padding: 20px; margin: 20px 0; border-radius: 4px; }
                  .detail-row { display: flex; margin: 10px 0; }
                  .detail-label { font-weight: bold; min-width: 100px; color: #4b5563; }
                  .button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
                  .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }
                </style>
              </head>
              <body>
                <div class="container">
                  <div class="header">
                    <h1 style="margin: 0; font-size: 24px;">📅 New Meeting Scheduled</h1>
                  </div>
                  <div class="content">
                    <p>Hi ${userProfile.display_name || 'there'},</p>
                    <p><strong>${creatorName}</strong> has scheduled a new meeting:</p>
                    <div class="meeting-details">
                      <div class="detail-row">
                        <span class="detail-label">Title:</span>
                        <span>${meetingTitle}</span>
                      </div>
                      <div class="detail-row">
                        <span class="detail-label">Date:</span>
                        <span>${formattedDate}</span>
                      </div>
                      <div class="detail-row">
                        <span class="detail-label">Time:</span>
                        <span>${meetingTime}</span>
                      </div>
                      <div class="detail-row">
                        <span class="detail-label">Organizer:</span>
                        <span>${creatorName}</span>
                      </div>
                    </div>
                    <p>Make sure to mark your calendar and prepare for this meeting.</p>
                    <a href="${supabaseUrl.replace('.supabase.co', '.lovable.app')}/calendar" class="button">View in Calendar</a>
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
            to: [userProfile.email],
            subject: `New Meeting: ${meetingTitle} - ${formattedDate}`,
            html: emailHtml,
          });

          console.log(`Meeting email sent to ${userProfile.email}`);
        } catch (emailError) {
          console.error(`Failed to send meeting email:`, emailError);
        }
      });

      await Promise.all(emailPromises);
      console.log(`Sent ${emailPromises.length} meeting email notifications`);
    } else if (!resend) {
      console.log('Resend not configured, skipping email notifications');
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        notificationsSent: notifications.length,
        creatorName 
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
    console.error('Error in notify-meeting-creation function:', error);
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
