import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { RefreshCw, Loader2, ExternalLink, Check, X } from 'lucide-react';
import { toast } from 'sonner';

interface Source { id: string; platform: string; profile_url: string; last_success_at: string | null; last_error: string | null; run_id: string | null }
interface Document { id: string; title: string; content: string; source_url: string; status: string; published_at: string | null; observed_at: string }
export function MarkusKnowledgeAdmin({ isOwner }: { isOwner: boolean }) {
  const [sources, setSources] = useState<Source[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [pauseReason, setPauseReason] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  async function call(body: Record<string, unknown>) {
    const { data, error } = await supabase.functions.invoke('markus-knowledge-sync', { body });
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
    setSources(data.sources || []); setDocuments(data.documents || []); setPauseReason(data.job?.paused ? data.job.pause_reason : null); setError(null);
  }
  useEffect(() => { load().catch(e => setError(e.message)); }, []);
  async function action(body: Record<string, unknown>) {
    setBusy(true);
    try { const data = await call(body); if (data.message) toast.info(data.message); await load(); }
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
        <div className="min-w-0"><a className="flex items-center gap-2 capitalize text-primary font-medium" href={source.profile_url} target="_blank" rel="noreferrer">{source.platform}<ExternalLink className="h-3 w-3" /></a>
          <p className="text-sm text-muted-foreground">Last successful import: {source.last_success_at ? new Date(source.last_success_at).toLocaleString() : 'Not yet imported'}</p>
          {source.last_error && <p className="text-sm text-destructive break-words">{source.last_error}</p>}
        </div><Badge variant="secondary">{source.run_id ? 'Import running' : source.last_success_at ? 'Connected' : 'Awaiting first import'}</Badge>
      </div>)}
    </div>
    <h3 className="font-semibold">Teaching recordings awaiting privacy review</h3>
    {documents.filter(d => d.status === 'review').length === 0 && <p className="text-sm text-muted-foreground">No recordings awaiting review.</p>}
    {documents.filter(d => d.status === 'review').map(doc => <article key={doc.id} className="border border-border rounded-lg p-4 space-y-3">
      <a className="text-primary font-medium" href={doc.source_url} target="_blank" rel="noreferrer">{doc.title}</a>
      <Label htmlFor={`notes-${doc.id}`}>Teaching notes with private client details removed</Label>
      <Textarea id={`notes-${doc.id}`} value={drafts[doc.id] ?? doc.content} onChange={e => setDrafts(prev => ({ ...prev, [doc.id]: e.target.value }))} className="min-h-48" disabled={!isOwner || busy} />
      {isOwner && <div className="flex gap-2"><Button disabled={busy} onClick={() => action({ action: 'review', document_id: doc.id, status: 'approved', content: drafts[doc.id] ?? doc.content })}><Check className="mr-2 h-4 w-4" />Approve notes</Button><Button variant="outline" disabled={busy} onClick={() => action({ action: 'review', document_id: doc.id, status: 'excluded' })}><X className="mr-2 h-4 w-4" />Exclude</Button></div>}
    </article>)}
    <h3 className="font-semibold">Recent knowledge</h3>
    <div className="divide-y divide-border">{documents.filter(d => d.status === 'approved').map(doc => <div key={doc.id} className="py-3"><a className="text-primary" href={doc.source_url} target="_blank" rel="noreferrer">{doc.title}</a><p className="text-xs text-muted-foreground">{new Date(doc.published_at || doc.observed_at).toLocaleDateString()}</p></div>)}</div>
  </section>;
}