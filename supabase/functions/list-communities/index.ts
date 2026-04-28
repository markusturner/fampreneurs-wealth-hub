import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const expected = Deno.env.get('EXTERNAL_API_KEY');
    if (!expected) {
      return new Response(JSON.stringify({ error: 'Server misconfigured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const provided = req.headers.get('x-api-key') ?? req.headers.get('X-API-Key');
    if (!provided || provided !== expected) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: groups, error: gErr } = await supabase
      .from('community_groups')
      .select('id, name, description')
      .order('name', { ascending: true });

    if (gErr) throw gErr;

    const { data: memberships, error: mErr } = await supabase
      .from('group_memberships')
      .select('group_id');

    if (mErr) throw mErr;

    const counts = new Map<string, number>();
    for (const m of memberships ?? []) {
      counts.set(m.group_id, (counts.get(m.group_id) ?? 0) + 1);
    }

    const result = (groups ?? []).map((g) => ({
      id: g.id,
      name: g.name,
      description: g.description,
      member_count: counts.get(g.id) ?? 0,
    }));

    return new Response(JSON.stringify({ communities: result }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('list-communities error:', err);
    return new Response(JSON.stringify({ error: err.message ?? 'Internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
