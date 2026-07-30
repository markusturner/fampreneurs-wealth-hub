import { createClient } from "https://esm.sh/@supabase/supabase-js@2.51.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: survey, error: surveyError } = await supabase
      .from('surveys')
      .select('id, title')
      .eq('is_weekly', true)
      .eq('is_active', true)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (surveyError) throw surveyError;
    if (!survey) {
      return new Response(JSON.stringify({ success: true, message: 'No active weekly survey' }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('user_id')
      .not('user_id', 'is', null);

    if (profilesError) throw profilesError;

    const notifications = (profiles || []).map((p: { user_id: string }) => ({
      user_id: p.user_id,
      notification_type: 'weekly_survey',
      title: 'Weekly Check-In Survey',
      message: 'Your weekly check-in is ready. It only takes 5 minutes.',
      reference_id: survey.id,
      is_read: false,
      link: '/surveys',
    }));

    if (notifications.length > 0) {
      const { error: insertError } = await supabase.from('notifications').insert(notifications);
      if (insertError) throw insertError;
    }

    console.log(`weekly_survey_sent: recipients=${notifications.length} survey=${survey.id}`);

    return new Response(
      JSON.stringify({ success: true, recipients: notifications.length, surveyId: survey.id }),
      { headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  } catch (error) {
    console.error('send-weekly-survey error:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
});
