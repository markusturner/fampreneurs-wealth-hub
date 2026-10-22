import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' };
const RECORDER = 'markusturner94@gmail.com';

// Teaching calls only: title starts with the program name (client-prefixed sales calls like "Name: The Trust Vault" are skipped).
export function isTrustVaultRecording(title: string): boolean {
  const t = title.trim().toLowerCase();
  return t.startsWith('the trust vault') || t.startsWith('trust vault') || t.startsWith('the family vault');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } });
  try {
    const key = Deno.env.get('FATHOM_API_KEY');
    if (!key) return json({ error: 'Fathom not configured' }, 500);
    const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: owner } = await db.from('user_roles').select('user_id').eq('role', 'owner').limit(1).maybeSingle();
    if (!owner) return json({ error: 'No owner' }, 500);
    const { data: done } = await db.from('fathom_community_posts').select('recording_id');
    const seen = new Set((done ?? []).map((r) => r.recording_id));
    let cursor: string | undefined; let pages = 0; const posted: string[] = [];
    do {
      const url = new URL('https://api.fathom.ai/external/v1/meetings');
      url.searchParams.set('limit', '100');
      url.searchParams.append('recorded_by[]', RECORDER);
      if (cursor) url.searchParams.set('cursor', cursor);
      const res = await fetch(url, { headers: { 'X-Api-Key': key } });
      if (!res.ok) return json({ error: 'Fathom error', status: res.status }, 502);
      const page = await res.json();
      for (const m of page.items ?? []) {
        const title = String(m.meeting_title || m.title || '');
        const id = String(m.recording_id ?? '');
        if (!id || seen.has(id) || !isTrustVaultRecording(title)) continue;
        if (String(m.recorded_by?.email || '').toLowerCase() !== RECORDER) continue;
        const when = m.recording_start_time || m.created_at || new Date().toISOString();
        const link = m.share_url || m.url;
        const date = new Date(when).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'America/New_York' });
        const { data: post, error } = await db.from('community_posts').insert({
          user_id: owner.user_id, program: 'tfv', category: 'discussion', title: `${title} Recording - ${date}`,
          content: `Here is the recording from our ${title} call on ${date}.\n\nWatch it here: ${link}`,
          video_url: link, created_at: when,
        }).select('id').single();
        if (error) throw error;
        await db.from('fathom_community_posts').insert({ recording_id: id, post_id: post.id, program: 'tfv' });
        seen.add(id); posted.push(title);
      }
      cursor = page.next_cursor ?? undefined;
    } while (cursor && ++pages < 30);
    return json({ posted: posted.length, titles: posted });
  } catch (e) {
    console.error(e);
    return json({ error: (e as Error).message }, 500);
  }
});
