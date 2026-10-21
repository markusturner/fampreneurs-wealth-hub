import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.51.0';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';
import { actorFor, normalizeSocial, availableAt, approvedTeachingMeeting, SOURCE_LIMIT, DAILY_CHARGE_USD, DAY_MS } from '../_shared/markus-knowledge.ts';

class ProviderError extends Error { constructor(public status: number, message: string) { super(message); } }
const headers = { ...corsHeaders, 'Content-Type': 'application/json' };
const output = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers });

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) return output({ error: 'Server connection is not configured' }, 500);
  const db = createClient(url, key);
  let leased = false;
  try {
    const body = z.object({ action: z.enum(['sync', 'status', 'resume', 'review']).default('sync'), document_id: z.string().uuid().optional(), content: z.string().min(1).max(150000).optional(), status: z.enum(['approved', 'excluded']).optional() }).strict().safeParse(await req.json().catch(() => ({})));
    if (!body.success) return output({ error: 'Invalid update request' }, 400);
    const scheduler = req.headers.get('X-Markus-Job-Key');
    const scheduled = !!scheduler && scheduler === Deno.env.get('MARKUS_KNOWLEDGE_JOB_KEY');
    let caller: string | undefined;
    let owner = false;
    if (!scheduled) {
      const token = req.headers.get('Authorization')?.replace(/^Bearer /, '') || '';
      const { data, error } = await db.auth.getUser(token);
      if (error || !data.user) return output({ error: 'Please sign in to manage Markus AI knowledge' }, 401);
      caller = data.user.id;
      const roles = await db.from('user_roles').select('role').eq('user_id', caller);
      owner = (roles.data || []).some(r => r.role === 'owner');
      if (!owner && !(roles.data || []).some(r => r.role === 'admin')) return output({ error: 'Admin access is required' }, 403);
    }
    const action = body.data.action;
    if (scheduled && action !== 'sync') return output({ error: 'Scheduled jobs can only update knowledge' }, 403);
    if (action === 'status') {
      const [sources, documents, job] = await Promise.all([
        db.from('markus_knowledge_sources').select('*').order('platform'),
        db.from('markus_knowledge_documents').select('id,title,source_url,status,published_at,observed_at,content').order('observed_at', { ascending: false }).limit(30),
        db.from('markus_knowledge_job').select('*').single(),
      ]);
      for (const result of [sources, documents, job]) if (result.error) throw result.error;
      return output({ sources: sources.data, documents: documents.data, job: job.data });
    }
    if (action === 'resume') {
      if (!owner) return output({ error: 'Only the owner can resume imports' }, 403);
      const result = await db.from('markus_knowledge_job').update({ paused: false, pause_reason: null }).eq('id', true);
      if (result.error) throw result.error;
      return output({ success: true });
    }
    if (action === 'review') {
      if (!owner || !body.data.document_id || !body.data.status) return output({ error: 'Owner approval and a document are required' }, 403);
      if (body.data.status === 'approved' && !body.data.content) return output({ error: 'Provide teaching notes with private client details removed' }, 400);
      const result = await db.from('markus_knowledge_documents').update({ status: body.data.status, ...(body.data.content ? { content: body.data.content } : {}), approved_by: caller }).eq('id', body.data.document_id).eq('status', 'review').select('id');
      if (result.error) throw result.error;
      if (!result.data?.length) return output({ error: 'This recording is no longer waiting for review' }, 409);
      return output({ success: true });
    }
    const lease = await db.rpc('acquire_markus_knowledge_lease');
    if (lease.error) throw lease.error;
    if (!lease.data) return output({ success: false, message: 'Imports are paused or an update is already running' });
    leased = true;
    const sources = await db.from('markus_knowledge_sources').select('*').eq('enabled', true).order('platform');
    if (sources.error) throw sources.error;
    const results: Array<Record<string, unknown>> = [];
    const gatewayKey = Deno.env.get('LOVABLE_API_KEY');
    const apifyKey = Deno.env.get('APIFY_API_KEY');
    async function provider(path: string, init: RequestInit = {}) {
      if (!gatewayKey || !apifyKey) throw new ProviderError(401, 'Apify access is not configured');
      const res = await fetch(`https://connector-gateway.lovable.dev/apify${path}`, { ...init, headers: { Authorization: `Bearer ${gatewayKey}`, 'X-Connection-Api-Key': apifyKey, 'Content-Type': 'application/json' } });
      if (!res.ok) {
        const detail = await res.text();
        let message = detail;
        try { const parsed = JSON.parse(detail); message = parsed.error?.message || parsed.message || detail; } catch { /* preserve provider text */ }
        throw new ProviderError(res.status, message.slice(0, 500));
      }
      return await res.json();
    }
    async function save(sourceId: string, document: Record<string, unknown>) {
      const result = await db.from('markus_knowledge_documents').upsert({ source_id: sourceId, ...document }, { onConflict: 'source_id,external_id', ignoreDuplicates: true });
      if (result.error) throw result.error;
    }
    for (const source of sources.data || []) {
      try {
        const now = new Date().toISOString();
        const config = source.config as Record<string, any>;
        if (source.platform === 'fathom') {
          if (source.last_success_at && Date.now() - Date.parse(source.last_success_at) < DAY_MS - 3600000) continue;
          const fathomKey = Deno.env.get('FATHOM_API_KEY');
          if (!fathomKey) throw new ProviderError(401, 'Fathom access is not configured');
          const endpoint = new URL('https://api.fathom.ai/external/v1/meetings');
          endpoint.searchParams.append('recorded_by[]', config.recorder_email);
          endpoint.searchParams.set('created_after', source.last_success_at || new Date(Date.now() - 7 * DAY_MS).toISOString());
          if (config.cursor) endpoint.searchParams.set('cursor', config.cursor);
          const response = await fetch(endpoint, { headers: { 'X-Api-Key': fathomKey } });
          if (!response.ok) throw new ProviderError(response.status, (await response.text()).slice(0, 500));
          const page = await response.json();
          let count = 0;
          for (const meeting of page.items || []) {
            if (count >= SOURCE_LIMIT || !approvedTeachingMeeting(meeting, config)) continue;
            const recordingId = String(meeting.recording_id || '');
            if (!/^\d+$/.test(recordingId)) continue;
            const existing = await db.from('markus_knowledge_documents').select('id').eq('source_id', source.id).eq('external_id', recordingId).maybeSingle();
            if (existing.error) throw existing.error;
            if (existing.data) continue;
            const transcript = await fetch(`https://api.fathom.ai/external/v1/recordings/${recordingId}/transcript`, { headers: { 'X-Api-Key': fathomKey } });
            if (!transcript.ok) throw new ProviderError(transcript.status, (await transcript.text()).slice(0, 500));
            const data = await transcript.json();
            const content = (data.transcript || []).map((segment: any) => String(segment.text || '')).join('\n').trim();
            if (!content) continue;
            const published = meeting.recording_start_time || meeting.created_at || null;
            await save(source.id, { external_id: recordingId, title: meeting.meeting_title || meeting.title, source_url: meeting.share_url || meeting.url || 'https://fathom.video', published_at: published, observed_at: now, available_at: availableAt(published, now), content: content.slice(0, 150000), status: 'review' });
            count++;
          }
          const update = await db.from('markus_knowledge_sources').update({ config: { ...config, cursor: page.next_cursor || null }, last_success_at: page.next_cursor ? source.last_success_at : now, last_error: null }).eq('id', source.id);
          if (update.error) throw update.error;
          results.push({ platform: 'fathom', awaiting_review: count });
          continue;
        }
        if (source.run_id) {
          const run = (await provider(`/actor-runs/${source.run_id}`)).data;
          if (run.status === 'SUCCEEDED') {
            const items = await provider(`/datasets/${run.defaultDatasetId}/items?limit=${SOURCE_LIMIT}&clean=true`);
            let imported = 0;
            for (const item of items) {
              const normalized = normalizeSocial(source.platform, item, now);
              if (!normalized || (normalized.owner && String(normalized.owner).toLowerCase() !== String(config.handle).toLowerCase())) continue;
              const { owner: _owner, ...document } = normalized;
              await save(source.id, { ...document, status: 'approved' });
              imported++;
            }
            const result = await db.from('markus_knowledge_sources').update({ run_id: null, dataset_id: null, last_success_at: now, last_error: imported ? null : 'No usable owner text was returned. Missing transcripts were not added.' }).eq('id', source.id);
            if (result.error) throw result.error;
            results.push({ platform: source.platform, imported });
          } else if (['FAILED', 'TIMED-OUT', 'ABORTED'].includes(run.status)) {
            await db.from('markus_knowledge_sources').update({ run_id: null, last_error: run.statusMessage || `Import ${run.status.toLowerCase()}` }).eq('id', source.id);
          } else results.push({ platform: source.platform, status: run.status });
          continue;
        }
        if (source.last_started_at && Date.now() - Date.parse(source.last_started_at) < DAY_MS - 3600000) continue;
        const actor = actorFor(source.platform, source.profile_url, config);
        const run = (await provider(`/acts/${actor.id}/runs?maxTotalChargeUsd=${DAILY_CHARGE_USD}`, { method: 'POST', body: JSON.stringify(actor.input) })).data;
        const result = await db.from('markus_knowledge_sources').update({ run_id: run.id, dataset_id: run.defaultDatasetId, last_started_at: now, last_error: null }).eq('id', source.id);
        if (result.error) throw result.error;
        results.push({ platform: source.platform, status: run.status });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        await db.from('markus_knowledge_sources').update({ last_error: message }).eq('id', source.id);
        if (error instanceof ProviderError && [401, 402, 403, 429].includes(error.status)) {
          await db.from('markus_knowledge_job').update({ paused: true, pause_reason: message }).eq('id', true);
          throw error;
        }
        results.push({ platform: source.platform, error: message });
      }
    }
    return output({ success: true, results });
  } catch (error) {
    return output({ error: error instanceof Error ? error.message : String(error) }, error instanceof ProviderError ? error.status : 500);
  } finally {
    if (leased) await db.from('markus_knowledge_job').update({ lease_until: null }).eq('id', true);
  }
});