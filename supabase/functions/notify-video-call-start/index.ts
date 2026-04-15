import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotifyVideoCallRequest {
  callId: string;
  roomName: string;
  createdBy: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { callId, roomName, createdBy }: NotifyVideoCallRequest = await req.json();

    console.log('Processing video call notification request:', { callId, roomName, createdBy });

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

    const { data: allUsers, error: usersError } = await supabase
      .from('profiles')
      .select('user_id')
      .neq('user_id', createdBy);

    if (usersError) {
      console.error('Error fetching users:', usersError);
      throw usersError;
    }

    console.log(`Found ${allUsers?.length || 0} users to notify`);

    const notifications = (allUsers || []).map(user => ({
      user_id: user.user_id,
      sender_id: createdBy,
      notification_type: 'video_call_started',
      title: 'Live Video Call',
      message: `${creatorName} started a video call. Join now!`,
      reference_id: callId,
      is_read: false,
      link: '/community'
    }));

    if (notifications.length > 0) {
      const { error: notificationError } = await supabase
        .from('notifications')
        .insert(notifications);

      if (notificationError) {
        console.error('Error creating notifications:', notificationError);
        throw notificationError;
      }

      console.log(`notification_created: type=video_call_started count=${notifications.length} ref=${callId}`);
    }

    return new Response(
      JSON.stringify({ success: true, notificationsSent: notifications.length, creatorName }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );

  } catch (error: any) {
    console.error('Error in notify-video-call-start function:', error);
    return new Response(
      JSON.stringify({ error: error.message, success: false }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
};

serve(handler);
