import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Resend } from 'npm:resend@4.0.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const REMINDER_LABELS: Record<string, string> = {
  '30_days': '30 days',
  '7_days': '7 days',
  '2_days': '2 days',
  '24_hours': '24 hours',
  '12_hours': '12 hours',
  '2_hours': '2 hours',
  '5_minutes': '5 minutes',
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
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const resend = resendApiKey ? new Resend(resendApiKey) : null;

    const now = new Date();
    
    // Get all unsent reminders that are due
    const { data: dueReminders, error: reminderError } = await supabase
      .from('meeting_reminders')
      .select('*')
      .eq('sent', false)
      .lte('scheduled_for', now.toISOString())
      .order('scheduled_for', { ascending: true });

    if (reminderError) {
      console.error('Error fetching reminders:', reminderError);
      throw reminderError;
    }

    console.log(`Found ${dueReminders?.length || 0} due reminders`);

    if (!dueReminders || dueReminders.length === 0) {
      return new Response(
        JSON.stringify({ success: true, remindersSent: 0 }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    let totalNotificationsSent = 0;

    for (const reminder of dueReminders) {
      // Get meeting details
      const { data: meeting, error: meetingError } = await supabase
        .from('meetings')
        .select('*')
        .eq('id', reminder.meeting_id)
        .single();

      if (meetingError || !meeting) {
        console.error(`Meeting not found for reminder ${reminder.id}:`, meetingError);
        // Mark reminder as sent to avoid retrying
        await supabase
          .from('meeting_reminders')
          .update({ sent: true })
          .eq('id', reminder.id);
        continue;
      }

      // Get all users to notify
      const { data: allUsers, error: usersError } = await supabase
        .from('profiles')
        .select('user_id, email, display_name');

      if (usersError) {
        console.error('Error fetching users:', usersError);
        continue;
      }

      const reminderLabel = REMINDER_LABELS[reminder.reminder_type] || reminder.reminder_type;
      const formattedDate = new Date(meeting.meeting_date).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      });

      // Generate Google Calendar link
      const meetingDateTime = new Date(`${meeting.meeting_date}T${meeting.meeting_time}`);
      const startDate = meetingDateTime.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      const endDateTime = new Date(meetingDateTime.getTime() + 60 * 60 * 1000);
      const endDate = endDateTime.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      const googleCalendarLink = meeting.calendar_link || `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(meeting.title)}&dates=${startDate}/${endDate}&details=${encodeURIComponent(`Meeting: ${meeting.title}\n${meeting.zoom_link ? `Join: ${meeting.zoom_link}` : ''}\n${meeting.location ? `Location: ${meeting.location}` : ''}`)}&location=${encodeURIComponent(meeting.location || meeting.zoom_link || '')}`;

      // Create in-app notifications for all users
      const notifications = (allUsers || []).map(user => ({
        user_id: user.user_id,
        notification_type: 'meeting_reminder',
        title: `Meeting Reminder: ${reminderLabel}`,
        message: `"${meeting.title}" starts in ${reminderLabel}${meeting.zoom_link ? ' - Click to join' : ''}`,
        reference_id: meeting.id,
        is_read: false
      }));

      if (notifications.length > 0) {
        const { error: notificationError } = await supabase
          .from('notifications')
          .insert(notifications);

        if (notificationError) {
          console.error('Error creating notifications:', notificationError);
        } else {
          totalNotificationsSent += notifications.length;
        }
      }

      // Send email notifications
      if (resend && allUsers) {
        const emailPromises = allUsers
          .filter(user => user.email)
          .map(async (user) => {
            try {
              const emailHtml = `
                <!DOCTYPE html>
                <html>
                  <head>
                    <style>
                      body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
                      .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                      .header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0; }
                      .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
                      .meeting-details { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; margin: 20px 0; border-radius: 4px; }
                      .detail-row { display: flex; margin: 10px 0; }
                      .detail-label { font-weight: bold; min-width: 100px; color: #4b5563; }
                      .button { display: inline-block; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 10px 5px; }
                      .zoom-button { background: #2D8CFF; }
                      .calendar-button { background: #4285F4; }
                      .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }
                      .buttons-container { text-align: center; margin: 20px 0; }
                      .countdown { font-size: 24px; font-weight: bold; color: #d97706; text-align: center; margin: 15px 0; }
                    </style>
                  </head>
                  <body>
                    <div class="container">
                      <div class="header">
                        <h1 style="margin: 0; font-size: 24px;">⏰ Meeting Reminder</h1>
                      </div>
                      <div class="content">
                        <p>Hi ${user.display_name || 'there'},</p>
                        <div class="countdown">Starts in ${reminderLabel}!</div>
                        <div class="meeting-details">
                          <div class="detail-row">
                            <span class="detail-label">Title:</span>
                            <span>${meeting.title}</span>
                          </div>
                          <div class="detail-row">
                            <span class="detail-label">Date:</span>
                            <span>${formattedDate}</span>
                          </div>
                          <div class="detail-row">
                            <span class="detail-label">Time:</span>
                            <span>${meeting.meeting_time}</span>
                          </div>
                          ${meeting.location ? `<div class="detail-row">
                            <span class="detail-label">Location:</span>
                            <span>${meeting.location}</span>
                          </div>` : ''}
                          ${meeting.zoom_link ? `<div class="detail-row">
                            <span class="detail-label">Zoom Link:</span>
                            <span><a href="${meeting.zoom_link}">${meeting.zoom_link}</a></span>
                          </div>` : ''}
                        </div>
                        
                        <div class="buttons-container">
                          ${meeting.zoom_link ? `<a href="${meeting.zoom_link}" class="button zoom-button">Join via Zoom</a>` : ''}
                          <a href="${googleCalendarLink}" class="button calendar-button">Add to Calendar</a>
                        </div>
                        
                        <div class="footer">
                          <p>This is an automated reminder from your Family Office platform.</p>
                        </div>
                      </div>
                    </div>
                  </body>
                </html>
              `;

              await resend.emails.send({
                from: `Family Office <${fromEmail}>`,
                to: [user.email],
                subject: `⏰ Reminder: ${meeting.title} in ${reminderLabel}`,
                html: emailHtml,
              });

              console.log(`Reminder email sent to ${user.email}`);
            } catch (emailError) {
              console.error(`Failed to send reminder email to ${user.email}:`, emailError);
            }
          });

        await Promise.all(emailPromises);
      }

      // Mark reminder as sent
      await supabase
        .from('meeting_reminders')
        .update({ sent: true, updated_at: now.toISOString() })
        .eq('id', reminder.id);

      console.log(`Processed reminder ${reminder.id} for meeting ${meeting.title}`);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        remindersSent: dueReminders.length,
        notificationsSent: totalNotificationsSent
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
    console.error('Error in send-meeting-reminders function:', error);
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