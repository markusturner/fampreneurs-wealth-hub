import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.51.0';
const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-markus-job-key, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version' };
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';
import { actorFor, normalizeSocial, availableAt, fathomCallKind, driveFolderId, cleanList, DRIVE_EXPORTS, DRIVE_TEXT_TYPES, SOURCE_LIMIT, DAILY_CHARGE_USD, BACKFILL_CHARGE_USD, YOUTUBE_BACKFILL_LIMIT, FATHOM_RUN_LIMIT, FATHOM_HISTORY_DAYS, DRIVE_RUN_LIMIT, DAY_MS } from './markus-knowledge.ts';

class ProviderError extends Error { constructor(public status: number, message: string) { super(message); } }
const headers = { ...corsHeaders, 'Content-Type': 'application/json' };
const output = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers });
const DRIVE_URL = 'https://connector-gateway.lovable.dev/google_drive/drive/v3';

// Turns a call transcript into teaching notes with private details removed, ready for the owner to review.
async function teachingNotes(transcript: string, title: string, kind: 'teaching' | 'sales'): Promise<string | null> {
  const key = Deno.env.get('LOVABLE_API_KEY');
  if (!key) return null;
  const instructions = `You turn a recorded ${kind === 'sales' ? 'sales call' : 'coaching call'} led by Markus Turner into teaching notes for Markus AI, a digital clone of Markus that answers members' questions.
Remove every private detail: names of anyone other than Markus, emails, phone numbers, addresses, exact dollar amounts tied to a person, account numbers, company names of clients, health or family specifics that could identify someone. Replace them with general words like "a client" or "a family".
Write the notes as question and answer pairs. Each question is something a family asked or worried about. Each answer explains how Markus answered, in his words and teaching style, as clearly as possible. Then add a short "Key teaching points" list.${kind === 'sales' ? ' Leave out pricing negotiation and personal buying decisions. Keep only the questions and objections families raise and how Markus explains trusts, asset protection and his approach.' : ''}
Use plain text with simple headings. No emojis and no long dashes. If the call has no teaching content, reply with exactly: NO TEACHING CONTENT`;
  try {
    const res = await fetch('https://ai.gateway.lovable.dev/v1/responses', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'openai/gpt-6-astra', reasoning: { effort: 'low' }, instructions, input: `Call name: ${title}\n\nTranscript:\n${transcript.slice(0, 120000)}` }),
    });
    if (!res.ok) { console.error('Teaching notes failed', res.status, (await res.text()).slice(0, 500)); return null; }
    const data = await res.json();
    const text = typeof data.output_text === 'string' ? data.output_text : (data.output || []).flatMap((o: any) => o.content || []).filter((c: any) => c.type === 'output_text').map((c: any) => c.text).join('\n');
    return text?.trim() || null;
  } catch (error) { console.error('Teaching notes failed', error); return null; }
}

