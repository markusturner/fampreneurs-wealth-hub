import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/integrations/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { useToast } from '@/hooks/use-toast'
import { useUserRole } from '@/hooks/useUserRole'
import { useDfoDemo } from '@/lib/dfo-demo'
import { Loader2, Mail, Plus, Trash2, Crown, X, CheckCircle2, Circle } from 'lucide-react'

interface Successor {
  id: string; name: string; email: string; role: string | null; deadline: string
  status: string; progress: number; reminders_sent: number; created_at: string
  step_list?: string[]; steps?: Record<string, boolean>
}

const STATUS: Record<string, { label: string; className: string }> = {
  sent: { label: 'Sent', className: 'border-muted-foreground/40 text-muted-foreground' },
  opened: { label: 'Opened', className: 'border-accent/50 text-accent' },
  in_progress: { label: 'In progress', className: 'border-primary/60 text-foreground' },
  completed: { label: 'Completed', className: 'border-emerald-500/60 text-emerald-600' },
  overdue: { label: 'Overdue', className: 'border-destructive/60 text-destructive' },
}

const DEMO: Successor[] = [
  { id: 'd1', name: 'Jordan Turner', email: 'jordan@example.com', role: 'Chairman', deadline: '2026-10-30', status: 'in_progress', progress: 67, reminders_sent: 1, created_at: '', step_list: ['Review the Family Trust documents', 'Meet with the trust attorney', 'Take over the business bank login'], steps: { s0: true, s1: true } },
  { id: 'd2', name: 'Maya Turner', email: 'maya@example.com', role: 'Treasurer', deadline: '2026-10-15', status: 'completed', progress: 100, reminders_sent: 0, created_at: '' },
  { id: 'd3', name: 'Chris Turner', email: 'chris@example.com', role: 'Trustee', deadline: '2026-09-20', status: 'overdue', progress: 20, reminders_sent: 3, created_at: '' },
]

