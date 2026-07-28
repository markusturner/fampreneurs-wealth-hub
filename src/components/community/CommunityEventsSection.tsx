import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { CalendarDays, Clock, MapPin, Video, Plus, Trash2, Pencil, ExternalLink } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useIsAdminOrOwner } from '@/hooks/useIsAdminOrOwner'
import { useToast } from '@/hooks/use-toast'
import { format, isPast } from 'date-fns'

type Recurrence = 'none' | 'daily' | 'weekly' | 'biweekly' | 'monthly'

interface CommunityEvent {
  id: string
  program: string
  title: string
  description: string | null
  event_at: string
  duration_minutes: number
  location: string | null
  join_url: string | null
  cover_image_url: string | null
  created_by: string
  recurrence: Recurrence
  recurrence_end_date: string | null
}

interface Props { program: string }

const emptyForm = {
  title: '', description: '', date: '', time: '',
  duration: 60, location: '', join_url: '',
  recurrence: 'none' as Recurrence,
  recurrence_mode: 'forever' as 'forever' | 'until',
  recurrence_end_date: '',
}

function addRecurrence(date: Date, rec: Recurrence): Date {
  const d = new Date(date)
  switch (rec) {
    case 'daily': d.setDate(d.getDate() + 1); break
    case 'weekly': d.setDate(d.getDate() + 7); break
    case 'biweekly': d.setDate(d.getDate() + 14); break
    case 'monthly': d.setMonth(d.getMonth() + 1); break
  }
  return d
}

interface EventInstance extends CommunityEvent { instance_at: string; is_recurring_instance: boolean }

function expandEvents(events: CommunityEvent[], horizonDays = 180): EventInstance[] {
  const out: EventInstance[] = []
  const horizon = new Date(); horizon.setDate(horizon.getDate() + horizonDays)
  const past = new Date(); past.setDate(past.getDate() - 60)
  for (const ev of events) {
    if (!ev.recurrence || ev.recurrence === 'none') {
      out.push({ ...ev, instance_at: ev.event_at, is_recurring_instance: false })
      continue
    }
    const endBoundary = ev.recurrence_end_date ? new Date(`${ev.recurrence_end_date}T23:59:59`) : horizon
    let cur = new Date(ev.event_at)
    let i = 0
    while (cur <= endBoundary && cur <= horizon && i < 500) {
      if (cur >= past) {
        out.push({ ...ev, instance_at: cur.toISOString(), is_recurring_instance: i > 0 })
      }
      cur = addRecurrence(cur, ev.recurrence)
      i++
    }
  }
  return out.sort((a, b) => a.instance_at.localeCompare(b.instance_at))
}

