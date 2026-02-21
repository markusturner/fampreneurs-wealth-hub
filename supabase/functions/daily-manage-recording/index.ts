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
    const anonClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } }
    });
    const { data: { user } } = await anonClient.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    const { action, roomName } = await req.json();

    if (action === 'start') {
      const response = await fetch(`https://api.daily.co/v1/rooms/${roomName}/recordings/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${dailyApiKey}`,
        },
      });

      if (!response.ok) {
        const err = await response.text();
        throw new Error(`Failed to start recording: ${err}`);
      }

      // Update call room status
      await supabase
        .from('call_rooms')
        .update({ status: 'active', started_at: new Date().toISOString() })
        .eq('room_name', roomName);

      return new Response(JSON.stringify({ success: true, action: 'recording_started' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'stop') {
      const response = await fetch(`https://api.daily.co/v1/rooms/${roomName}/recordings/stop`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${dailyApiKey}`,
        },
      });

      if (!response.ok) {
        const err = await response.text();
        throw new Error(`Failed to stop recording: ${err}`);
      }

      return new Response(JSON.stringify({ success: true, action: 'recording_stopped' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    throw new Error('Invalid action. Use "start" or "stop"');
  } catch (error) {
    console.error('Recording management error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
