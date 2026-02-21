import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing authorization header');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const dailyApiKey = Deno.env.get('DAILY_API_KEY');

    if (!dailyApiKey) throw new Error('DAILY_API_KEY is not configured');

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify user
    const anonClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } }
    });
    const { data: { user } } = await anonClient.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    // Check admin/owner
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('user_id', user.id)
      .single();

    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    const isOwner = roles?.some(r => r.role === 'owner');
    const isAdmin = profile?.is_admin === true;

    if (!isAdmin && !isOwner) {
      throw new Error('Only owners and admins can create call rooms');
    }

    const { title, description, communityGroupId } = await req.json();

    // Generate unique room name
    const roomName = `room-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Create room on Daily.co
    const dailyResponse = await fetch('https://api.daily.co/v1/rooms', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${dailyApiKey}`,
      },
      body: JSON.stringify({
        name: roomName,
        privacy: 'public', // Anyone with link can join
        properties: {
          enable_screenshare: true,
          enable_chat: true,
          enable_knocking: false,
          start_video_off: false,
          start_audio_off: false,
          enable_recording: 'cloud', // Cloud recording (requires paid plan)
          max_participants: 50,
          exp: Math.floor(Date.now() / 1000) + 86400 * 7, // Room expires in 7 days
        },
      }),
    });

    if (!dailyResponse.ok) {
      const errText = await dailyResponse.text();
      console.error('Daily.co API error:', errText);
      // If cloud recording isn't available, try without it
      const fallbackResponse = await fetch('https://api.daily.co/v1/rooms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${dailyApiKey}`,
        },
        body: JSON.stringify({
          name: roomName,
          privacy: 'public',
          properties: {
            enable_screenshare: true,
            enable_chat: true,
            enable_knocking: false,
            start_video_off: false,
            start_audio_off: false,
            max_participants: 50,
            exp: Math.floor(Date.now() / 1000) + 86400 * 7,
          },
        }),
      });

      if (!fallbackResponse.ok) {
        const fallbackErr = await fallbackResponse.text();
        throw new Error(`Failed to create Daily room: ${fallbackErr}`);
      }

      const fallbackRoom = await fallbackResponse.json();

      const { data: callRoom, error: dbError } = await supabase
        .from('call_rooms')
        .insert({
          title: title || 'Video Call',
          description: description || null,
          room_name: roomName,
          daily_room_url: fallbackRoom.url,
          community_group_id: communityGroupId || null,
          created_by: user.id,
          status: 'waiting',
        })
        .select()
        .single();

      if (dbError) throw dbError;

      return new Response(JSON.stringify({
        success: true,
        room: callRoom,
        dailyUrl: fallbackRoom.url,
        recordingEnabled: false,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const dailyRoom = await dailyResponse.json();

    // Save to database
    const { data: callRoom, error: dbError } = await supabase
      .from('call_rooms')
      .insert({
        title: title || 'Video Call',
        description: description || null,
        room_name: roomName,
        daily_room_url: dailyRoom.url,
        community_group_id: communityGroupId || null,
        created_by: user.id,
        status: 'waiting',
      })
      .select()
      .single();

    if (dbError) throw dbError;

    // Notify all users about the new call
    const { data: allUsers } = await supabase
      .from('profiles')
      .select('user_id')
      .neq('user_id', user.id);

    if (allUsers) {
      const notifications = allUsers.map(u => ({
        user_id: u.user_id,
        sender_id: user.id,
        notification_type: 'call_started',
        title: '📹 Live Call: ' + (title || 'Video Call'),
        message: 'A live call has started. Join now!',
        reference_id: callRoom.id,
      }));

      await supabase.from('notifications').insert(notifications);
    }

    return new Response(JSON.stringify({
      success: true,
      room: callRoom,
      dailyUrl: dailyRoom.url,
      recordingEnabled: true,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Create room error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