// Shared knowledge handler. It runs inside ai-chat (mode "knowledge") because new functions are not reachable on this project.
// `scheduled` is only set by trusted server code (the job key header or ai-chat's daily background refresh).
export async function handleMarkusKnowledge(req: Request, rawBody: unknown, trustedSchedule = false): Promise<Response> {
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) return output({ error: 'Server connection is not configured' }, 500);
  const db = createClient(url, key);
  let leased = false;
  try {
    const body = z.object({ action: z.enum(['sync', 'status', 'resume', 'review', 'configure']).default('sync'), document_id: z.string().uuid().optional(), content: z.string().min(1).max(150000).optional(), status: z.enum(['approved', 'excluded']).optional(), privacy_confirmed: z.boolean().optional(), teaching_titles: z.array(z.string().max(200)).max(50).optional(), sales_titles: z.array(z.string().max(200)).max(50).optional(), drive_folders: z.array(z.string().max(500)).max(30).optional() }).strict().safeParse(rawBody ?? {});
    if (!body.success) return output({ error: 'Invalid update request' }, 400);
    const scheduler = req.headers.get('X-Markus-Job-Key');
    const jobKey = Deno.env.get('MARKUS_KNOWLEDGE_JOB_KEY');
    const scheduled = trustedSchedule || (!!scheduler && !!jobKey && scheduler === jobKey);
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
        db.from('markus_knowledge_documents').select('id,title,source_url,status,published_at,observed_at,content').order('observed_at', { ascending: false }).limit(60),
        db.from('markus_knowledge_job').select('*').single(),
      ]);
      for (const result of [sources, documents, job]) if (result.error) throw result.error;
      const counts = await db.from('markus_knowledge_documents').select('source_id,status');
      const totals: Record<string, { approved: number; review: number }> = {};
      for (const row of counts.data || []) {
        const t = totals[row.source_id] ||= { approved: 0, review: 0 };
        if (row.status === 'approved') t.approved++; else if (row.status === 'review') t.review++;
      }
      return output({ sources: sources.data, documents: documents.data, job: job.data, totals });
    }
    if (action === 'configure') {
      if (!owner) return output({ error: 'Only the owner can change what Markus learns from' }, 403);
      const all = await db.from('markus_knowledge_sources').select('*').in('platform', ['fathom', 'google_drive']);
      if (all.error) throw all.error;
      const fathom = all.data?.find(s => s.platform === 'fathom');
      const drive = all.data?.find(s => s.platform === 'google_drive');
      if (fathom && (body.data.teaching_titles || body.data.sales_titles)) {
        const config = fathom.config as Record<string, any>;
        const titles = body.data.teaching_titles ? cleanList(body.data.teaching_titles) : cleanList(config.titles);
        const sales = body.data.sales_titles ? cleanList(body.data.sales_titles).filter(t => t.length >= 3) : cleanList(config.sales_titles);
        const changed = JSON.stringify(titles) !== JSON.stringify(cleanList(config.titles)) || JSON.stringify(sales) !== JSON.stringify(cleanList(config.sales_titles));
        // New call names look back through older recordings once.
        const next = { ...config, titles, sales_titles: sales, ...(changed ? { cursor: null, since: new Date(Date.now() - FATHOM_HISTORY_DAYS * DAY_MS).toISOString() } : {}) };
        const result = await db.from('markus_knowledge_sources').update({ config: next, ...(changed ? { last_success_at: null, last_error: null } : {}) }).eq('id', fathom.id);
        if (result.error) throw result.error;
      }
      if (drive && body.data.drive_folders) {
        const gatewayKey = Deno.env.get('LOVABLE_API_KEY');
        const driveKey = Deno.env.get('GOOGLE_DRIVE_API_KEY');
        if (!gatewayKey || !driveKey) return output({ error: 'Google Drive is not connected' }, 400);
        const folders: Array<{ id: string; name: string }> = [];
        for (const entry of body.data.drive_folders.map(v => v.trim()).filter(Boolean)) {
          const id = driveFolderId(entry);
          if (!id) return output({ error: `This is not a Google Drive folder link: ${entry.slice(0, 80)}` }, 400);
          if (folders.some(f => f.id === id)) continue;
          const res = await fetch(`${DRIVE_URL}/files/${id}?fields=id,name,mimeType&supportsAllDrives=true`, { headers: { Authorization: `Bearer ${gatewayKey}`, 'X-Connection-Api-Key': driveKey } });
          if (!res.ok) return output({ error: `Could not open the Drive folder ${entry.slice(0, 80)}`, details: (await res.text()).slice(0, 300) }, 400);
          const file = await res.json();
          if (file.mimeType !== 'application/vnd.google-apps.folder') return output({ error: `${file.name} is a file, not a folder. Please paste a folder link.` }, 400);
          folders.push({ id, name: String(file.name || 'Folder') });
        }
        const result = await db.from('markus_knowledge_sources').update({ config: { ...(drive.config as Record<string, any>), folders }, last_success_at: null, last_error: null }).eq('id', drive.id);
        if (result.error) throw result.error;
      }
      return output({ success: true });
    }
    if (action === 'resume') {
      if (!owner) return output({ error: 'Only the owner can resume imports' }, 403);
      const result = await db.from('markus_knowledge_job').update({ paused: false, pause_reason: null }).eq('id', true);
      if (result.error) throw result.error;
      return output({ success: true });
    }
    if (action === 'review') {
      if (!owner || !body.data.document_id || !body.data.status) return output({ error: 'Owner approval and a document are required' }, 403);
      if (body.data.status === 'approved' && (!body.data.content || !body.data.privacy_confirmed)) return output({ error: 'Confirm private client details were removed before sharing teaching notes' }, 400);
      // Approved knowledge can also be removed later; only items in review can be approved.
      const allowed = body.data.status === 'excluded' ? ['review', 'approved'] : ['review'];
      const result = await db.from('markus_knowledge_documents').update({ status: body.data.status, ...(body.data.content && body.data.status === 'approved' ? { content: body.data.content } : {}), approved_by: caller }).eq('id', body.data.document_id).in('status', allowed).select('id');
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
          let cursor: string | null = config.cursor || null;
          let count = 0;
          let remaining = false;
          let pages = 0;
          const pending: Array<{ recordingId: string; title: string; url: string; published: string | null; content: string; kind: 'teaching' | 'sales' }> = [];
          // Read several pages per run so older recordings are reached, but stop at the per-run transcript limit.
          do {
            const endpoint = new URL('https://api.fathom.ai/external/v1/meetings');
            endpoint.searchParams.append('recorded_by[]', config.recorder_email);
            endpoint.searchParams.set('created_after', source.last_success_at || config.since || new Date(Date.now() - 7 * DAY_MS).toISOString());
            if (cursor) endpoint.searchParams.set('cursor', cursor);
            const response = await fetch(endpoint, { headers: { 'X-Api-Key': fathomKey } });
            if (!response.ok) throw new ProviderError(response.status, (await response.text()).slice(0, 500));
            const page = await response.json();
            for (const meeting of page.items || []) {
              const kind = fathomCallKind(meeting, config);
              if (!kind) continue;
              const recordingId = String(meeting.recording_id || '');
              if (!/^\d+$/.test(recordingId)) continue;
              const existing = await db.from('markus_knowledge_documents').select('id').eq('source_id', source.id).eq('external_id', recordingId).maybeSingle();
              if (existing.error) throw existing.error;
              if (existing.data) continue;
              if (count >= FATHOM_RUN_LIMIT) { remaining = true; break; }
              const transcript = await fetch(`https://api.fathom.ai/external/v1/recordings/${recordingId}/transcript`, { headers: { 'X-Api-Key': fathomKey } });
              if (!transcript.ok) throw new ProviderError(transcript.status, (await transcript.text()).slice(0, 500));
              const data = await transcript.json();
              const content = (data.transcript || []).map((segment: any) => `${segment.speaker?.display_name ? segment.speaker.display_name + ': ' : ''}${String(segment.text || '')}`).join('\n').trim();
              if (!content) continue;
              pending.push({ recordingId, title: String(meeting.meeting_title || meeting.title || 'Recorded call'), url: meeting.share_url || meeting.url || 'https://fathom.video', published: meeting.recording_start_time || meeting.created_at || null, content, kind });
              count++;
            }
            if (remaining) break;
            cursor = page.next_cursor || null;
            pages++;
          } while (cursor && pages < 5);
          const notes = await Promise.all(pending.map(p => teachingNotes(p.content, p.title, p.kind)));
          for (const [i, p] of pending.entries()) {
            const note = notes[i];
            const empty = note === 'NO TEACHING CONTENT';
            await save(source.id, { external_id: p.recordingId, title: `${p.kind === 'sales' ? 'Sales call' : 'Coaching call'}: ${p.title}`.slice(0, 255), source_url: p.url, published_at: p.published, observed_at: now, available_at: availableAt(p.published, now), content: (note && !empty ? note : p.content).slice(0, 150000), status: empty ? 'excluded' : 'review' });
          }
          const done = !remaining && !cursor;
          const update = await db.from('markus_knowledge_sources').update({ config: { ...config, cursor }, last_success_at: done ? now : source.last_success_at, last_error: null }).eq('id', source.id);
          if (update.error) throw update.error;
          results.push({ platform: 'fathom', awaiting_review: count, more_waiting: !done });
          continue;
        }
        if (source.platform === 'google_drive') {
          const folders = Array.isArray(config.folders) ? config.folders as Array<{ id: string; name: string }> : [];
          if (!folders.length) continue;
          if (source.last_success_at && Date.now() - Date.parse(source.last_success_at) < DAY_MS - 3600000) continue;
          const driveKey = Deno.env.get('GOOGLE_DRIVE_API_KEY');
          if (!gatewayKey || !driveKey) throw new ProviderError(401, 'Google Drive is not connected');
          const driveHeaders = { Authorization: `Bearer ${gatewayKey}`, 'X-Connection-Api-Key': driveKey };
          async function drive(path: string, params: Record<string, string>) {
            const u = new URL(`${DRIVE_URL}${path}`);
            for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
            const res = await fetch(u, { headers: driveHeaders });
            if (!res.ok) throw new ProviderError(res.status, (await res.text()).slice(0, 500));
            return res;
          }
          const since = source.last_success_at;
          const queue = folders.map(f => f.id);
          const seen = new Set<string>();
          const files: Array<{ id: string; name: string; mimeType: string; modifiedTime: string; createdTime: string; webViewLink: string }> = [];
          // Walk the chosen folders and their subfolders.
          while (queue.length && seen.size < 60) {
            const folder = queue.shift()!;
            if (seen.has(folder)) continue;
            seen.add(folder);
            let pageToken = '';
            do {
              const list = await (await drive('/files', { q: `'${folder}' in parents and trashed=false`, fields: 'nextPageToken,files(id,name,mimeType,modifiedTime,createdTime,webViewLink)', pageSize: '200', supportsAllDrives: 'true', includeItemsFromAllDrives: 'true', ...(pageToken ? { pageToken } : {}) })).json();
              for (const f of list.files || []) {
                if (f.mimeType === 'application/vnd.google-apps.folder') queue.push(f.id);
                else if ((DRIVE_EXPORTS[f.mimeType] || DRIVE_TEXT_TYPES.includes(f.mimeType)) && (!since || Date.parse(f.modifiedTime) > Date.parse(since))) files.push(f);
              }
              pageToken = list.nextPageToken || '';
            } while (pageToken);
          }
          let imported = 0;
          let remaining = false;
          const skipped: string[] = [];
          for (const f of files) {
            const existing = await db.from('markus_knowledge_documents').select('id,status,observed_at').eq('source_id', source.id).eq('external_id', f.id).maybeSingle();
            if (existing.error) throw existing.error;
            if (existing.data?.status === 'excluded') continue;
            if (existing.data && Date.parse(existing.data.observed_at) >= Date.parse(f.modifiedTime)) continue;
            if (imported >= DRIVE_RUN_LIMIT) { remaining = true; break; }
            const exportType = DRIVE_EXPORTS[f.mimeType];
            const res = await fetch(exportType ? `${DRIVE_URL}/files/${f.id}/export?mimeType=${encodeURIComponent(exportType)}` : `${DRIVE_URL}/files/${f.id}?alt=media&supportsAllDrives=true`, { headers: driveHeaders });
            if (!res.ok) { skipped.push(f.name); await res.text(); continue; }
            const text = (await res.text()).trim();
            if (!text) continue;
            const doc = { title: f.name.slice(0, 255), source_url: f.webViewLink || `https://drive.google.com/file/d/${f.id}/view`, published_at: f.modifiedTime, observed_at: now, content: text.slice(0, 150000) };
            const result = existing.data
              ? await db.from('markus_knowledge_documents').update(doc).eq('id', existing.data.id)
              : await db.from('markus_knowledge_documents').insert({ source_id: source.id, external_id: f.id, ...doc, available_at: now, status: 'approved' });
            if (result.error) throw result.error;
            imported++;
          }
          const update = await db.from('markus_knowledge_sources').update({ last_success_at: remaining ? source.last_success_at : now, last_error: skipped.length ? `Could not read: ${skipped.slice(0, 5).join(', ')}` : null }).eq('id', source.id);
          if (update.error) throw update.error;
          results.push({ platform: 'google_drive', imported, more_waiting: remaining });
          continue;
        }
        if (source.run_id) {
          const run = (await provider(`/actor-runs/${source.run_id}`)).data;
          if (run.status === 'SUCCEEDED') {
            const items = await provider(`/datasets/${run.defaultDatasetId}/items?limit=${source.platform === 'youtube' ? YOUTUBE_BACKFILL_LIMIT : SOURCE_LIMIT}&clean=true`);
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
        const backfill = source.platform === 'youtube' && !source.last_success_at;
        const actor = actorFor(source.platform, source.profile_url, config, backfill);
        const run = (await provider(`/acts/${actor.id}/runs?maxTotalChargeUsd=${backfill ? BACKFILL_CHARGE_USD : DAILY_CHARGE_USD}`, { method: 'POST', body: JSON.stringify(actor.input) })).data;
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
}

// Whether the daily refresh (or collecting a running import) is due.
export async function markusKnowledgeDue(): Promise<boolean> {
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) return false;
  const db = createClient(url, key);
  const [job, running] = await Promise.all([
    db.from('markus_knowledge_job').select('paused,last_run_at,lease_until').single(),
    db.from('markus_knowledge_sources').select('id', { count: 'exact', head: true }).not('run_id', 'is', null),
  ]);
  if (job.error || !job.data || job.data.paused) return false;
  if (job.data.lease_until && Date.parse(job.data.lease_until) > Date.now()) return false;
  const last = job.data.last_run_at ? Date.parse(job.data.last_run_at) : 0;
  const age = Date.now() - last;
  return age > DAY_MS || ((running.count || 0) > 0 && age > 10 * 60_000);
}

export const knowledgeCorsHeaders = corsHeaders;
