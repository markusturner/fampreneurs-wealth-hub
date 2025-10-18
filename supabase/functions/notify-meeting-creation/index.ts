import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

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