export function CommunityEventsSection({ program }: Props) {
  const { user } = useAuth()
  const { isAdminOrOwner: canManage } = useIsAdminOrOwner()
  const { toast } = useToast()

  const [events, setEvents] = useState<CommunityEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<CommunityEvent | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('community_events')
      .select('*')
      .eq('program', program)
      .order('event_at', { ascending: true })
    setEvents((data || []) as CommunityEvent[])
    setLoading(false)
  }

  useEffect(() => { if (program) load() }, [program])

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm)
    setOpen(true)
  }

  const openEdit = (ev: CommunityEvent) => {
    const d = new Date(ev.event_at)
    setEditing(ev)
    setForm({
      title: ev.title,
      description: ev.description || '',
      date: format(d, 'yyyy-MM-dd'),
      time: format(d, 'HH:mm'),
      duration: ev.duration_minutes,
      location: ev.location || '',
      join_url: ev.join_url || '',
    })
    setOpen(true)
  }

  const save = async () => {
    if (!form.title || !form.date || !form.time) {
      toast({ title: 'Missing info', description: 'Title, date and time are required.', variant: 'destructive' })
      return
    }
    setSaving(true)
    const event_at = new Date(`${form.date}T${form.time}`).toISOString()
    const payload = {
      program,
      title: form.title,
      description: form.description || null,
      event_at,
      duration_minutes: Number(form.duration) || 60,
      location: form.location || null,
      join_url: form.join_url || null,
      created_by: user?.id as string,
    }
    const { error } = editing
      ? await supabase.from('community_events').update(payload).eq('id', editing.id)
      : await supabase.from('community_events').insert(payload)
    setSaving(false)
    if (error) {
      toast({ title: 'Save failed', description: error.message, variant: 'destructive' })
      return
    }
    toast({ title: editing ? 'Event updated' : 'Event created' })
    setOpen(false)
    load()
  }

  const remove = async (ev: CommunityEvent) => {
    if (!confirm(`Delete "${ev.title}"?`)) return
    const { error } = await supabase.from('community_events').delete().eq('id', ev.id)
    if (error) return toast({ title: 'Delete failed', description: error.message, variant: 'destructive' })
    toast({ title: 'Event deleted' })
    load()
  }

  const upcoming = events.filter(e => !isPast(new Date(e.event_at)))
  const past = events.filter(e => isPast(new Date(e.event_at))).reverse()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">Events</h3>
          <p className="text-xs text-muted-foreground">Community-specific calls, workshops, and meetings.</p>
        </div>
        {canManage && (
          <Button onClick={openCreate} className="bg-[#290a52] hover:bg-[#290a52]/90 text-white">
            <Plus className="h-4 w-4 mr-1.5" /> New Event
          </Button>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground py-6 text-center">Loading events…</p>
      ) : (
        <>
          <Section title="Upcoming" events={upcoming} canManage={canManage} onEdit={openEdit} onDelete={remove} empty="No upcoming events yet." />
          {past.length > 0 && (
            <Section title="Past" events={past} canManage={canManage} onEdit={openEdit} onDelete={remove} muted />
          )}
        </>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Event' : 'New Event'}</DialogTitle>
            <DialogDescription>Shown only inside this community.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Title</Label>
              <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Date</Label>
                <Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
              </div>
              <div>
                <Label>Time</Label>
                <Input type="time" value={form.time} onChange={e => setForm({ ...form, time: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Duration (min)</Label>
                <Input type="number" value={form.duration} onChange={e => setForm({ ...form, duration: Number(e.target.value) })} />
              </div>
              <div>
                <Label>Location</Label>
                <Input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} placeholder="Zoom / Room" />
              </div>
            </div>
            <div>
              <Label>Join URL</Label>
              <Input value={form.join_url} onChange={e => setForm({ ...form, join_url: e.target.value })} placeholder="https://..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving} className="bg-[#290a52] hover:bg-[#290a52]/90 text-white">
              {saving ? 'Saving…' : editing ? 'Save' : 'Create Event'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function Section({
  title, events, canManage, onEdit, onDelete, empty, muted,
}: {
  title: string; events: CommunityEvent[]; canManage: boolean;
  onEdit: (e: CommunityEvent) => void; onDelete: (e: CommunityEvent) => void;
  empty?: string; muted?: boolean;
}) {
  if (events.length === 0 && !empty) return null
  return (
    <div className="space-y-2">
      <h4 className="text-sm font-semibold text-muted-foreground">{title}</h4>
      {events.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4">{empty}</p>
      ) : (
        <div className="space-y-2">
          {events.map(ev => (
            <Card key={ev.id} className={`border-border/60 ${muted ? 'opacity-70' : ''}`}>
              <CardContent className="p-4 flex items-start gap-4">
                <div className="flex flex-col items-center justify-center rounded-lg bg-[#290a52] text-white w-14 py-2 flex-shrink-0">
                  <span className="text-[10px] uppercase tracking-wide">{format(new Date(ev.event_at), 'MMM')}</span>
                  <span className="text-xl font-bold leading-none">{format(new Date(ev.event_at), 'd')}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{ev.title}</p>
                  {ev.description && <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{ev.description}</p>}
                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{format(new Date(ev.event_at), 'h:mm a')} · {ev.duration_minutes}m</span>
                    {ev.location && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{ev.location}</span>}
                    {ev.join_url && (
                      <a href={ev.join_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[#2eb2ff] hover:underline">
                        <Video className="h-3 w-3" /> Join
                      </a>
                    )}
                  </div>
                </div>
                {canManage && (
                  <div className="flex flex-col gap-1">
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => onEdit(ev)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => onDelete(ev)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
