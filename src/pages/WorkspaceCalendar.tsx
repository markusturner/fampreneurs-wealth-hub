import { useState, useEffect } from "react"
import { Plus, ChevronLeft, ChevronRight, Clock, List, CalendarDays, X, MapPin, Video, Link2, Repeat } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarPicker } from "@/components/ui/calendar"
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay, addMonths, subMonths } from "date-fns"
import { formatInTimeZone } from "date-fns-tz"
import { cn } from "@/lib/utils"
import { useAuth } from "@/contexts/AuthContext"
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
]

const QUICK_FORMATS = ['coffee hour', 'Q&A', 'co-working session', 'happy hour']

export default function WorkspaceCalendar() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [loading, setLoading] = useState(true)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedTimezone, setSelectedTimezone] = useState('America/New_York')
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null)

  // Create form state
  const [formTitle, setFormTitle] = useState('')
  const [formDate, setFormDate] = useState<Date>(new Date())
  const [formTime, setFormTime] = useState('')
  const [formDuration, setFormDuration] = useState('60')
  const [formDescription, setFormDescription] = useState('')
  const [formLocation, setFormLocation] = useState('zoom')
  const [formRecurring, setFormRecurring] = useState(false)
  const [formRepeatEvery, setFormRepeatEvery] = useState('1')
  const [formRepeatUnit, setFormRepeatUnit] = useState('week')
  const [formRepeatDays, setFormRepeatDays] = useState<string[]>([])
  const [formEndType, setFormEndType] = useState('never')
  const [formEndDate, setFormEndDate] = useState<Date>(new Date())
  const [formEndAfter, setFormEndAfter] = useState('10')
  const [formAccess, setFormAccess] = useState('all')
  const [formRemind, setFormRemind] = useState(false)
  const [datePickerOpen, setDatePickerOpen] = useState(false)

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
    setFormDescription('')
    setFormLocation('zoom')
    setFormRecurring(false)
    setFormRepeatDays([])
    setFormEndType('never')
    setFormRemind(false)
  }

  const handleCreateMeeting = async () => {
    if (!user?.id || !formTitle.trim()) return
    try {
      const { error } = await supabase
        .from('meetings' as any)
        .insert({
          title: formTitle.trim(),
          description: formDescription.trim() || null,
          meeting_date: format(formDate, 'yyyy-MM-dd'),
          meeting_time: formTime || '10:00',
          created_by: user.id,
          status: 'scheduled',
        })
      if (error) throw error
      toast({ title: 'Event created' })
      resetForm()
      setIsCreateOpen(false)
      fetchMeetings()
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to create event', variant: 'destructive' })
    }
  }

  const openCreateForDate = (date: Date) => {
    resetForm()
    setFormDate(date)
    setIsCreateOpen(true)
  }

  const generateCalendarUrl = (meeting: Meeting, type: 'google' | 'apple') => {
    const startDate = new Date(`${meeting.meeting_date}T${meeting.meeting_time}`)
    const endDate = new Date(startDate.getTime() + 60 * 60 * 1000)
    const title = encodeURIComponent(meeting.title)
    const desc = encodeURIComponent(meeting.description || '')
    
    if (type === 'google') {
      const start = format(startDate, "yyyyMMdd'T'HHmmss")
      const end = format(endDate, "yyyyMMdd'T'HHmmss")
      return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${start}/${end}&details=${desc}`
    } else {
      // Apple/iCal format - download .ics
      const start = format(startDate, "yyyyMMdd'T'HHmmss")
      const end = format(endDate, "yyyyMMdd'T'HHmmss")
      const ics = `BEGIN:VCALENDAR\nVERSION:2.0\nBEGIN:VEVENT\nDTSTART:${start}\nDTEND:${end}\nSUMMARY:${meeting.title}\nDESCRIPTION:${meeting.description || ''}\nEND:VEVENT\nEND:VCALENDAR`
      const blob = new Blob([ics], { type: 'text/calendar' })
      return URL.createObjectURL(blob)
    }
  }

  // Calendar grid building
  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(monthStart)
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 })
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 })

  const rows = []
  let days = []
  let day = startDate

  while (day <= endDate) {
    for (let i = 0; i < 7; i++) {
      const cloneDay = day
      const dayMeetings = meetings.filter(m => isSameDay(new Date(m.meeting_date), cloneDay))

      days.push(
        <div
          key={day.toString()}
          className={cn(
            "min-h-[80px] sm:min-h-[100px] border-r border-b border-border p-1 sm:p-2 cursor-pointer hover:bg-muted/50 transition-colors",
            !isSameMonth(day, monthStart) && "bg-muted/20 text-muted-foreground",
            isSameDay(day, new Date()) && "bg-primary/5"
          )}
          onClick={() => openCreateForDate(cloneDay)}
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
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { resetForm(); setIsCreateOpen(true) }}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
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

      {/* Create Event Dialog - Skool style */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Add event</DialogTitle>
            <p className="text-sm text-muted-foreground">
              Need ideas? Try one of these fun formats: {QUICK_FORMATS.map((f, i) => (
                <span key={f}>
                  <button className="text-primary hover:underline" onClick={() => setFormTitle(f)}>{f}</button>
                  {i < QUICK_FORMATS.length - 1 ? ', ' : ''}
                </span>
              ))}
            </p>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            {/* Title */}
            <div>
              <Input placeholder="Title" value={formTitle} onChange={e => setFormTitle(e.target.value)} maxLength={30} />
              <p className="text-xs text-muted-foreground text-right mt-1">{formTitle.length} / 30</p>
            </div>

            {/* Date / Time / Duration / Timezone row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="justify-start text-xs">
                    {format(formDate, 'MMM d, yyyy')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarPicker mode="single" selected={formDate} onSelect={d => { if (d) { setFormDate(d); setDatePickerOpen(false) } }} />
                </PopoverContent>
              </Popover>

              <Input type="time" value={formTime} onChange={e => setFormTime(e.target.value)} className="text-xs h-9" />

              <Select value={formDuration} onValueChange={setFormDuration}>
                <SelectTrigger className="text-xs h-9"><SelectValue placeholder="Duration" /></SelectTrigger>
                <SelectContent>
                  {DURATIONS.map(d => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
                </SelectContent>
              </Select>

              <Select value={selectedTimezone} onValueChange={setSelectedTimezone}>
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
                      <Button variant="outline" size="sm" className="text-xs h-7" disabled={formEndType !== 'on'}>
                        {format(formEndDate, 'MMM d, yyyy')}
                      </Button>
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

            {/* Description */}
            <div>
              <Textarea placeholder="Description" value={formDescription} onChange={e => setFormDescription(e.target.value)} maxLength={300} rows={3} />
              <p className="text-xs text-muted-foreground text-right mt-1">{formDescription.length} / 300</p>
            </div>

            {/* Access */}
            <div>
              <Label className="text-sm font-semibold">Access</Label>
              <RadioGroup value={formAccess} onValueChange={setFormAccess} className="mt-2 space-y-2">
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="all" id="access-all" />
                  <Label htmlFor="access-all" className="text-sm">All members</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="level" id="access-level" />
                  <Label htmlFor="access-level" className="text-sm">Members on/above Level 1</Label>
                </div>
              </RadioGroup>
            </div>

            {/* Remind */}
            <div className="flex items-center gap-2">
              <Checkbox checked={formRemind} onCheckedChange={v => setFormRemind(!!v)} id="remind" />
              <Label htmlFor="remind" className="text-sm cursor-pointer">Remind members by email 1 day before</Label>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
              <Button onClick={handleCreateMeeting} disabled={!formTitle.trim()}>Add</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Event Detail Dialog */}
      <Dialog open={!!selectedMeeting} onOpenChange={() => setSelectedMeeting(null)}>
        <DialogContent className="max-w-md">
          {selectedMeeting && (
            <div className="space-y-4">
              {/* Calendar icon header */}
              <div className="bg-muted rounded-lg h-40 flex items-center justify-center">
                <CalendarDays className="h-16 w-16 text-muted-foreground" />
              </div>

              <h2 className="text-xl font-bold">{selectedMeeting.title}</h2>

              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <CalendarDays className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">
                      {format(new Date(selectedMeeting.meeting_date), 'EEEE, MMMM do')} @ {selectedMeeting.meeting_time}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {TIMEZONES.find(t => t.value === selectedTimezone)?.label || 'New York time'}
                    </p>
                  </div>
                </div>

                {selectedMeeting.description && (
                  <p className="text-sm text-muted-foreground">{selectedMeeting.description}</p>
                )}
              </div>

              {/* Add to Calendar */}
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
    </div>
  )
}
