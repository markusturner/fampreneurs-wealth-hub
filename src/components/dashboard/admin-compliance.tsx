import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { format } from 'date-fns'

type Report = { id: string; target_type: string; target_id: string | null; reported_user_id: string | null; reason: string; details: string | null; content_snapshot: string | null; status: string; created_at: string }
type Notice = { id: string; complainant_name: string; complainant_email: string; copyrighted_work: string; infringing_location: string; notice_type: string; status: string; created_at: string }
type Incident = { id: string; title: string; severity: string; status: string; detected_at: string; affected_data: string | null; affected_user_count: number | null; description: string | null; actions_taken: string | null; contained_at: string | null; users_notified_at: string | null; regulators_notified_at: string | null }

const fmt = (d: string | null) => (d ? format(new Date(d), 'MMM d, yyyy h:mm a') : '-')

export function AdminCompliance() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [reports, setReports] = useState<Report[]>([])
  const [notices, setNotices] = useState<Notice[]>([])
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [draft, setDraft] = useState({ title: '', severity: 'low', affected_data: '', affected_user_count: '', description: '' })

  const load = useCallback(async () => {
    const [r, n, i] = await Promise.all([
      supabase.from('content_reports').select('*').order('created_at', { ascending: false }).limit(200),
      supabase.from('dmca_notices').select('*').order('created_at', { ascending: false }).limit(200),
      supabase.from('security_incidents').select('*').order('detected_at', { ascending: false }).limit(200),
    ])
    setReports((r.data as Report[]) ?? [])
    setNotices((n.data as Notice[]) ?? [])
    setIncidents((i.data as Incident[]) ?? [])
  }, [])

  useEffect(() => { load() }, [load])

  const resolveReport = async (report: Report, status: 'actioned' | 'dismissed', removeContent: boolean) => {
    if (removeContent && report.target_id) {
      const table = report.target_type === 'comment' ? 'community_comments' : 'community_posts'
      const { error } = await supabase.from(table).delete().eq('id', report.target_id)
      if (error) { toast({ title: 'Could not remove content', description: error.message, variant: 'destructive' }); return }
    }
    await supabase.from('content_reports').update({ status, reviewed_by: user?.id, reviewed_at: new Date().toISOString() }).eq('id', report.id)
    toast({ title: status === 'actioned' ? 'Report closed and content removed' : 'Report dismissed' })
    load()
  }

  const setNoticeStatus = async (id: string, status: string) => {
    await supabase.from('dmca_notices').update({ status, resolved_at: ['removed', 'rejected', 'restored'].includes(status) ? new Date().toISOString() : null }).eq('id', id)
    load()
  }

  const logIncident = async () => {
    if (!user || !draft.title.trim()) return
    const { error } = await supabase.from('security_incidents').insert({
      title: draft.title.trim(), severity: draft.severity, affected_data: draft.affected_data || null,
      affected_user_count: draft.affected_user_count ? Number(draft.affected_user_count) : null,
      description: draft.description || null, reported_by: user.id,
    })
    if (error) { toast({ title: 'Could not log incident', variant: 'destructive' }); return }
    setDraft({ title: '', severity: 'low', affected_data: '', affected_user_count: '', description: '' })
    load()
  }

  const stampIncident = async (id: string, field: 'contained_at' | 'users_notified_at' | 'regulators_notified_at' | 'closed') => {
    const patch = field === 'closed' ? { status: 'closed', updated_at: new Date().toISOString() } : { [field]: new Date().toISOString(), updated_at: new Date().toISOString() }
    await supabase.from('security_incidents').update(patch).eq('id', id)
    load()
  }

  const openReports = reports.filter(r => r.status === 'open')

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Content reports <Badge variant="secondary" className="ml-2">{openReports.length} open</Badge></CardTitle>
          <CardDescription>Review reported posts and members. Aim to act within 24 hours.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {reports.length === 0 && <p className="text-sm text-muted-foreground">No reports yet.</p>}
          {reports.map(r => (
            <div key={r.id} className="rounded-md border border-border p-3 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={r.status === 'open' ? 'destructive' : 'outline'}>{r.status}</Badge>
                <span className="font-medium capitalize">{r.reason}</span>
                <span className="text-muted-foreground">{r.target_type} - {fmt(r.created_at)}</span>
              </div>
              {r.content_snapshot && <p className="mt-2 line-clamp-3 rounded bg-muted p-2">{r.content_snapshot}</p>}
              {r.details && <p className="mt-1 text-muted-foreground">Note: {r.details}</p>}
              {r.status === 'open' && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {r.target_id && r.target_type !== 'user' && <Button size="sm" variant="destructive" onClick={() => resolveReport(r, 'actioned', true)}>Remove content</Button>}
                  <Button size="sm" variant="outline" onClick={() => resolveReport(r, 'actioned', false)}>Mark handled</Button>
                  <Button size="sm" variant="ghost" onClick={() => resolveReport(r, 'dismissed', false)}>Dismiss</Button>
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>DMCA notices</CardTitle>
          <CardDescription>Copyright takedown requests and counter-notices from the public form.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {notices.length === 0 && <p className="text-sm text-muted-foreground">No notices yet.</p>}
          {notices.map(n => (
            <div key={n.id} className="rounded-md border border-border p-3 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">{n.notice_type}</Badge>
                <span className="font-medium">{n.complainant_name}</span>
                <a className="underline" href={`mailto:${n.complainant_email}`}>{n.complainant_email}</a>
                <span className="text-muted-foreground">{fmt(n.created_at)}</span>
              </div>
              <p className="mt-1"><span className="text-muted-foreground">Work:</span> {n.copyrighted_work}</p>
              <p><span className="text-muted-foreground">Location:</span> {n.infringing_location}</p>
              <div className="mt-2 max-w-xs">
                <Select value={n.status} onValueChange={v => setNoticeStatus(n.id, v)}>
                  <SelectTrigger aria-label="Notice status"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['received', 'reviewing', 'removed', 'rejected', 'restored'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Breach response log</CardTitle>
          <CardDescription>Record any suspected data breach the moment it is found. GDPR requires notifying regulators within 72 hours; most US states require notifying affected people without unreasonable delay.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1"><Label htmlFor="inc-title">What happened</Label><Input id="inc-title" value={draft.title} onChange={e => setDraft({ ...draft, title: e.target.value })} /></div>
            <div className="space-y-1">
              <Label htmlFor="inc-sev">Severity</Label>
              <Select value={draft.severity} onValueChange={v => setDraft({ ...draft, severity: v })}>
                <SelectTrigger id="inc-sev"><SelectValue /></SelectTrigger>
                <SelectContent>{['low', 'medium', 'high', 'critical'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label htmlFor="inc-data">Data involved</Label><Input id="inc-data" value={draft.affected_data} onChange={e => setDraft({ ...draft, affected_data: e.target.value })} /></div>
            <div className="space-y-1"><Label htmlFor="inc-count">People affected</Label><Input id="inc-count" type="number" min={0} value={draft.affected_user_count} onChange={e => setDraft({ ...draft, affected_user_count: e.target.value })} /></div>
          </div>
          <div className="space-y-1"><Label htmlFor="inc-desc">Details</Label><Textarea id="inc-desc" value={draft.description} onChange={e => setDraft({ ...draft, description: e.target.value })} /></div>
          <Button onClick={logIncident} disabled={!draft.title.trim()}>Log incident</Button>

          {incidents.map(i => (
            <div key={i.id} className="rounded-md border border-border p-3 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={i.severity === 'critical' || i.severity === 'high' ? 'destructive' : 'outline'}>{i.severity}</Badge>
                <span className="font-medium">{i.title}</span>
                <Badge variant="secondary">{i.status}</Badge>
              </div>
              <p className="mt-1 text-muted-foreground">Found {fmt(i.detected_at)} - Contained {fmt(i.contained_at)} - People notified {fmt(i.users_notified_at)} - Regulators notified {fmt(i.regulators_notified_at)}</p>
              {i.description && <p className="mt-1">{i.description}</p>}
              {i.status !== 'closed' && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {!i.contained_at && <Button size="sm" variant="outline" onClick={() => stampIncident(i.id, 'contained_at')}>Mark contained</Button>}
                  {!i.users_notified_at && <Button size="sm" variant="outline" onClick={() => stampIncident(i.id, 'users_notified_at')}>People notified</Button>}
                  {!i.regulators_notified_at && <Button size="sm" variant="outline" onClick={() => stampIncident(i.id, 'regulators_notified_at')}>Regulators notified</Button>}
                  <Button size="sm" variant="ghost" onClick={() => stampIncident(i.id, 'closed')}>Close</Button>
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
