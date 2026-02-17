import { useState, useEffect } from "react"
import { Plus, ChevronLeft, ChevronRight, Clock, ChevronDown, List, CalendarDays } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay, addMonths, subMonths } from "date-fns"
import { formatInTimeZone } from "date-fns-tz"
import { cn } from "@/lib/utils"
import { useAuth } from "@/contexts/AuthContext"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"

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

export default function WorkspaceCalendar() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [loading, setLoading] = useState(true)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedTimezone, setSelectedTimezone] = useState('America/New_York')
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [newMeeting, setNewMeeting] = useState({ title: '', description: '', meeting_date: new Date(), meeting_time: '10:00' })

  const timezones = [
    { value: 'America/New_York', label: 'New York time' },
    { value: 'America/Chicago', label: 'Central time' },
    { value: 'America/Denver', label: 'Mountain time' },
    { value: 'America/Los_Angeles', label: 'Pacific time' },
    { value: 'Europe/London', label: 'London time' },
    { value: 'UTC', label: 'UTC' },
  ]

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

  const handleCreateMeeting = async () => {
    if (!user?.id || !newMeeting.title.trim()) return
    try {
      const { error } = await supabase
        .from('meetings' as any)
        .insert({
          title: newMeeting.title.trim(),
          description: newMeeting.description.trim() || null,
          meeting_date: format(newMeeting.meeting_date, 'yyyy-MM-dd'),
          meeting_time: newMeeting.meeting_time,
          created_by: user.id,
          status: 'scheduled',
        })
      if (error) throw error
      toast({ title: 'Meeting created' })
      setNewMeeting({ title: '', description: '', meeting_date: new Date(), meeting_time: '10:00' })
      setIsCreateOpen(false)
      fetchMeetings()
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to create meeting', variant: 'destructive' })
    }
  }

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
            "min-h-[100px] border-r border-b border-border p-2 cursor-pointer hover:bg-muted/50 transition-colors",
            !isSameMonth(day, monthStart) && "bg-muted/20 text-muted-foreground",
            isSameDay(day, new Date()) && "bg-primary/5"
          )}
          onClick={() => {
            setNewMeeting(prev => ({ ...prev, meeting_date: cloneDay }))
            setIsCreateOpen(true)
          }}
        >
          <div className={cn(
            "text-sm font-medium mb-1",
            isSameDay(day, new Date()) && "bg-destructive text-destructive-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs"
          )}>
            {format(cloneDay, 'd')}
          </div>
          <div className="space-y-1">
            {dayMeetings.slice(0, 2).map((meeting) => (
              <div
                key={meeting.id}
                className="text-xs p-1 rounded truncate"
                style={{ backgroundColor: '#ffb500', color: '#290a52' }}
              >
                {meeting.meeting_time} - {meeting.title}
              </div>
            ))}
            {dayMeetings.length > 2 && (
              <div className="text-xs text-muted-foreground">+{dayMeetings.length - 2} more</div>
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
    const tzLabel = timezones.find(t => t.value === selectedTimezone)?.label || selectedTimezone
    return `${timeString} ${tzLabel}`
  }

  const dayHeaders = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl space-y-6">
      {/* Calendar card */}
      <div className="border rounded-lg bg-card">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>
            Today
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentDate(subMonths(currentDate, 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="text-center">
              <h2 className="font-bold text-lg">{format(currentDate, 'MMMM yyyy')}</h2>
              <p className="text-xs text-muted-foreground">{getCurrentTime()}</p>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentDate(addMonths(currentDate, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsCreateOpen(true)}>
              <Plus className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <List className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <CalendarDays className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 border-b">
          {dayHeaders.map(d => (
            <div key={d} className="text-center text-xs font-semibold text-muted-foreground py-2 border-r last:border-r-0">
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

      {/* Create meeting dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Meeting</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Title</Label>
              <Input value={newMeeting.title} onChange={e => setNewMeeting(prev => ({ ...prev, title: e.target.value }))} />
            </div>
            <div>
              <Label>Date</Label>
              <p className="text-sm text-muted-foreground">{format(newMeeting.meeting_date, 'PPP')}</p>
            </div>
            <div>
              <Label>Time</Label>
              <Input type="time" value={newMeeting.meeting_time} onChange={e => setNewMeeting(prev => ({ ...prev, meeting_time: e.target.value }))} />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={newMeeting.description} onChange={e => setNewMeeting(prev => ({ ...prev, description: e.target.value }))} />
            </div>
            <Button onClick={handleCreateMeeting} className="w-full" disabled={!newMeeting.title.trim()}>Create Meeting</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
