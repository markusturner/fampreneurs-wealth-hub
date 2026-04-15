import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.51.0";

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
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify admin authorization
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: isAdmin, error: roleError } = await supabase.rpc('has_role', {
      _user_id: user.id,
      _role: 'admin'
    });

    if (roleError || !isAdmin) {
      return new Response(
        JSON.stringify({ error: 'Insufficient permissions - admin required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Starting tutorial reminder notification process...');

    // Optional: accept specific user_ids to target, otherwise send to all
    const body = await req.json().catch(() => ({}));
    const targetUserIds: string[] | null = body.user_ids || null;

    let query = supabase
      .from('profiles')
      .select('user_id, display_name')
      .not('user_id', 'is', null);

    if (targetUserIds && targetUserIds.length > 0) {
      query = query.in('user_id', targetUserIds);
    }

    const { data: profiles, error: profilesError } = await query;

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      throw profilesError;
    }

    console.log(`Found ${profiles?.length || 0} profiles to notify`);

    let notificationsSent = 0;

    for (const profile of profiles || []) {
      const { error: notifError } = await supabase
        .from('notifications')
        .insert({
          user_id: profile.user_id,
          sender_id: user.id,
          notification_type: 'tutorial_reminder',
          title: 'Watch Your Tutorial Video',
          message: 'Complete your tutorial video to get the most out of TruHeirs.',
          is_read: false,
          link: '/tutorial-videos'
        });

      if (notifError) {
        console.error(`Failed to create tutorial notification for user ${profile.user_id}:`, notifError);
        continue;
      }

      console.log(`notification_created: type=tutorial_reminder recipient=${profile.user_id}`);
      notificationsSent++;
    }

    const result = {
      success: true,
      usersProcessed: profiles?.length || 0,
      notificationsSent,
      timestamp: new Date().toISOString()
    };

    console.log('Tutorial reminder process completed:', result);

    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });

  } catch (error) {
    console.error('Error in send-tutorial-reminder function:', error);
    return new Response(
      JSON.stringify({ error: error.message, timestamp: new Date().toISOString() }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
});
