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

    // Find expired recordings
    const { data: expired, error } = await supabase
      .from('call_recordings')
      .select('id, storage_path')
      .lt('expires_at', new Date().toISOString())
      .neq('status', 'expired');

    if (error) throw error;

    let cleaned = 0;

    for (const recording of (expired || [])) {
      // Delete from storage if exists
      if (recording.storage_path) {
        await supabase.storage
          .from('call-recordings')
          .remove([recording.storage_path]);
      }

      // Mark as expired
      await supabase
        .from('call_recordings')
        .update({ status: 'expired', recording_url: null })
        .eq('id', recording.id);

      cleaned++;
    }

    console.log(`Cleaned up ${cleaned} expired recordings`);

    return new Response(JSON.stringify({ success: true, cleaned }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Cleanup error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
