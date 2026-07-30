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
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY is not configured');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Not signed in' }), {
        status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }
    const { data: { user } } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (!user) {
      return new Response(JSON.stringify({ error: 'Invalid session' }), {
        status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }
    const [{ data: isAdmin }, { data: isOwner }] = await Promise.all([
      supabase.rpc('has_role', { _user_id: user.id, _role: 'admin' }),
      supabase.rpc('has_role', { _user_id: user.id, _role: 'owner' }),
    ]);
    if (!isAdmin && !isOwner) {
      return new Response(JSON.stringify({ error: 'Admins only' }), {
        status: 403, headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const { surveyId } = await req.json();
    if (!surveyId) throw new Error('surveyId is required');

    const { data: questions } = await supabase
      .from('survey_questions')
      .select('id, question_text, question_type, position')
      .eq('survey_id', surveyId)
      .order('position');

    const { data: submissions } = await supabase
      .from('survey_submissions')
      .select('id')
      .eq('survey_id', surveyId)
      .order('submitted_at', { ascending: false })
      .limit(300);

    const ids = (submissions || []).map((s: { id: string }) => s.id);
    if (ids.length === 0) {
      return new Response(JSON.stringify({ insights: 'No submissions yet.' }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const { data: answers } = await supabase
      .from('survey_answers')
      .select('question_id, answer_text, answer_number')
      .in('submission_id', ids);

    const qMap = new Map((questions || []).map((q: any) => [q.id, q]));
    const lines: string[] = [];
    for (const a of answers || []) {
      const q = qMap.get(a.question_id);
      if (!q) continue;
      const value = a.answer_text ?? (a.answer_number !== null ? String(a.answer_number) : '');
      if (!value) continue;
      lines.push(`Q: ${q.question_text}\nA: ${value}`);
    }

    const prompt = `You are reviewing ${ids.length} survey submissions from members of a family wealth coaching platform.

Answers:
${lines.slice(0, 600).join('\n')}

Write a short report in markdown at a 7th grade reading level with exactly these sections:
### Biggest Problem
One clear sentence naming the single biggest problem, then 2-3 bullets of proof from the answers.
### Best Thing About The Platform
One clear sentence naming what members love most, then 2-3 bullets of proof.
### What To Do Next
3 short action bullets.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`AI gateway failed [${response.status}]: ${errorBody}`);
      return new Response(
        JSON.stringify({ error: 'AI request failed', status: response.status, details: errorBody }),
        { status: response.status, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    const data = await response.json();
    const insights = data.choices?.[0]?.message?.content ?? 'No insights returned.';

    return new Response(JSON.stringify({ insights, submissionCount: ids.length }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  } catch (error) {
    console.error('analyze-survey-results error:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
});
