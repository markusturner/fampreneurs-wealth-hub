import { Inngest } from 'npm:inngest@3';
import { serve } from 'npm:inngest@3/deno';

const inngest = new Inngest({ id: 'truheirs-markus-knowledge', signingKey: Deno.env.get('INNGEST_SIGNING_KEY') });
const update = inngest.createFunction(
  { id: 'markus-daily-knowledge', retries: 0 },
  { cron: 'TZ=America/Bogota 0 5 * * *' },
  async ({ step }) => {
    const sync = async () => {
      const url = Deno.env.get('SUPABASE_URL');
      const secret = Deno.env.get('MARKUS_KNOWLEDGE_JOB_KEY');
      const publishable = Deno.env.get('SUPABASE_ANON_KEY');
      if (!url || !secret || !publishable) throw new Error('Daily knowledge updates are not configured');
      const response = await fetch(`${url}/functions/v1/markus-knowledge-sync`, { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: publishable, 'X-Markus-Job-Key': secret }, body: JSON.stringify({ action: 'sync' }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || `Knowledge update failed (${response.status})`);
      return data;
    };
    const started = await step.run('start-daily-imports', sync);
    if (!started.success) return started;
    await step.sleep('wait-for-source-imports', '5m');
    return await step.run('collect-daily-imports', sync);
  },
);
const handler = serve({ client: inngest, functions: [update] });
Deno.serve(handler);