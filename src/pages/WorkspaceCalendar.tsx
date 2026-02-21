import { useState, useEffect, useMemo } from "react"
import { Plus, ChevronLeft, ChevronRight, Clock, CalendarDays, MapPin, Pencil, Trash2, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarPicker } from "@/components/ui/calendar"
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay, addMonths, subMonths, addWeeks } from "date-fns"
import { formatInTimeZone } from "date-fns-tz"
import { cn } from "@/lib/utils"
import { useAuth } from "@/contexts/AuthContext"
import { useOwnerRole } from "@/hooks/useOwnerRole"
import { useUserRole } from "@/hooks/useUserRole"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

interface Meeting {
  id: string
  title: string
  description: string | null
  meeting_date: string
  meeting_time: string
  meeting_type: string | null
  created_by: string
  status: string
  location: string | null
  location_link: string | null
  duration_minutes: number | null
  timezone: string | null
  is_recurring: boolean | null
  recurring_pattern: any
  remind_email: boolean | null
  parent_meeting_id: string | null
  community_ids: string[] | null
  community_frequency: Record<string, string> | null
}

const TIMEZONES = [
  { value: 'America/New_York', label: '(GMT -05:00) America/New York' },
  { value: 'America/Chicago', label: '(GMT -06:00) Central' },
  { value: 'America/Denver', label: '(GMT -07:00) Mountain' },
  { value: 'America/Los_Angeles', label: '(GMT -08:00) Pacific' },
  { value: 'Europe/London', label: '(GMT +00:00) London' },
  { value: 'UTC', label: '(GMT +00:00) UTC' },
]

const DURATIONS = [
  { value: '30', label: '30 min' },
  { value: '60', label: '1 hour' },
  { value: '90', label: '1.5 hours' },
  { value: '120', label: '2 hours' },
  { value: '180', label: '3 hours' },
]

const LOCATIONS = [
  { value: 'zoom', label: 'Zoom call' },
  { value: 'google_meet', label: 'Google Meet' },
  { value: 'in_person', label: 'In person' },
  { value: 'phone', label: 'Phone call' },
  { value: 'custom', label: 'Custom link' },
]

const QUICK_FORMATS = ['coffee hour', 'Q&A', 'co-working session', 'happy hour']

