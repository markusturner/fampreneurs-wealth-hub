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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const event = await req.json();
    console.log('Daily webhook event:', event.event);

    // Handle recording.ready-to-download
    if (event.event === 'recording.ready-to-download') {
      const { room_name, download_link, duration, recording_id } = event.payload;

      // Find the call room
      const { data: callRoom } = await supabase
        .from('call_rooms')
        .select('*')
        .eq('room_name', room_name)
        .single();

      if (!callRoom) {
        console.error('Call room not found for:', room_name);
        return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
      }

      // Create recording entry
      const { data: recording, error: recError } = await supabase
        .from('call_recordings')
        .insert({
          call_room_id: callRoom.id,
          recording_url: download_link,
          duration_seconds: Math.round(duration || 0),
          status: 'ready',
          community_group_id: callRoom.community_group_id,
          recorded_by: callRoom.created_by,
        })
        .select()
        .single();

      if (recError) {
        console.error('Error creating recording:', recError);
        throw recError;
      }

      // Notify the creator that recording is ready
      await supabase.from('notifications').insert({
        user_id: callRoom.created_by,
        notification_type: 'recording_ready',
        title: '📹 Recording Ready',
        message: `Recording for "${callRoom.title}" is ready. Click to post it to the community. Expires in 14 days.`,
        reference_id: recording.id,
      });

      // Also notify all participants
      const { data: participants } = await supabase
        .from('call_participants')
        .select('user_id')
        .eq('call_room_id', callRoom.id)
        .neq('user_id', callRoom.created_by);

      if (participants) {
        const notifications = participants.map(p => ({
          user_id: p.user_id,
          notification_type: 'recording_available',
          title: '📹 Call Recording Available',
          message: `Recording for "${callRoom.title}" is now available. Expires in 14 days.`,
          reference_id: recording.id,
        }));

        await supabase.from('notifications').insert(notifications);
      }

      // Now request transcription via Lovable AI
      try {
        const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
        if (lovableApiKey) {
          // We'll generate a summary using AI based on the call title/description
          const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${lovableApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'google/gemini-3-flash-preview',
              messages: [
                {
                  role: 'system',
                  content: 'Generate a brief summary for a recorded video call. Keep it professional and concise, 2-3 sentences.'
                },
                {
                  role: 'user',
                  content: `Call title: "${callRoom.title}". Description: "${callRoom.description || 'No description'}". Duration: ${Math.round((duration || 0) / 60)} minutes.`
                }
              ],
            }),
          });

          if (aiResponse.ok) {
            const aiData = await aiResponse.json();
            const summary = aiData.choices?.[0]?.message?.content;

            if (summary) {
              await supabase
                .from('call_recordings')
                .update({ summary })
                .eq('id', recording.id);
            }
          }
        }
      } catch (aiError) {
        console.error('AI summary error (non-fatal):', aiError);
      }
    }

    // Handle meeting ended
    if (event.event === 'meeting.ended') {
      const { room_name } = event.payload;

      await supabase
        .from('call_rooms')
        .update({ status: 'ended', ended_at: new Date().toISOString() })
        .eq('room_name', room_name);
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
