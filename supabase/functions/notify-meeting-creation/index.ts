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
  zoomLink?: string;
  calendarLink?: string;
  location?: string;
}

// Reminder intervals in milliseconds before the meeting
const REMINDER_INTERVALS = [
  { type: '30_days', ms: 30 * 24 * 60 * 60 * 1000, label: '30 days' },
  { type: '7_days', ms: 7 * 24 * 60 * 60 * 1000, label: '7 days' },
  { type: '2_days', ms: 2 * 24 * 60 * 60 * 1000, label: '2 days' },
  { type: '24_hours', ms: 24 * 60 * 60 * 1000, label: '24 hours' },
  { type: '12_hours', ms: 12 * 60 * 60 * 1000, label: '12 hours' },
  { type: '2_hours', ms: 2 * 60 * 60 * 1000, label: '2 hours' },
  { type: '5_minutes', ms: 5 * 60 * 1000, label: '5 minutes' },
];

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

    const { meetingId, meetingTitle, meetingDate, meetingTime, createdBy, zoomLink, calendarLink, location }: NotifyMeetingRequest = await req.json();

    console.log('Processing meeting notification request:', { meetingId, meetingTitle, meetingDate, meetingTime, createdBy, zoomLink });

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

    // Get all users (including creator for reminders)
    const { data: allUsers, error: usersError } = await supabase
      .from('profiles')
      .select('user_id, email, display_name');

    if (usersError) {
      console.error('Error fetching users:', usersError);
      throw usersError;
    }

    console.log(`Found ${allUsers?.length || 0} users to notify`);

    // Calculate meeting datetime
    const meetingDateTime = new Date(`${meetingDate}T${meetingTime}`);
    const now = new Date();

    // Create scheduled reminders for all intervals
    const reminders = REMINDER_INTERVALS
      .map(interval => {
        const scheduledFor = new Date(meetingDateTime.getTime() - interval.ms);
        // Only create reminder if it's in the future
        if (scheduledFor > now) {
          return {
            meeting_id: meetingId,
            reminder_type: interval.type,
            scheduled_for: scheduledFor.toISOString(),
            sent: false
          };
        }
        return null;
      })
      .filter(Boolean);

    if (reminders.length > 0) {
      const { error: reminderError } = await supabase
        .from('meeting_reminders')
        .insert(reminders);

      if (reminderError) {
        console.error('Error creating reminders:', reminderError);
      } else {
        console.log(`Created ${reminders.length} scheduled reminders`);
      }
    }

    // Format the date and time for display
    const formattedDate = new Date(meetingDate).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });

    // Generate Google Calendar link
    const startDate = meetingDateTime.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const endDateTime = new Date(meetingDateTime.getTime() + 60 * 60 * 1000); // 1 hour default
    const endDate = endDateTime.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const googleCalendarLink = calendarLink || `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(meetingTitle)}&dates=${startDate}/${endDate}&details=${encodeURIComponent(`Meeting: ${meetingTitle}\n${zoomLink ? `Join: ${zoomLink}` : ''}\n${location ? `Location: ${location}` : ''}`)}&location=${encodeURIComponent(location || zoomLink || '')}`;

    // Create notifications for all users except creator
    const usersToNotify = (allUsers || []).filter(u => u.user_id !== createdBy);
    const notifications = usersToNotify.map(user => ({
      user_id: user.user_id,
      sender_id: createdBy,
      notification_type: 'message',
      title: 'New Meeting Scheduled',
      message: `${creatorName} scheduled "${meetingTitle}" for ${formattedDate} at ${meetingTime}${zoomLink ? ' - Click to join via Zoom' : ''}`,
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
      const emailPromises = usersToNotify.map(async (user) => {
        try {
          if (!user.email) return;

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
                  .button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 10px 5px; }
                  .zoom-button { background: #2D8CFF; }
                  .calendar-button { background: #4285F4; }
                  .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }
                  .buttons-container { text-align: center; margin: 20px 0; }
                </style>
              </head>
              <body>
                <div class="container">
                  <div class="header">
                    <h1 style="margin: 0; font-size: 24px;">📅 New Meeting Scheduled</h1>
                  </div>
                  <div class="content">
                    <p>Hi ${user.display_name || 'there'},</p>
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
                      ${location ? `<div class="detail-row">
                        <span class="detail-label">Location:</span>
                        <span>${location}</span>
                      </div>` : ''}
                      ${zoomLink ? `<div class="detail-row">
                        <span class="detail-label">Zoom Link:</span>
                        <span><a href="${zoomLink}">${zoomLink}</a></span>
                      </div>` : ''}
                    </div>
                    
                    <div class="buttons-container">
                      ${zoomLink ? `<a href="${zoomLink}" class="button zoom-button">Join via Zoom</a>` : ''}
                      <a href="${googleCalendarLink}" class="button calendar-button">Add to Calendar</a>
                    </div>
                    
                    <p style="font-size: 14px; color: #6b7280;">You will receive reminders at: 30 days, 7 days, 2 days, 24 hours, 12 hours, 2 hours, and 5 minutes before the meeting.</p>
                    
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
            to: [user.email],
            subject: `New Meeting: ${meetingTitle} - ${formattedDate}`,
            html: emailHtml,
          });

          console.log(`Meeting email sent to ${user.email}`);
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
        reminderCount: reminders.length,
        creatorName,
        calendarLink: googleCalendarLink
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