import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { RefreshCw, Loader2, ExternalLink, Check, X } from 'lucide-react';
import { toast } from 'sonner';

interface Source { id: string; platform: string; profile_url: string; last_success_at: string | null; last_error: string | null; run_id: string | null; config: Record<string, any> }
const LABELS: Record<string, string> = { youtube: 'YouTube', instagram: 'Instagram', tiktok: 'TikTok', linkedin: 'LinkedIn', fathom: 'Fathom calls', google_drive: 'Google Drive' };
const lines = (text: string) => text.split('\n').map(t => t.trim()).filter(Boolean);
interface Document { id: string; title: string; content: string; source_url: string; status: string; published_at: string | null; observed_at: string }
export function MarkusKnowledgeAdmin({ isOwner }: { isOwner: boolean }) {
  const [sources, setSources] = useState<Source[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [pauseReason, setPauseReason] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [privacyConfirmed, setPrivacyConfirmed] = useState<Record<string, boolean>>({});
  const [totals, setTotals] = useState<Record<string, { approved: number; review: number }>>({});
  const [settings, setSettings] = useState<{ teaching: string; sales: string; folders: string } | null>(null);
  async function call(body: Record<string, unknown>) {
    const { data, error } = await supabase.functions.invoke('ai-chat', { body: { mode: 'knowledge', ...body } });
    if (error) {
      if (error instanceof FunctionsHttpError) {
        const text = await error.context.text();
        try { throw new Error(JSON.parse(text).error || text); } catch (parsed) { if (parsed instanceof SyntaxError) throw new Error(text); throw parsed; }
      }
      throw error;
    }
    if (data.error) throw new Error(data.error);
    return data;
  }
  async function load() {
    const data = await call({ action: 'status' });
    setSources(data.sources || []); setDocuments(data.documents || []); setPauseReason(data.job?.paused ? data.job.pause_reason : null); setTotals(data.totals || {}); setError(null);
    const fathom = (data.sources || []).find((x: Source) => x.platform === 'fathom');
    const drive = (data.sources || []).find((x: Source) => x.platform === 'google_drive');
    setSettings(prev => prev ?? { teaching: (fathom?.config?.titles || []).join('\n'), sales: (fathom?.config?.sales_titles || []).join('\n'), folders: (drive?.config?.folders || []).map((f: { id: string }) => `https://drive.google.com/drive/folders/${f.id}`).join('\n') });
  }
  useEffect(() => { load().catch(e => setError(e.message)); }, []);
  async function action(body: Record<string, unknown>) {
    setBusy(true);
    try { const data = await call(body); if (data.message) toast.info(data.message); else if (body.action === 'configure') toast.success('Saved. Press Update Now to start learning.'); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); }
  }
  return <section className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="text-xl font-semibold">Markus AI Knowledge</h2>
      <div className="flex gap-2">
        <Button variant="outline" disabled={busy} onClick={() => action({ action: 'status' })}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button>
        <Button disabled={busy || !!pauseReason} onClick={() => action({ action: 'sync' })}>{busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}Update Now</Button>
      </div>
    </div>
    {error && <p role="alert" className="text-destructive">{error}</p>}
    {pauseReason && <div className="border border-destructive rounded-lg p-4 space-y-3"><p className="text-destructive">Imports paused: {pauseReason}</p>{isOwner && <Button variant="outline" disabled={busy} onClick={() => action({ action: 'resume' })}>Resume after restoring access</Button>}</div>}
    <div className="divide-y divide-border border-y border-border">
      {sources.map(source => <div key={source.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
        <div className="min-w-0"><a className="flex items-center gap-2 text-primary font-medium" href={source.profile_url} target="_blank" rel="noreferrer">{LABELS[source.platform] || source.platform}<ExternalLink className="h-3 w-3" /></a>
          <p className="text-sm text-muted-foreground">Last successful import: {source.last_success_at ? new Date(source.last_success_at).toLocaleString() : 'Not yet imported'}</p>
          <p className="text-sm text-muted-foreground">{totals[source.id]?.approved || 0} items learned{totals[source.id]?.review ? `, ${totals[source.id].review} waiting for your review` : ''}{source.platform === 'google_drive' && !(source.config?.folders || []).length ? '. Add folders below.' : ''}</p>
          {source.last_error && <p className="text-sm text-destructive break-words">{source.last_error}</p>}
        </div><Badge variant="secondary">{source.run_id ? 'Import running' : source.last_success_at ? 'Connected' : 'Awaiting first import'}</Badge>
      </div>)}
    </div>
    {isOwner && settings && <div className="space-y-4 rounded-lg border border-border p-4">
      <h3 className="font-semibold">What Markus learns from</h3>
      <div className="space-y-1.5"><Label htmlFor="teaching-titles">Coaching call names in Fathom (one per line, must match exactly)</Label><Textarea id="teaching-titles" value={settings.teaching} onChange={e => setSettings({ ...settings, teaching: e.target.value })} className="min-h-28" disabled={busy} /></div>
      <div className="space-y-1.5"><Label htmlFor="sales-titles">Sales call names in Fathom (one per line, any call whose name includes these words)</Label><Textarea id="sales-titles" value={settings.sales} onChange={e => setSettings({ ...settings, sales: e.target.value })} placeholder={'Example: Strategy Call\nDiscovery Call'} className="min-h-20" disabled={busy} /></div>
      <div className="space-y-1.5"><Label htmlFor="drive-folders">Google Drive folders (paste one folder link per line)</Label><Textarea id="drive-folders" value={settings.folders} onChange={e => setSettings({ ...settings, folders: e.target.value })} placeholder="https://drive.google.com/drive/folders/..." className="min-h-20" disabled={busy} />
        {(sources.find(x => x.platform === 'google_drive')?.config?.folders || []).length > 0 && <p className="text-xs text-muted-foreground">Reading: {(sources.find(x => x.platform === 'google_drive')?.config?.folders || []).map((f: { name: string }) => f.name).join(', ')}</p>}</div>
      <p className="text-xs text-muted-foreground">Calls are turned into question and answer notes with private client details removed. You approve each one before Markus uses it. Google Docs, Slides, Sheets and text files in the folders are used right away.</p>
      <Button disabled={busy} onClick={() => action({ action: 'configure', teaching_titles: lines(settings.teaching), sales_titles: lines(settings.sales), drive_folders: lines(settings.folders) })}>Save sources</Button>
    </div>}
    <h3 className="font-semibold">Call notes awaiting privacy review</h3>
    {documents.filter(d => d.status === 'review').length === 0 && <p className="text-sm text-muted-foreground">No recordings awaiting review.</p>}
    {documents.filter(d => d.status === 'review').map(doc => <article key={doc.id} className="border border-border rounded-lg p-4 space-y-3">
      <a className="text-primary font-medium" href={doc.source_url} target="_blank" rel="noreferrer">{doc.title}</a>
      <Label htmlFor={`notes-${doc.id}`}>Teaching notes with private client details removed</Label>
      <Textarea id={`notes-${doc.id}`} value={drafts[doc.id] ?? doc.content} onChange={e => setDrafts(prev => ({ ...prev, [doc.id]: e.target.value }))} className="min-h-48" disabled={!isOwner || busy} />
      {isOwner && <><div className="flex items-center gap-2"><Checkbox id={`privacy-${doc.id}`} checked={!!privacyConfirmed[doc.id]} onCheckedChange={v => setPrivacyConfirmed(prev => ({ ...prev, [doc.id]: v === true }))} /><Label htmlFor={`privacy-${doc.id}`}>I removed private client details and approve sharing these teaching notes.</Label></div><div className="flex gap-2"><Button disabled={busy || !privacyConfirmed[doc.id]} onClick={() => action({ action: 'review', document_id: doc.id, status: 'approved', content: drafts[doc.id] ?? doc.content, privacy_confirmed: true })}><Check className="mr-2 h-4 w-4" />Approve notes</Button><Button variant="outline" disabled={busy} onClick={() => action({ action: 'review', document_id: doc.id, status: 'excluded' })}><X className="mr-2 h-4 w-4" />Exclude</Button></div></>}
    </article>)}
    <h3 className="font-semibold">Recent knowledge</h3>
    <div className="divide-y divide-border">{documents.filter(d => d.status === 'approved').map(doc => <div key={doc.id} className="flex items-center justify-between gap-3 py-3"><div className="min-w-0"><a className="text-primary break-words" href={doc.source_url} target="_blank" rel="noreferrer">{doc.title}</a><p className="text-xs text-muted-foreground">{new Date(doc.published_at || doc.observed_at).toLocaleDateString()}</p></div>{isOwner && <Button variant="ghost" size="sm" disabled={busy} onClick={() => action({ action: 'review', document_id: doc.id, status: 'excluded' })}><X className="mr-1 h-4 w-4" />Remove</Button>}</div>)}</div>
  </section>;
}