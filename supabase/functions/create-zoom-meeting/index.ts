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
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    const { title, description, startDateTime, duration = 60 } = await req.json();

    // Get user's Zoom integration
    const { data: integration, error: integrationError } = await supabase
      .from('calendar_integrations')
      .select('*')
      .eq('user_id', user.id)
      .eq('provider', 'zoom')
      .eq('is_active', true)
      .single();

    if (integrationError || !integration) {
      throw new Error('Zoom not connected');
    }

    // Check if token needs refresh
    let accessToken = integration.access_token;
    if (new Date(integration.token_expires_at) < new Date()) {
      const clientId = Deno.env.get('ZOOM_CLIENT_ID');
      const clientSecret = Deno.env.get('ZOOM_CLIENT_SECRET');
      const credentials = btoa(`${clientId}:${clientSecret}`);

      const refreshResponse = await fetch('https://zoom.us/oauth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${credentials}`,
        },
        body: new URLSearchParams({
          refresh_token: integration.refresh_token,
          grant_type: 'refresh_token',
        }),
      });

      const newTokens = await refreshResponse.json();
      accessToken = newTokens.access_token;

      await supabase
        .from('calendar_integrations')
        .update({
          access_token: newTokens.access_token,
          token_expires_at: new Date(Date.now() + newTokens.expires_in * 1000).toISOString(),
        })
        .eq('id', integration.id);
    }

    // Create Zoom meeting
    const meeting = {
      topic: title,
      type: 2, // Scheduled meeting
      start_time: startDateTime,
      duration: duration,
      agenda: description || '',
      settings: {
        host_video: true,
        participant_video: true,
        join_before_host: false,
        mute_upon_entry: true,
        waiting_room: true,
        audio: 'voip',
      },
    };

    const meetingResponse = await fetch('https://api.zoom.us/v2/users/me/meetings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(meeting),
    });

    if (!meetingResponse.ok) {
      const error = await meetingResponse.text();
      throw new Error(`Failed to create Zoom meeting: ${error}`);
    }

    const zoomMeeting = await meetingResponse.json();

    return new Response(JSON.stringify({ 
      success: true, 
      meetingId: zoomMeeting.id,
      meetingUrl: zoomMeeting.join_url,
      password: zoomMeeting.password,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Create Zoom meeting error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});