function formatDateString(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function parseDateString(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export default function WorkspaceCalendar() {
  const { user } = useAuth()
  const { toast } = useToast()
  const { isOwner } = useOwnerRole(user?.id ?? null)
  const { isAdmin } = useUserRole()
  const canCreateEvent = isAdmin || isOwner
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [loading, setLoading] = useState(true)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedTimezone, setSelectedTimezone] = useState('America/New_York')
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [editingMeetingId, setEditingMeetingId] = useState<string | null>(null)
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null)

  // Form state
  const [formTitle, setFormTitle] = useState('')
  const [formDate, setFormDate] = useState<Date>(new Date())
  const [formTime, setFormTime] = useState('')
  const [formDuration, setFormDuration] = useState('60')
  const [formTimezone, setFormTimezone] = useState('America/New_York')
  const [formDescription, setFormDescription] = useState('')
  const [formLocation, setFormLocation] = useState('zoom')
  const [formLocationLink, setFormLocationLink] = useState('')
  const [formRecurring, setFormRecurring] = useState(false)
  const [formRepeatEvery, setFormRepeatEvery] = useState('1')
  const [formRepeatUnit, setFormRepeatUnit] = useState('week')
  const [formRepeatDays, setFormRepeatDays] = useState<string[]>([])
  const [formEndType, setFormEndType] = useState('never')
  const [formEndDate, setFormEndDate] = useState<Date>(new Date())
  const [formEndAfter, setFormEndAfter] = useState('10')
  const [formRemind, setFormRemind] = useState(false)
  const [datePickerOpen, setDatePickerOpen] = useState(false)
  const [endDatePickerOpen, setEndDatePickerOpen] = useState(false)
  const [formCommunities, setFormCommunities] = useState<string[]>([])
  const [formCommunityFrequency, setFormCommunityFrequency] = useState<Record<string, string>>({})
  const [editScopeOpen, setEditScopeOpen] = useState(false)
  const [pendingEditMeeting, setPendingEditMeeting] = useState<Meeting | null>(null)

  useEffect(() => { fetchMeetings() }, [])

  const fetchMeetings = async () => {
    try {
      const { data, error } = await supabase
        .from('meetings' as any)
        .select('*')
        .order('meeting_date', { ascending: true })
      if (error) throw error
      setMeetings((data as unknown as Meeting[]) || [])
    } catch (error) {
      console.error('Error fetching meetings:', error)
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormTitle('')
    setFormDate(new Date())
    setFormTime('')
    setFormDuration('60')
    setFormTimezone('America/New_York')
    setFormDescription('')
    setFormLocation('zoom')
    setFormLocationLink('')
    setFormRecurring(false)
    setFormRepeatEvery('1')
    setFormRepeatUnit('week')
    setFormRepeatDays([])
    setFormEndType('never')
    setFormEndDate(new Date())
    setFormEndAfter('10')
    setFormRemind(false)
    setFormCommunities([])
    setFormCommunityFrequency({})
    setIsEditMode(false)
    setEditingMeetingId(null)
  }

  const generateRecurringDates = (startDate: Date, pattern: any): string[] => {
    if (!pattern) return []
    const dates: string[] = []
    const repeatEvery = parseInt(pattern.repeatEvery || '1')
    const unit = pattern.repeatUnit || 'week'
    const endType = pattern.endType || 'never'
    const endAfter = parseInt(pattern.endAfter || '10')
    const endDate = pattern.endDate ? parseDateString(pattern.endDate) : null
    const maxOccurrences = endType === 'after' ? endAfter : 52

    let current = new Date(startDate)
    for (let i = 0; i < maxOccurrences; i++) {
      if (i > 0) {
        if (unit === 'day') current = addDays(current, repeatEvery)
        else if (unit === 'week') current = addWeeks(current, repeatEvery)
        else if (unit === 'month') current = addMonths(current, repeatEvery)
      }
      if (endType === 'on' && endDate && current > endDate) break
      if (i > 0) dates.push(formatDateString(current))
    }
    return dates
  }

  // Build display meetings including recurring instances
  const displayMeetings = useMemo(() => {
    const all: Meeting[] = [...meetings]
    meetings.forEach(m => {
      if (m.is_recurring && m.recurring_pattern && !m.parent_meeting_id) {
        const startDate = parseDateString(m.meeting_date)
        const recurringDates = generateRecurringDates(startDate, m.recurring_pattern)
        recurringDates.forEach(date => {
          all.push({ ...m, id: `${m.id}-${date}`, meeting_date: date, parent_meeting_id: m.id })
        })
      }
    })
    return all
  }, [meetings])

  const handleSaveMeeting = async () => {
    if (!user?.id || !formTitle.trim()) return
    const meetingDate = formatDateString(formDate)
    const recurringPattern = formRecurring ? {
      repeatEvery: formRepeatEvery,
      repeatUnit: formRepeatUnit,
      repeatDays: formRepeatDays,
      endType: formEndType,
      endDate: formEndType === 'on' ? formatDateString(formEndDate) : null,
      endAfter: formEndType === 'after' ? formEndAfter : null,
    } : null

    const payload = {
      title: formTitle.trim(),
      description: formDescription.trim() || null,
      meeting_date: meetingDate,
      meeting_time: formTime || '10:00',
      location: formLocation,
      location_link: formLocationLink.trim() || null,
      duration_minutes: parseInt(formDuration),
      timezone: formTimezone,
      is_recurring: formRecurring,
      recurring_pattern: recurringPattern,
      remind_email: formRemind,
      community_ids: formCommunities,
      community_frequency: formCommunityFrequency,
    }

    try {
      if (isEditMode && editingMeetingId) {
        const { error } = await supabase
          .from('meetings' as any)
          .update(payload)
          .eq('id', editingMeetingId)
        if (error) throw error
        toast({ title: 'Event updated' })
      } else {
        const { error } = await supabase
          .from('meetings' as any)
          .insert({ ...payload, created_by: user.id, status: 'scheduled' })
        if (error) throw error
        toast({ title: 'Event created' })
      }
      resetForm()
      setIsCreateOpen(false)
      fetchMeetings()
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to save event', variant: 'destructive' })
    }
  }

  const handleDeleteMeeting = async (id: string) => {
    try {
      const { error } = await supabase.from('meetings' as any).delete().eq('id', id)
      if (error) throw error
      toast({ title: 'Event deleted' })
      setSelectedMeeting(null)
      fetchMeetings()
    } catch {
      toast({ title: 'Error', description: 'Failed to delete', variant: 'destructive' })
    }
  }

  const handleEditClick = (meeting: Meeting) => {
    if (meeting.is_recurring) {
      setPendingEditMeeting(meeting)
      setEditScopeOpen(true)
    } else {
      proceedToEdit(meeting)
    }
  }

  const proceedToEdit = (meeting: Meeting, _scope?: string) => {
    const realId = meeting.parent_meeting_id && meeting.id.includes('-') ? meeting.parent_meeting_id : meeting.id
    const original = meetings.find(m => m.id === realId) || meeting
    setIsEditMode(true)
    setEditingMeetingId(original.id)
    setFormTitle(original.title)
    setFormDate(parseDateString(original.meeting_date))
    setFormTime(original.meeting_time)
    setFormDuration(String(original.duration_minutes || 60))
    setFormTimezone(original.timezone || 'America/New_York')
    setFormDescription(original.description || '')
    setFormLocation(original.location || 'zoom')
    setFormLocationLink(original.location_link || '')
    setFormRecurring(original.is_recurring || false)
    if (original.recurring_pattern) {
      const p = original.recurring_pattern
      setFormRepeatEvery(p.repeatEvery || '1')
      setFormRepeatUnit(p.repeatUnit || 'week')
      setFormRepeatDays(p.repeatDays || [])
      setFormEndType(p.endType || 'never')
      if (p.endDate) setFormEndDate(parseDateString(p.endDate))
      if (p.endAfter) setFormEndAfter(p.endAfter)
    }
    setFormRemind(original.remind_email || false)
    setFormCommunities(original.community_ids || [])
    setFormCommunityFrequency(original.community_frequency || {})
    setSelectedMeeting(null)
    setEditScopeOpen(false)
    setPendingEditMeeting(null)
    setIsCreateOpen(true)
  }

  const openCreateForDate = (date: Date) => {
    resetForm()
    setFormDate(date)
    setIsCreateOpen(true)
  }

  const generateCalendarUrl = (meeting: Meeting, type: 'google' | 'apple') => {
    const startDate = new Date(`${meeting.meeting_date}T${meeting.meeting_time}`)
    const dur = meeting.duration_minutes || 60
    const endDate = new Date(startDate.getTime() + dur * 60 * 1000)
    const title = encodeURIComponent(meeting.title)
    const desc = encodeURIComponent(meeting.description || '')

    if (type === 'google') {
      const start = format(startDate, "yyyyMMdd'T'HHmmss")
      const end = format(endDate, "yyyyMMdd'T'HHmmss")
      return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${start}/${end}&details=${desc}`
    } else {
      const start = format(startDate, "yyyyMMdd'T'HHmmss")
      const end = format(endDate, "yyyyMMdd'T'HHmmss")
      const ics = `BEGIN:VCALENDAR\nVERSION:2.0\nBEGIN:VEVENT\nDTSTART:${start}\nDTEND:${end}\nSUMMARY:${meeting.title}\nDESCRIPTION:${meeting.description || ''}\nEND:VEVENT\nEND:VCALENDAR`
      return URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }))
    }
  }

  // Calendar grid
  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(monthStart)
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })

  const rows = []
  let days = []
  let day = gridStart

  while (day <= gridEnd) {
    for (let i = 0; i < 7; i++) {
      const cloneDay = day
      const dayMeetings = displayMeetings.filter(m => isSameDay(parseDateString(m.meeting_date), cloneDay))

      days.push(
        <div
          key={day.toString()}
          className={cn(
            "min-h-[80px] sm:min-h-[100px] border-r border-b border-border p-1 sm:p-2 transition-colors",
            canCreateEvent && "cursor-pointer hover:bg-muted/50",
            !isSameMonth(day, monthStart) && "bg-muted/20 text-muted-foreground",
            isSameDay(day, new Date()) && "bg-primary/5"
          )}
          onClick={() => canCreateEvent && openCreateForDate(cloneDay)}
        >
          <div className={cn(
            "text-xs sm:text-sm font-medium mb-1",
            isSameDay(day, new Date()) && "bg-destructive text-destructive-foreground rounded-full w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center text-[10px] sm:text-xs"
          )}>
            {format(cloneDay, 'd')}
          </div>
          <div className="space-y-0.5">
            {dayMeetings.slice(0, 2).map((meeting) => (
              <div
                key={meeting.id}
                className="text-[10px] sm:text-xs p-0.5 sm:p-1 rounded truncate cursor-pointer"
                style={{ backgroundColor: '#ffb500', color: '#290a52' }}
                onClick={(e) => { e.stopPropagation(); setSelectedMeeting(meeting) }}
              >
                <span className="hidden sm:inline">{meeting.meeting_time} - </span>{meeting.title}
              </div>
            ))}
            {dayMeetings.length > 2 && (
              <div className="text-[10px] text-muted-foreground">+{dayMeetings.length - 2} more</div>
            )}
          </div>
        </div>
      )
      day = addDays(day, 1)
    }
    rows.push(<div key={day.toString()} className="grid grid-cols-7">{days}</div>)
    days = []
  }

  const getCurrentTime = () => {
    const now = new Date()
    const timeString = formatInTimeZone(now, selectedTimezone, 'h:mmaaa')
    const tzLabel = TIMEZONES.find(t => t.value === selectedTimezone)?.label || selectedTimezone
    return `${timeString} ${tzLabel}`
  }

  const dayHeaders = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

  const getLocationLabel = (loc: string | null) => LOCATIONS.find(l => l.value === loc)?.label || loc || ''

  return (
    <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-6 max-w-6xl space-y-4 sm:space-y-6">
      <div className="border rounded-lg bg-card">
        {/* Header */}
        <div className="flex items-center justify-between p-3 sm:p-4 border-b flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>Today</Button>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentDate(subMonths(currentDate, 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="text-center">
              <h2 className="font-bold text-base sm:text-lg">{format(currentDate, 'MMMM yyyy')}</h2>
              <p className="text-[10px] sm:text-xs text-muted-foreground">{getCurrentTime()}</p>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentDate(addMonths(currentDate, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          {canCreateEvent && (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { resetForm(); setIsCreateOpen(true) }}>
              <Plus className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 border-b">
          {dayHeaders.map(d => (
            <div key={d} className="text-center text-[10px] sm:text-xs font-semibold text-muted-foreground py-2 border-r last:border-r-0">
              {d}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        {loading ? (
          <div className="h-96 flex items-center justify-center">
            <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        ) : (
          <div>{rows}</div>
        )}
      </div>

      {/* Upcoming Events */}
      <div>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Clock className="h-5 w-5 text-muted-foreground" />
          Upcoming Events
        </h3>
        <div className="space-y-3">
          {displayMeetings
            .filter(m => parseDateString(m.meeting_date) >= new Date(new Date().setHours(0,0,0,0)))
            .sort((a, b) => parseDateString(a.meeting_date).getTime() - parseDateString(b.meeting_date).getTime())
            .slice(0, 5)
            .map((meeting) => (
              <div
                key={meeting.id}
                className="flex items-center gap-4 p-3 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors cursor-pointer"
                onClick={() => setSelectedMeeting(meeting)}
              >
                <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-primary/10 flex flex-col items-center justify-center">
                  <span className="text-[10px] font-semibold text-primary uppercase">
                    {format(parseDateString(meeting.meeting_date), 'MMM')}
                  </span>
                  <span className="text-sm font-bold text-foreground leading-none">
                    {format(parseDateString(meeting.meeting_date), 'd')}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{meeting.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(parseDateString(meeting.meeting_date), 'EEEE')} at {meeting.meeting_time}
                    {meeting.location && ` · ${getLocationLabel(meeting.location)}`}
                  </p>
                </div>
              </div>
            ))}
          {displayMeetings.filter(m => parseDateString(m.meeting_date) >= new Date(new Date().setHours(0,0,0,0))).length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">No upcoming events</p>
          )}
        </div>
      </div>

      {/* Create / Edit Event Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={(open) => { if (!open) { resetForm(); setIsCreateOpen(false) } }}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">{isEditMode ? 'Edit event' : 'Add event'}</DialogTitle>
            {!isEditMode && (
              <p className="text-sm text-muted-foreground">
                Need ideas? Try one of these fun formats: {QUICK_FORMATS.map((f, i) => (
                  <span key={f}>
                    <button className="text-primary hover:underline" onClick={() => setFormTitle(f)}>{f}</button>
                    {i < QUICK_FORMATS.length - 1 ? ', ' : ''}
                  </span>
                ))}
              </p>
            )}
          </DialogHeader>

          <div className="space-y-4 mt-2">
            {/* Title */}
            <div>
              <Input placeholder="Title" value={formTitle} onChange={e => setFormTitle(e.target.value)} maxLength={30} />
              <p className="text-xs text-muted-foreground text-right mt-1">{formTitle.length} / 30</p>
            </div>

            {/* Date / Time / Duration / Timezone */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="justify-start text-xs">
                    {format(formDate, 'MMM d, yyyy')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 z-[70]" align="start">
                  <CalendarPicker
                    mode="single"
                    selected={formDate}
                    onSelect={d => { if (d) { setFormDate(d); setDatePickerOpen(false) } }}
                    className="p-3 pointer-events-auto"
                    initialFocus
                  />
                </PopoverContent>
              </Popover>

              <Input type="time" value={formTime} onChange={e => setFormTime(e.target.value)} className="text-xs h-9" />

              <Select value={formDuration} onValueChange={setFormDuration}>
                <SelectTrigger className="text-xs h-9"><SelectValue placeholder="Duration" /></SelectTrigger>
                <SelectContent>
                  {DURATIONS.map(d => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
                </SelectContent>
              </Select>

              <Select value={formTimezone} onValueChange={setFormTimezone}>
                <SelectTrigger className="text-xs h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TIMEZONES.map(tz => <SelectItem key={tz.value} value={tz.value}>{tz.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Recurring */}
            <div className="flex items-center gap-2">
              <Checkbox checked={formRecurring} onCheckedChange={v => setFormRecurring(!!v)} id="recurring" />
              <Label htmlFor="recurring" className="text-sm cursor-pointer">Recurring event</Label>
            </div>

            {formRecurring && (
              <div className="space-y-3 pl-6 border-l-2 border-border">
                <div className="flex items-center gap-2">
                  <span className="text-sm">Repeat every</span>
                  <Select value={formRepeatEvery} onValueChange={setFormRepeatEvery}>
                    <SelectTrigger className="w-16 h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>{[1,2,3,4].map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}</SelectContent>
                  </Select>
                  <Select value={formRepeatUnit} onValueChange={setFormRepeatUnit}>
                    <SelectTrigger className="w-24 h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="day">Day</SelectItem>
                      <SelectItem value="week">Week</SelectItem>
                      <SelectItem value="month">Month</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formRepeatUnit === 'week' && (
                  <div>
                    <p className="text-sm mb-2">Repeat on</p>
                    <div className="flex gap-2 flex-wrap">
                      {weekDays.map(d => (
                        <label key={d} className="flex items-center gap-1.5">
                          <Checkbox
                            checked={formRepeatDays.includes(d)}
                            onCheckedChange={v => setFormRepeatDays(prev => v ? [...prev, d] : prev.filter(x => x !== d))}
                          />
                          <span className="text-xs">{d}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <p className="text-sm mb-2">End</p>
                  <RadioGroup value={formEndType} onValueChange={setFormEndType} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="never" id="end-never" />
                      <Label htmlFor="end-never" className="text-sm">Never</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="on" id="end-on" />
                      <Label htmlFor="end-on" className="text-sm">On</Label>
                      <Popover open={endDatePickerOpen} onOpenChange={setEndDatePickerOpen}>
                        <PopoverTrigger asChild>
                          <Button variant="outline" size="sm" className="text-xs h-7" disabled={formEndType !== 'on'}>
                            {format(formEndDate, 'MMM d, yyyy')}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 z-[70]" align="start">
                          <CalendarPicker
                            mode="single"
                            selected={formEndDate}
                            onSelect={d => { if (d) { setFormEndDate(d); setEndDatePickerOpen(false) } }}
                            className="p-3 pointer-events-auto"
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="after" id="end-after" />
                      <Label htmlFor="end-after" className="text-sm">After</Label>
                      <Input className="w-16 h-7 text-xs" value={formEndAfter} onChange={e => setFormEndAfter(e.target.value)} disabled={formEndType !== 'after'} />
                      <span className="text-sm">occurrences</span>
                    </div>
                  </RadioGroup>
                </div>
              </div>
            )}

            {/* Location */}
            <div>
              <Label className="text-sm">Location</Label>
              <Select value={formLocation} onValueChange={setFormLocation}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LOCATIONS.map(l => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Custom location link */}
            <div>
              <Label className="text-sm">Location link (optional)</Label>
              <Input
                placeholder="https://..."
                value={formLocationLink}
                onChange={e => setFormLocationLink(e.target.value)}
                className="mt-1"
              />
            </div>

            {/* Description */}
            <div>
              <Textarea placeholder="Description" value={formDescription} onChange={e => setFormDescription(e.target.value)} maxLength={300} rows={3} />
              <p className="text-xs text-muted-foreground text-right mt-1">{formDescription.length} / 300</p>
            </div>

            {/* Remind */}
            <div className="flex items-center gap-2">
              <Checkbox checked={formRemind} onCheckedChange={v => setFormRemind(!!v)} id="remind" />
              <Label htmlFor="remind" className="text-sm cursor-pointer">Remind members by email 1 day before</Label>
            </div>

            {/* Community Association */}
            <div>
              <Label className="text-sm font-medium">Community association</Label>
              <p className="text-xs text-muted-foreground mb-2">Which communities should see this event?</p>
              <div className="space-y-2">
                {[
                  { id: 'fbu', label: 'Family Business University', short: 'FBU' },
                  { id: 'tfv', label: 'The Family Vault', short: 'TFV' },
                  { id: 'tfba', label: 'The Family Business Accelerator', short: 'TFBA' },
                  { id: 'tffm', label: 'The Family Fortune Mastermind', short: 'TFFM' },
                ].map(community => (
                  <div key={community.id} className="rounded-lg border border-border hover:bg-muted/50 transition-colors overflow-hidden">
                    <div className="flex items-center gap-2 p-2">
                      <Checkbox
                        id={`community-${community.id}`}
                        checked={formCommunities.includes(community.id)}
                        onCheckedChange={(checked) => {
                          setFormCommunities(prev =>
                            checked
                              ? [...prev, community.id]
                              : prev.filter(c => c !== community.id)
                          )
                          if (!checked) {
                            setFormCommunityFrequency(prev => {
                              const next = { ...prev }
                              delete next[community.id]
                              return next
                            })
                          }
                        }}
                      />
                      <Label htmlFor={`community-${community.id}`} className="text-sm cursor-pointer flex-1">
                        {community.label} <span className="text-xs text-muted-foreground">({community.short})</span>
                      </Label>
                    </div>
                    {formCommunities.includes(community.id) && (
                      <div className="px-8 pb-2">
                        <Select
                          value={formCommunityFrequency[community.id] || ''}
                          onValueChange={(val) => setFormCommunityFrequency(prev => ({ ...prev, [community.id]: val }))}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Frequency (optional)" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="weekly">Weekly</SelectItem>
                            <SelectItem value="bi-weekly">Bi-weekly</SelectItem>
                            <SelectItem value="monthly">Once per month</SelectItem>
                            <SelectItem value="quarterly">Quarterly</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => { resetForm(); setIsCreateOpen(false) }}>Cancel</Button>
              <Button onClick={handleSaveMeeting} disabled={!formTitle.trim()}>
                {isEditMode ? 'Save' : 'Add'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Event Detail Dialog */}
      <Dialog open={!!selectedMeeting} onOpenChange={() => setSelectedMeeting(null)}>
        <DialogContent className="max-w-md">
          {selectedMeeting && (
            <div className="space-y-4">
              <div className="bg-muted rounded-lg h-40 flex items-center justify-center">
                <CalendarDays className="h-16 w-16 text-muted-foreground" />
              </div>

              <div className="flex items-start justify-between">
                <h2 className="text-xl font-bold">{selectedMeeting.title}</h2>
                {canCreateEvent && (
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditClick(selectedMeeting)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => {
                      const realId = selectedMeeting.parent_meeting_id && selectedMeeting.id.includes('-') ? selectedMeeting.parent_meeting_id : selectedMeeting.id
                      handleDeleteMeeting(realId)
                    }}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <CalendarDays className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">
                      {format(parseDateString(selectedMeeting.meeting_date), 'EEEE, MMMM do')} @ {selectedMeeting.meeting_time}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {TIMEZONES.find(t => t.value === (selectedMeeting.timezone || selectedTimezone))?.label || 'New York time'}
                      {selectedMeeting.duration_minutes && ` · ${selectedMeeting.duration_minutes} min`}
                    </p>
                  </div>
                </div>

                {selectedMeeting.location && (
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">{getLocationLabel(selectedMeeting.location)}</p>
                      {selectedMeeting.location_link && (
                        <a
                          href={selectedMeeting.location_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-medium break-all flex items-center gap-1 mt-1 px-2 py-1 rounded-md"
                          style={{ color: '#2EB2FF', backgroundColor: 'rgba(46, 178, 255, 0.1)' }}
                        >
                          <ExternalLink className="h-3 w-3 flex-shrink-0" />
                          {selectedMeeting.location_link}
                        </a>
                      )}
                    </div>
                  </div>
                )}

                {selectedMeeting.is_recurring && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    Recurring event
                  </div>
                )}

                {selectedMeeting.description && (
                  <p className="text-sm text-muted-foreground">{selectedMeeting.description}</p>
                )}
              </div>

              <div className="space-y-2 pt-2">
                <Button
                  className="w-full gap-2"
                  variant="outline"
                  onClick={() => window.open(generateCalendarUrl(selectedMeeting, 'google'), '_blank')}
                >
                  <CalendarDays className="h-4 w-4" />
                  Add to Google Calendar
                </Button>
                <Button
                  className="w-full gap-2"
                  variant="outline"
                  onClick={() => {
                    const url = generateCalendarUrl(selectedMeeting, 'apple')
                    const a = document.createElement('a')
                    a.href = url
                    a.download = `${selectedMeeting.title}.ics`
                    a.click()
                  }}
                >
                  <CalendarDays className="h-4 w-4" />
                  Add to Apple Calendar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Scope Dialog for Recurring Events */}
      <Dialog open={editScopeOpen} onOpenChange={(open) => { if (!open) { setEditScopeOpen(false); setPendingEditMeeting(null) } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit recurring event</DialogTitle>
            <DialogDescription>How would you like to apply your changes?</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 pt-2">
            <Button
              variant="outline"
              className="w-full justify-start text-sm"
              onClick={() => pendingEditMeeting && proceedToEdit(pendingEditMeeting, 'this')}
            >
              Only this event
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start text-sm"
              onClick={() => pendingEditMeeting && proceedToEdit(pendingEditMeeting, 'following')}
            >
              This and following events
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start text-sm"
              onClick={() => pendingEditMeeting && proceedToEdit(pendingEditMeeting, 'all')}
            >
              All events
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
