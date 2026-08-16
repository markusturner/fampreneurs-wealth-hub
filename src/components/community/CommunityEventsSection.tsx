import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { CalendarDays, Clock, MapPin, Video, Plus, Trash2, Pencil, ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useIsAdminOrOwner } from '@/hooks/useIsAdminOrOwner'
import { useToast } from '@/hooks/use-toast'
import { format, isPast, isSameDay, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, addMonths, isSameMonth, isToday } from 'date-fns'

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

function toGoogleUTC(d: Date) {
  return d.toISOString().replace(/[-:]|\.\d{3}/g, '')
}

function googleCalUrl(ev: { title: string; description?: string | null; location?: string | null; join_url?: string | null; instance_at: string; duration_minutes: number }) {
  const start = new Date(ev.instance_at)
  const end = new Date(start.getTime() + (ev.duration_minutes || 60) * 60000)
  const details = [ev.description || '', ev.join_url ? `Join: ${ev.join_url}` : ''].filter(Boolean).join('\n\n')
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: ev.title,
    dates: `${toGoogleUTC(start)}/${toGoogleUTC(end)}`,
    details,
    location: ev.location || ev.join_url || '',
  })
  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

function downloadIcs(ev: { title: string; description?: string | null; location?: string | null; join_url?: string | null; instance_at: string; duration_minutes: number; id: string }) {
  const start = new Date(ev.instance_at)
  const end = new Date(start.getTime() + (ev.duration_minutes || 60) * 60000)
  const fmt = (d: Date) => toGoogleUTC(d)
  const esc = (s: string) => s.replace(/([,;\\])/g, '\\$1').replace(/\n/g, '\\n')
  const desc = [ev.description || '', ev.join_url ? `Join: ${ev.join_url}` : ''].filter(Boolean).join('\n\n')
  const ics = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//TruHeirs//Community Events//EN',
    'BEGIN:VEVENT',
    `UID:${ev.id}-${start.getTime()}@truheirs.app`,
    `DTSTAMP:${fmt(new Date())}`,
    `DTSTART:${fmt(start)}`,
    `DTEND:${fmt(end)}`,
    `SUMMARY:${esc(ev.title)}`,
    `DESCRIPTION:${esc(desc)}`,
    `LOCATION:${esc(ev.location || ev.join_url || '')}`,
    'END:VEVENT', 'END:VCALENDAR',
  ].join('\r\n')
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${ev.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.ics`
  document.body.appendChild(a); a.click(); document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}


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

  const cacheKey = `truheirs:community_events:${program}`

  const load = async () => {
    // Instant hydrate from cache
    try {
      const cached = localStorage.getItem(cacheKey)
      if (cached) {
        setEvents(JSON.parse(cached) as CommunityEvent[])
        setLoading(false)
      }
    } catch {}
    const { data } = await supabase
      .from('community_events')
      .select('*')
      .eq('program', program)
      .order('event_at', { ascending: true })
    const rows = (data || []) as CommunityEvent[]
    setEvents(rows)
    setLoading(false)
    try { localStorage.setItem(cacheKey, JSON.stringify(rows)) } catch {}
  }

  useEffect(() => {
    if (!program) return
    // If we have cache, don't show loading spinner
    try {
      if (localStorage.getItem(cacheKey)) setLoading(false)
    } catch {}
    load()
  }, [program])

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
      recurrence: (ev.recurrence || 'none') as Recurrence,
      recurrence_mode: ev.recurrence_end_date ? 'until' : 'forever',
      recurrence_end_date: ev.recurrence_end_date || '',
    })
    setOpen(true)
  }

  const save = async () => {
    if (!form.title || !form.date || !form.time) {
      toast({ title: 'Missing info', description: 'Title, date and time are required.', variant: 'destructive' })
      return
    }
    if (form.recurrence !== 'none' && form.recurrence_mode === 'until' && !form.recurrence_end_date) {
      toast({ title: 'Missing end date', description: 'Pick an end date or choose "Forever".', variant: 'destructive' })
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
      recurrence: form.recurrence,
      recurrence_end_date:
        form.recurrence !== 'none' && form.recurrence_mode === 'until' && form.recurrence_end_date
          ? form.recurrence_end_date
          : null,
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
    const isRecurring = ev.recurrence && ev.recurrence !== 'none'
    if (!confirm(`Delete "${ev.title}"${isRecurring ? ' and all its recurring instances' : ''}?`)) return
    const { error } = await supabase.from('community_events').delete().eq('id', ev.id)
    if (error) return toast({ title: 'Delete failed', description: error.message, variant: 'destructive' })
    toast({ title: 'Event deleted' })
    load()
  }

  const instances = expandEvents(events)
  const past = instances.filter(e => isPast(new Date(e.instance_at))).reverse()
  const [detail, setDetail] = useState<EventInstance | null>(null)


  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-lg font-semibold">Events</h3>
          <p className="text-xs text-muted-foreground">Community-specific calls, workshops, and meetings.</p>
        </div>
        {canManage && (
          <Button onClick={openCreate} size="sm" className="w-full sm:w-auto bg-[#290a52] hover:bg-[#290a52]/90 text-white">
            <Plus className="h-4 w-4 mr-1.5" /> New Event
          </Button>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground py-6 text-center">Loading events…</p>
      ) : (
        <>
          <MonthCalendar instances={instances} onOpenEvent={setDetail} />
          {past.length > 0 && (
            <Section title="Past" events={past} canManage={canManage} onEdit={openEdit} onDelete={remove} muted />
          )}
        </>
      )}

      <EventDetailDialog
        event={detail}
        onClose={() => setDetail(null)}
        canManage={canManage}
        onEdit={openEdit}
        onDelete={remove}
      />


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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label>Date</Label>
                <Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
              </div>
              <div>
                <Label>Time</Label>
                <Input type="time" value={form.time} onChange={e => setForm({ ...form, time: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
            <div className="border-t pt-3 space-y-3">
              <div>
                <Label>Repeats</Label>
                <select
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                  value={form.recurrence}
                  onChange={e => setForm({ ...form, recurrence: e.target.value as Recurrence })}
                >
                  <option value="none">Does not repeat</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="biweekly">Every 2 weeks</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
              {form.recurrence !== 'none' && (
                <div className="space-y-2">
                  <Label>Ends</Label>
                  <div className="flex items-center gap-4 text-sm">
                    <label className="inline-flex items-center gap-2">
                      <input
                        type="radio"
                        checked={form.recurrence_mode === 'forever'}
                        onChange={() => setForm({ ...form, recurrence_mode: 'forever' })}
                      />
                      Forever
                    </label>
                    <label className="inline-flex items-center gap-2">
                      <input
                        type="radio"
                        checked={form.recurrence_mode === 'until'}
                        onChange={() => setForm({ ...form, recurrence_mode: 'until' })}
                      />
                      Until
                    </label>
                    {form.recurrence_mode === 'until' && (
                      <Input
                        type="date"
                        className="max-w-[180px]"
                        value={form.recurrence_end_date}
                        onChange={e => setForm({ ...form, recurrence_end_date: e.target.value })}
                      />
                    )}
                  </div>
                </div>
              )}
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
  title: string; events: EventInstance[]; canManage: boolean;
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
          {events.map(ev => {
            const when = new Date(ev.instance_at)
            const recurringLabel =
              ev.recurrence && ev.recurrence !== 'none'
                ? ev.recurrence === 'biweekly' ? 'Every 2 weeks'
                : ev.recurrence.charAt(0).toUpperCase() + ev.recurrence.slice(1)
                : null
            return (
              <Card key={`${ev.id}-${ev.instance_at}`} className={`border-border/60 ${muted ? 'opacity-70' : ''}`}>
                <CardContent className="p-3 sm:p-4 flex items-start gap-3 sm:gap-4">
                  <div className="flex flex-col items-center justify-center rounded-lg bg-[#290a52] text-white w-12 sm:w-14 py-2 flex-shrink-0">
                    <span className="text-[10px] uppercase tracking-wide">{format(when, 'MMM')}</span>
                    <span className="text-xl font-bold leading-none">{format(when, 'd')}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm break-words min-w-0">{ev.title}</p>
                      {recurringLabel && (
                        <span className="text-[10px] uppercase tracking-wide bg-[#290a52]/10 text-[#290a52] px-1.5 py-0.5 rounded">
                          {recurringLabel}
                        </span>
                      )}
                    </div>
                    {ev.description && <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{ev.description}</p>}
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 sm:gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{format(when, 'h:mm a')} · {ev.duration_minutes}m</span>
                      {ev.location && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{ev.location}</span>}
                      {ev.join_url && (
                        <a href={ev.join_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[#2eb2ff] hover:underline">
                          <Video className="h-3 w-3" /> Join
                        </a>
                      )}
                      <a href={googleCalUrl(ev)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[#290a52] hover:underline">
                        <CalendarDays className="h-3 w-3" /> Google
                      </a>
                      <button type="button" onClick={() => downloadIcs(ev)} className="inline-flex items-center gap-1 text-[#290a52] hover:underline">
                        <CalendarDays className="h-3 w-3" /> Apple / .ics
                      </button>

                    </div>
                  </div>
                  {canManage && !ev.is_recurring_instance && (
                    <div className="flex flex-col gap-1">
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => onEdit(ev)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => onDelete(ev)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

function EventDetailDialog({ event, onClose, canManage, onEdit, onDelete }: {
  event: EventInstance | null
  onClose: () => void
  canManage?: boolean
  onEdit?: (e: EventInstance) => void
  onDelete?: (e: EventInstance) => void
}) {
  if (!event) return null
  const when = new Date(event.instance_at)
  const end = new Date(when.getTime() + (event.duration_minutes || 60) * 60000)
  return (
    <Dialog open={!!event} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">{event.title}</DialogTitle>
          <DialogDescription className="sr-only">Event details</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 text-sm">
          <div className="flex items-start gap-2">
            <CalendarDays className="h-4 w-4 mt-0.5 text-[#290a52]" />
            <div>
              <p className="font-medium">{format(when, 'EEEE, MMMM do')} @ {format(when, 'h:mm a')} - {format(end, 'h:mm a')}</p>
              <p className="text-xs text-muted-foreground">{event.duration_minutes || 60} minutes</p>
            </div>
          </div>
          {event.location && (
            <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-[#290a52]" /><span>{event.location}</span></div>
          )}
          {event.join_url && (
            <div className="flex items-center gap-2">
              <Video className="h-4 w-4 text-[#2eb2ff]" />
              <a href={event.join_url} target="_blank" rel="noreferrer" className="text-[#2eb2ff] hover:underline break-all">{event.join_url}</a>
            </div>
          )}
          {event.description && (
            <p className="text-muted-foreground whitespace-pre-wrap">{event.description}</p>
          )}
          <div className="flex flex-wrap gap-2 pt-1">
            <Button asChild size="sm" className="bg-[#290a52] hover:bg-[#290a52]/90 text-white">
              <a href={googleCalUrl(event)} target="_blank" rel="noreferrer"><CalendarDays className="h-4 w-4 mr-1.5" /> Add to Google</a>
            </Button>
            <Button size="sm" variant="outline" onClick={() => downloadIcs(event)}>
              <CalendarDays className="h-4 w-4 mr-1.5" /> Apple / .ics
            </Button>
            {event.join_url && (
              <Button asChild size="sm" variant="outline">
                <a href={event.join_url} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4 mr-1.5" /> Join</a>
              </Button>
            )}
          </div>
          {canManage && (
            <div className="flex flex-wrap gap-2 border-t pt-3">
              <Button size="sm" variant="outline" onClick={() => { onClose(); onEdit?.(event) }}>
                <Pencil className="h-4 w-4 mr-1.5" /> Edit event
              </Button>
              <Button size="sm" variant="outline" className="text-destructive hover:text-destructive" onClick={() => { onClose(); onDelete?.(event) }}>
                <Trash2 className="h-4 w-4 mr-1.5" /> Delete event
              </Button>
              {event.is_recurring_instance && (
                <p className="w-full text-xs text-muted-foreground">Changes apply to the whole recurring series.</p>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function MonthCalendar({ instances, onOpenEvent }: { instances: EventInstance[]; onOpenEvent: (e: EventInstance) => void }) {
  const [cursor, setCursor] = useState(() => startOfMonth(new Date()))
  const [selected, setSelected] = useState<Date | null>(new Date())

  const monthStart = startOfMonth(cursor)
  const monthEnd = endOfMonth(cursor)
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 })
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 })

  const days: Date[] = []
  for (let d = gridStart; d <= gridEnd; d = addDays(d, 1)) days.push(d)

  const eventsByDay = new Map<string, EventInstance[]>()
  for (const ev of instances) {
    const key = format(new Date(ev.instance_at), 'yyyy-MM-dd')
    const arr = eventsByDay.get(key) || []
    arr.push(ev)
    eventsByDay.set(key, arr)
  }

  const selectedKey = selected ? format(selected, 'yyyy-MM-dd') : ''
  const selectedEvents = (eventsByDay.get(selectedKey) || []).sort(
    (a, b) => a.instance_at.localeCompare(b.instance_at)
  )

  return (
    <Card className="border-border/60">
      <CardContent className="p-2.5 sm:p-4">
        <div className="flex items-center justify-between mb-3">
          <button
            className="h-8 w-8 rounded-md hover:bg-muted inline-flex items-center justify-center"
            onClick={() => setCursor(addMonths(cursor, -1))}
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="text-sm font-semibold">{format(cursor, 'MMMM yyyy')}</div>
          <button
            className="h-8 w-8 rounded-md hover:bg-muted inline-flex items-center justify-center"
            onClick={() => setCursor(addMonths(cursor, 1))}
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <div className="grid grid-cols-7 gap-0.5 sm:gap-1 text-[9px] sm:text-[10px] uppercase tracking-wide text-muted-foreground mb-1">
          {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
            <div key={d} className="text-center py-1">
              <span className="sm:hidden">{d.charAt(0)}</span>
              <span className="hidden sm:inline">{d}</span>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
          {days.map(day => {
            const key = format(day, 'yyyy-MM-dd')
            const dayEvents = eventsByDay.get(key) || []
            const inMonth = isSameMonth(day, cursor)
            const isSel = selected && isSameDay(day, selected)
            const today = isToday(day)
            return (
              <button
                key={key}
                onClick={() => setSelected(day)}
                className={`aspect-square sm:aspect-auto sm:min-h-[84px] w-full overflow-hidden rounded-md text-xs flex flex-col items-center sm:items-stretch justify-start p-0.5 sm:p-1 transition-colors border text-center sm:text-left ${
                  isSel
                    ? 'bg-[#290a52] text-white border-[#290a52]'
                    : today
                      ? 'border-[#290a52]/40 bg-[#290a52]/5'
                      : 'border-transparent hover:bg-muted'
                } ${inMonth ? '' : 'text-muted-foreground/50'}`}
              >
                <span className="font-medium leading-none px-0.5 pt-1 sm:pt-0.5">{format(day, 'd')}</span>
                {dayEvents.length > 0 && (
                  <>
                    {/* Mobile: compact dots */}
                    <span className="sm:hidden mt-1 flex items-center justify-center gap-0.5">
                      {dayEvents.slice(0, 3).map((_, i) => (
                        <span
                          key={i}
                          className={`h-1 w-1 rounded-full ${isSel ? 'bg-white' : 'bg-[#ffb500]'}`}
                        />
                      ))}
                    </span>
                    {/* Desktop: event titles */}
                    <span className="hidden sm:flex mt-1 flex-col gap-0.5 overflow-hidden">
                      {dayEvents.slice(0, 2).map((ev, i) => (
                        <span
                          key={i}
                          title={ev.title}
                          role="button"
                          tabIndex={0}
                          onClick={(e) => { e.stopPropagation(); onOpenEvent(ev) }}
                          className={`truncate rounded px-1 py-0.5 text-[10px] leading-tight cursor-pointer transition-all duration-200 hover:scale-[1.03] hover:shadow-[0_0_12px_rgba(255,181,0,0.85)] hover:ring-1 hover:ring-[#ffb500] ${
                            isSel
                              ? 'bg-white/20 text-white'
                              : 'bg-[#ffb500]/20 text-[#290a52]'
                          }`}
                        >
                          {ev.title}
                        </span>
                      ))}

                      {dayEvents.length > 2 && (
                        <span className={`text-[9px] px-1 ${isSel ? 'text-white/80' : 'text-muted-foreground'}`}>
                          +{dayEvents.length - 2} more
                        </span>
                      )}
                    </span>
                  </>
                )}
              </button>
            )
          })}
        </div>
        {selected && (
          <div className="mt-4 border-t pt-3">
            <p className="text-xs font-semibold text-muted-foreground mb-2">
              {format(selected, 'EEEE, MMM d')}
            </p>
            {selectedEvents.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2">No events this day.</p>
            ) : (
              <div className="space-y-1.5">
                {selectedEvents.map(ev => (
                  <button
                    type="button"
                    key={`${ev.id}-${ev.instance_at}`}
                    onClick={() => onOpenEvent(ev)}
                    className="w-full text-left flex flex-wrap items-center gap-x-2 gap-y-1 text-xs rounded-md border border-transparent px-2 py-1.5 transition-all duration-200 hover:border-[#ffb500] hover:bg-[#ffb500]/5 hover:shadow-[0_0_14px_rgba(255,181,0,0.55)]"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-[#ffb500] flex-shrink-0" />
                    <span className="font-medium">{format(new Date(ev.instance_at), 'h:mm a')}</span>
                    <span className="min-w-0 break-words">{ev.title}</span>
                  </button>
                ))}
              </div>
            )}

          </div>
        )}
      </CardContent>
    </Card>
  )
}