export function HandoffSuccessors() {
  const { user } = useAuth()
  const { isFamilyOfficeOnly } = useUserRole()
  const demo = useDfoDemo()
  const { toast } = useToast()
  const [list, setList] = useState<Successor[]>([])
  const [form, setForm] = useState({ name: '', email: '', role: '', deadline: '' })
  const [steps, setSteps] = useState<string[]>([''])
  const [busy, setBusy] = useState<string | null>(null)
  const canEdit = !isFamilyOfficeOnly

  const load = async () => {
    if (!user?.id) return
    const { data } = await supabase.from('handoff_successors' as any).select('*').eq('owner_id', user.id).order('created_at', { ascending: false })
    setList((data as any) || [])
  }
  useEffect(() => { load() }, [user?.id])

  const invite = async (id: string) => {
    const { data, error } = await supabase.functions.invoke('handoff-invite', { body: { id, origin: window.location.origin } })
    if (error || data?.error) throw new Error(data?.error || 'Email could not be sent')
  }

  const add = async () => {
    if (demo) return toast({ title: 'Demo changes are not saved' })
    if (!user?.id || !form.name.trim() || !/^\S+@\S+\.\S+$/.test(form.email.trim()) || !form.deadline) {
      return toast({ title: 'Add a name, valid email, and deadline', variant: 'destructive' })
    }
    setBusy('add')
    const { data, error } = await supabase.from('handoff_successors' as any).insert({
      owner_id: user.id, name: form.name.trim(), email: form.email.trim(), role: form.role.trim() || null, deadline: form.deadline, step_list: steps.map(t => t.trim()).filter(Boolean),
    }).select('id').single()
    if (error) { setBusy(null); return toast({ title: 'Could not save', description: error.message, variant: 'destructive' }) }
    try { await invite((data as any).id); toast({ title: `Handoff email sent to ${form.name}` }) }
    catch (e) { toast({ title: 'Saved, but the email failed', description: (e as Error).message, variant: 'destructive' }) }
    setForm({ name: '', email: '', role: '', deadline: '' }); setSteps([''])
    setBusy(null); load()
  }

  const resend = async (s: Successor) => {
    if (demo) return toast({ title: 'Demo changes are not saved' })
    setBusy(s.id)
    try { await invite(s.id); toast({ title: `Resent to ${s.name}` }) }
    catch (e) { toast({ title: 'Email failed', description: (e as Error).message, variant: 'destructive' }) }
    setBusy(null)
  }

  const remove = async (s: Successor) => {
    if (demo) return toast({ title: 'Demo changes are not saved' })
    await supabase.from('handoff_successors' as any).delete().eq('id', s.id)
    load()
  }

  const rows = demo ? DEMO : list

  return (
    <div className="space-y-4">
      {canEdit && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2"><Crown className="h-4 w-4 text-accent" /> Name your successors</CardTitle>
            <CardDescription>Each person gets an email to complete their handoff. If they miss the deadline, they get 3 reminders, then you are alerted.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5 items-end">
              <div className="space-y-1.5"><Label>Name</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Full name" /></div>
              <div className="space-y-1.5"><Label>Email</Label><Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="name@email.com" /></div>
              <div className="space-y-1.5"><Label>Role they take over</Label><Input value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} placeholder="Chairman, Trustee..." /></div>
              <div className="space-y-1.5"><Label>Deadline</Label><Input type="date" value={form.deadline} min={new Date().toISOString().slice(0, 10)} onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))} /></div>
              <Button onClick={add} disabled={busy === 'add'}>
                {busy === 'add' ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />} Send handoff
              </Button>
            </div>
            <div className="mt-4 space-y-2">
              <Label>Steps for this successor</Label>
              {steps.map((t, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-5 text-right">{i + 1}.</span>
                  <Input value={t} placeholder="What do they need to do?" onChange={e => setSteps(a => a.map((x, j) => j === i ? e.target.value : x))} />
                  <Button size="icon" variant="ghost" aria-label="Remove step" onClick={() => setSteps(a => a.length > 1 ? a.filter((_, j) => j !== i) : [''])}><X className="h-4 w-4" /></Button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => setSteps(a => [...a, ''])}><Plus className="h-4 w-4 mr-1" /> Add step</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">My handoffs</CardTitle>
          <CardDescription>Everyone you have named and how far along they are.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No successors yet.</p>
          ) : rows.map(s => {
            const st = STATUS[s.status] || STATUS.sent
            return (
              <div key={s.id} className="rounded-lg border p-3 space-y-2">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{s.name}{s.role ? <span className="text-muted-foreground font-normal"> - {s.role}</span> : null}</p>
                  <p className="text-xs text-muted-foreground truncate">{s.email} · Due {new Date(s.deadline + 'T00:00:00').toLocaleDateString()}{s.reminders_sent ? ` · ${s.reminders_sent} reminder${s.reminders_sent > 1 ? 's' : ''} sent` : ''}</p>
                </div>
                <div className="flex items-center gap-2 sm:w-40"><Progress value={s.progress} className="h-2" /><span className="text-xs w-9 text-right">{s.progress}%</span></div>
                <Badge variant="outline" className={`justify-center sm:w-24 ${st.className}`}>{st.label}</Badge>
                {canEdit && (
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => resend(s)} disabled={busy === s.id || s.status === 'completed'} aria-label="Resend email">
                      {busy === s.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => remove(s)} aria-label="Remove"><Trash2 className="h-4 w-4" /></Button>
                  </div>
                )}
              </div>
              {!!s.step_list?.length && (
                <ul className="space-y-1 border-t pt-2">
                  {s.step_list.map((t, i) => {
                    const done = !!s.steps?.[`s${i}`]
                    return (
                      <li key={i} className="flex items-center gap-2 text-xs">
                        {done ? <CheckCircle2 className="h-3.5 w-3.5 text-primary" /> : <Circle className="h-3.5 w-3.5 text-muted-foreground" />}
                        <span className={done ? 'line-through text-muted-foreground' : ''}>{t}</span>
                      </li>
                    )
                  })}
                </ul>
              )}
              </div>
            )
          })}
        </CardContent>
      </Card>
    </div>
  )
}
