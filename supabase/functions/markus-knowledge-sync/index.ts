import { handleMarkusKnowledge, knowledgeCorsHeaders as corsHeaders } from '../_shared/markus-knowledge-sync.ts';

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  return await handleMarkusKnowledge(req, await req.json().catch(() => ({})));
});
