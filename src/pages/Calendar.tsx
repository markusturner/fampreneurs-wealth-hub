import { useState, useEffect } from "react"
import { Plus, ChevronLeft, ChevronRight, FileText, Edit, Save, X, Clock, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay, addMonths, subMonths } from "date-fns"
import { formatInTimeZone } from "date-fns-tz"
import { cn } from "@/lib/utils"
import { NavHeader } from "@/components/dashboard/nav-header"
import { MeetingTypesManager } from "@/components/dashboard/meeting-types-manager"
import { CalendarIntegrationButton } from "@/components/dashboard/calendar-integration-button"
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
  scribe_notes: string | null
  scribe_id: string | null
  status: string
  location: string | null
  attendees: string[] | null
  created_at: string
  updated_at: string
}

interface MeetingType {
  id: string
  name: string
  color: string
  description: string | null
  is_active: boolean
}

export default function Calendar() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [meetingTypes, setMeetingTypes] = useState<MeetingType[]>([])
  const [loading, setLoading] = useState(true)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null)
  const [isCreateMeetingOpen, setIsCreateMeetingOpen] = useState(false)
  const [editingNotes, setEditingNotes] = useState(false)
  const [isEditingMeeting, setIsEditingMeeting] = useState(false)
  const [selectedTimezone, setSelectedTimezone] = useState('America/New_York')
  const [newMeeting, setNewMeeting] = useState({
    title: '',
    description: '',
    meeting_date: new Date(),
    meeting_time: '10:00',
    meeting_type: '',
    location: '',
    attendees: '',
    zoom_link: ''
  })

  // Common timezones list
  const timezones = [
    { value: 'America/New_York', label: 'Eastern Time (ET)' },
    { value: 'America/Chicago', label: 'Central Time (CT)' },
    { value: 'America/Denver', label: 'Mountain Time (MT)' },
    { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
    { value: 'America/Phoenix', label: 'Arizona Time (MST)' },
    { value: 'America/Anchorage', label: 'Alaska Time (AKST)' },
    { value: 'Pacific/Honolulu', label: 'Hawaii Time (HST)' },
    { value: 'Europe/London', label: 'London (GMT/BST)' },
    { value: 'Europe/Paris', label: 'Paris (CET/CEST)' },
    { value: 'Europe/Berlin', label: 'Berlin (CET/CEST)' },
    { value: 'Europe/Rome', label: 'Rome (CET/CEST)' },
    { value: 'Europe/Madrid', label: 'Madrid (CET/CEST)' },
    { value: 'Europe/Moscow', label: 'Moscow (MSK)' },
    { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
    { value: 'Asia/Shanghai', label: 'Shanghai (CST)' },
    { value: 'Asia/Hong_Kong', label: 'Hong Kong (HKT)' },
    { value: 'Asia/Singapore', label: 'Singapore (SGT)' },
    { value: 'Asia/Dubai', label: 'Dubai (GST)' },
    { value: 'Asia/Kolkata', label: 'Mumbai (IST)' },
    { value: 'Australia/Sydney', label: 'Sydney (AEDT/AEST)' },
    { value: 'Australia/Melbourne', label: 'Melbourne (AEDT/AEST)' },
    { value: 'Pacific/Auckland', label: 'Auckland (NZDT/NZST)' },
    { value: 'UTC', label: 'UTC (Coordinated Universal Time)' }
  ]

  useEffect(() => {
    fetchMeetings()
    fetchMeetingTypes()
  }, [])

  const fetchMeetingTypes = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('get-meeting-types')
      if (error) throw error
      const list = (data as any)?.meeting_types || []
      setMeetingTypes(list)
    } catch (error) {
      console.error('Error fetching meeting types:', error)
      toast({ title: 'Notice', description: 'Meeting types unavailable; using defaults.', })
    }
  }

  const getMeetingTypeColor = (meetingTypeName: string | null) => {
    if (!meetingTypeName) return ''
    
    const meetingType = meetingTypes.find(type => type.name === meetingTypeName)
    if (meetingType) {
      return ''
    }
    return ''
  }

  const getMeetingTypeStyle = (meetingTypeName: string | null) => {
    if (!meetingTypeName) return { backgroundColor: '#ffb500', color: '#290a52' }
    
    const meetingType = meetingTypes.find(type => type.name === meetingTypeName)
    if (meetingType) {
      return { backgroundColor: meetingType.color, color: '#290a52' }
    }
    return { backgroundColor: '#ffb500', color: '#290a52' }
  }

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
      toast({
        title: "Error",
        description: "Failed to fetch meetings",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCreateMeeting = async () => {
    if (!user?.id || !newMeeting.title.trim() || !newMeeting.meeting_time.trim()) {
      toast({
        title: "Error",
        description: "Please fill in meeting title and time",
        variant: "destructive"
      })
      return
    }

    try {
      const attendeesArray = newMeeting.attendees
        ? newMeeting.attendees.split(',').map(a => a.trim()).filter(a => a)
        : []

      const { data: insertedMeeting, error } = await supabase
        .from('meetings' as any)
        .insert({
          title: newMeeting.title.trim(),
          description: newMeeting.description.trim() || null,
          meeting_date: format(newMeeting.meeting_date, 'yyyy-MM-dd'),
          meeting_time: newMeeting.meeting_time,
          meeting_type: newMeeting.meeting_type || null,
          location: newMeeting.location.trim() || null,
          attendees: attendeesArray.length > 0 ? attendeesArray : null,
          created_by: user.id,
          status: 'scheduled',
          zoom_link: newMeeting.zoom_link.trim() || null
        })
        .select()
        .single()

      if (error) throw error

      // Send notifications to all users with reminders
      const meetingData = insertedMeeting as any
      if (meetingData?.id) {
        try {
          await supabase.functions.invoke('notify-meeting-creation', {
            body: {
              meetingId: meetingData.id,
              meetingTitle: newMeeting.title.trim(),
              meetingDate: format(newMeeting.meeting_date, 'yyyy-MM-dd'),
              meetingTime: newMeeting.meeting_time,
              createdBy: user.id,
              zoomLink: newMeeting.zoom_link.trim() || null,
              location: newMeeting.location.trim() || null
            }
          });
        } catch (notifyError) {
          console.error('Error sending notifications:', notifyError);
          // Don't fail the meeting creation if notifications fail
        }
      }

      toast({
        title: "Success",
        description: "Meeting created with scheduled reminders"
      })

      setNewMeeting({
        title: '',
        description: '',
        meeting_date: new Date(),
        meeting_time: '10:00',
        meeting_type: '',
        location: '',
        attendees: '',
        zoom_link: ''
      })
      setIsCreateMeetingOpen(false)
      fetchMeetings()
    } catch (error) {
      console.error('Error creating meeting:', error)
      toast({
        title: "Error",
        description: "Failed to create meeting",
        variant: "destructive"
      })
    }
  }

  const handleUpdateNotes = async (meetingId: string, notes: string) => {
    try {
      const { error } = await supabase
        .from('meetings' as any)
        .update({ 
          scribe_notes: notes.trim() || null,
          scribe_id: user?.id
        })
        .eq('id', meetingId)

      if (error) throw error

      toast({
        title: "Success",
        description: "Meeting notes updated successfully"
      })

      setEditingNotes(false)
      fetchMeetings()
      
      // Update selected meeting if it's the one being edited
      if (selectedMeeting?.id === meetingId) {
        setSelectedMeeting(prev => prev ? { ...prev, scribe_notes: notes.trim() || null } : null)
      }
    } catch (error) {
      console.error('Error updating notes:', error)
      toast({
        title: "Error",
        description: "Failed to update meeting notes",
        variant: "destructive"
      })
    }
  }

  const handleUpdateMeeting = async () => {
    if (!selectedMeeting || !user?.id) {
      toast({
        title: "Error",
        description: "Unable to update meeting",
        variant: "destructive"
      })
      return
    }

    try {
      const { error } = await supabase
        .from('meetings' as any)
        .update({
          title: selectedMeeting.title,
          description: selectedMeeting.description || null,
          meeting_date: format(new Date(selectedMeeting.meeting_date), 'yyyy-MM-dd'),
          meeting_time: selectedMeeting.meeting_time,
          meeting_type: selectedMeeting.meeting_type || null,
          location: selectedMeeting.location || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedMeeting.id)

      if (error) throw error

      toast({
        title: "Success",
        description: "Meeting updated successfully"
      })

      setIsEditingMeeting(false)
      fetchMeetings()
    } catch (error) {
      console.error('Error updating meeting:', error)
      toast({
        title: "Error",
        description: "Failed to update meeting",
        variant: "destructive"
      })
    }
  }

  const handleDeleteMeeting = async () => {
    if (!selectedMeeting || !user?.id) return

    if (!confirm('Are you sure you want to delete this meeting?')) return

    try {
      const { error } = await supabase
        .from('meetings' as any)
        .delete()
        .eq('id', selectedMeeting.id)

      if (error) throw error

      toast({
        title: "Success",
        description: "Meeting deleted successfully"
      })

      setSelectedMeeting(null)
      fetchMeetings()
    } catch (error) {
      console.error('Error deleting meeting:', error)
      toast({
        title: "Error",
        description: "Failed to delete meeting",
        variant: "destructive"
      })
    }
  }

  // Calendar grid logic
  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(monthStart)
  const startDate = startOfWeek(monthStart)
  const endDate = endOfWeek(monthEnd)

  const dateFormat = "d"
  const rows = []
  let days = []
  let day = startDate

  while (day <= endDate) {
    for (let i = 0; i < 7; i++) {
      const cloneDay = day
      const dayMeetings = meetings.filter(meeting => 
        isSameDay(new Date(meeting.meeting_date), cloneDay)
      )

      days.push(
        <div
          key={day.toString()}
          className={cn(
            "min-h-[80px] sm:min-h-[120px] border-r border-b border-border p-1 sm:p-2 cursor-pointer hover:bg-muted/50 touch-optimized transition-smooth",
            !isSameMonth(day, monthStart) && "bg-muted/20 text-muted-foreground",
            isSameDay(day, new Date()) && "bg-primary/10"
          )}
          onClick={() => {
            setNewMeeting(prev => ({ ...prev, meeting_date: day }))
            setIsCreateMeetingOpen(true)
          }}
        >
          <div className={cn(
            "text-xs sm:text-sm font-medium mb-1 sm:mb-2",
            isSameDay(day, new Date()) && "bg-primary text-primary-foreground rounded-full w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center text-xs"
          )}>
            {format(cloneDay, dateFormat)}
          </div>
          <div className="space-y-0.5 sm:space-y-1">
            {dayMeetings.slice(0, window.innerWidth < 640 ? 2 : 3).map((meeting) => (
              <div
                key={meeting.id}
                className={cn(
                  "text-[10px] sm:text-xs p-0.5 sm:p-1 rounded truncate cursor-pointer touch-target",
                  getMeetingTypeColor(meeting.meeting_type)
                )}
                style={getMeetingTypeStyle(meeting.meeting_type)}
                onClick={(e) => {
                  e.stopPropagation()
                  setSelectedMeeting(meeting)
                }}
              >
                <span className="hidden sm:inline">{meeting.meeting_time} - </span>
                {meeting.title}
              </div>
            ))}
            {dayMeetings.length > (window.innerWidth < 640 ? 2 : 3) && (
              <div className="text-[10px] sm:text-xs text-muted-foreground">
                +{dayMeetings.length - (window.innerWidth < 640 ? 2 : 3)} more
              </div>
            )}
          </div>
        </div>
      )
      day = addDays(day, 1)
    }
    rows.push(
      <div key={day.toString()} className="grid grid-cols-7">
        {days}
      </div>
    )
    days = []
  }

  const getCurrentTime = () => {
    const now = new Date()
    const selectedTz = timezones.find(tz => tz.value === selectedTimezone)
    const timeString = formatInTimeZone(now, selectedTimezone, 'h:mm aaa')
    return `${timeString} ${selectedTz?.label.split(' ')[0] || selectedTimezone}`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <NavHeader />
        <div className="container mx-auto p-4 lg:p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/4"></div>
            <div className="h-96 bg-muted rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <NavHeader />
      <div className="container mx-auto mobile-container space-y-4 sm:space-y-6 px-3 sm:px-4 lg:px-6 py-4 sm:py-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
            <div className="flex items-center justify-between sm:justify-start gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setCurrentDate(new Date())}
                className="touch-target"
              >
                Today
              </Button>
              <div className="flex items-center gap-1">
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setCurrentDate(subMonths(currentDate, 1))}
                  className="touch-target"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <h1 className="text-lg sm:text-2xl font-bold min-w-[140px] sm:min-w-[200px] text-center">
                  {format(currentDate, 'MMM yyyy')}
                </h1>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setCurrentDate(addMonths(currentDate, 1))}
                  className="touch-target"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-2 text-xs sm:text-sm text-muted-foreground hover:text-foreground">
                    <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span>{getCurrentTime()}</span>
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-0" align="start">
                  <div className="p-3 border-b">
                    <h4 className="font-medium text-sm">Select Timezone</h4>
                    <p className="text-xs text-muted-foreground">Choose your preferred timezone for calendar display</p>
                  </div>
                  <div className="max-h-60 overflow-y-auto">
                    {timezones.map((timezone) => (
                      <button
                        key={timezone.value}
                        className={cn(
                          "w-full px-3 py-2 text-left text-sm hover:bg-muted transition-colors",
                          selectedTimezone === timezone.value && "bg-muted font-medium"
                        )}
                        onClick={() => {
                          setSelectedTimezone(timezone.value)
                        }}
                      >
                        <div className="flex justify-between items-center">
                          <span>{timezone.label}</span>
                          <span className="text-xs text-muted-foreground">
                            {formatInTimeZone(new Date(), timezone.value, 'HH:mm')}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <div className="hidden sm:block">
              <MeetingTypesManager onMeetingTypesChange={fetchMeetingTypes} />
            </div>
            
            <Dialog open={isCreateMeetingOpen} onOpenChange={setIsCreateMeetingOpen}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2 touch-target" size="sm">
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline">Schedule Meeting</span>
                  <span className="sm:hidden">New</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Schedule New Meeting</DialogTitle>
                  <DialogDescription>
                    Create a new meeting for your family office
                  </DialogDescription>
                </DialogHeader>
                
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="title">Meeting Title *</Label>
                    <Input
                      id="title"
                      value={newMeeting.title}
                      onChange={(e) => setNewMeeting(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="Enter meeting title"
                    />
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="type">Meeting Type</Label>
                    <Select value={newMeeting.meeting_type} onValueChange={(value) => setNewMeeting(prev => ({ ...prev, meeting_type: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select meeting type" />
                      </SelectTrigger>
                      <SelectContent>
                        {meetingTypes.map(type => (
                          <SelectItem key={type.id} value={type.name}>
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-3 h-3 rounded"
                                style={{ backgroundColor: type.color }}
                              />
                              {type.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label>Meeting Date *</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className="justify-start text-left font-normal"
                          >
                            {format(newMeeting.meeting_date, "PPP")}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 z-[100]" align="start">
                          <CalendarComponent
                            mode="single"
                            selected={newMeeting.meeting_date}
                            onSelect={(date) => setNewMeeting(prev => ({ ...prev, meeting_date: date || new Date() }))}
                            initialFocus
                            className="pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    
                    <div className="grid gap-2">
                      <Label htmlFor="time">Meeting Time *</Label>
                      <Input
                        id="time"
                        type="time"
                        value={newMeeting.meeting_time}
                        onChange={(e) => setNewMeeting(prev => ({ ...prev, meeting_time: e.target.value }))}
                      />
                    </div>
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      value={newMeeting.location}
                      onChange={(e) => setNewMeeting(prev => ({ ...prev, location: e.target.value }))}
                      placeholder="Physical location or address"
                    />
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="zoom_link">Zoom/Video Link</Label>
                    <Input
                      id="zoom_link"
                      value={newMeeting.zoom_link}
                      onChange={(e) => setNewMeeting(prev => ({ ...prev, zoom_link: e.target.value }))}
                      placeholder="https://zoom.us/j/..."
                    />
                    <p className="text-xs text-muted-foreground">
                      This link will be included in all reminder notifications
                    </p>
                    
                    <div className="mt-3">
                      <CalendarIntegrationButton autoOpen={isCreateMeetingOpen} />
                    </div>
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={newMeeting.description}
                      onChange={(e) => setNewMeeting(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Meeting description or agenda"
                      rows={3}
                    />
                  </div>
                </div>
                
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setIsCreateMeetingOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateMeeting}>
                    Create Meeting
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="border border-border rounded-lg overflow-hidden">
          {/* Day headers */}
          <div className="grid grid-cols-7 bg-muted/50">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, index) => (
              <div key={day} className="p-2 sm:p-4 text-center font-medium border-r border-border last:border-r-0">
                <span className="text-xs sm:text-sm">
                  <span className="sm:hidden">{day.slice(0, 1)}</span>
                  <span className="hidden sm:inline">{day}</span>
                </span>
              </div>
            ))}
          </div>
          {/* Calendar rows */}
          {rows}
        </div>
        
        {/* Mobile Bottom Spacing */}
        <div className="pb-16 md:pb-0" />

        {/* Meeting Detail Dialog */}
        {selectedMeeting && (
          <Dialog open={!!selectedMeeting} onOpenChange={() => {
            setSelectedMeeting(null)
            setIsEditingMeeting(false)
          }}>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <DialogTitle className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={getMeetingTypeStyle(selectedMeeting.meeting_type)}
                    />
                    {isEditingMeeting ? 'Edit Meeting' : selectedMeeting.title}
                  </DialogTitle>
                  {!isEditingMeeting && (
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsEditingMeeting(true)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleDeleteMeeting}
                        className="text-destructive hover:text-destructive"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
                {!isEditingMeeting && (
                  <DialogDescription>
                    {format(new Date(selectedMeeting.meeting_date), 'EEEE, MMMM d, yyyy')} at {selectedMeeting.meeting_time}
                  </DialogDescription>
                )}
              </DialogHeader>
              
              {isEditingMeeting ? (
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="edit-title">Meeting Title *</Label>
                    <Input
                      id="edit-title"
                      value={selectedMeeting.title}
                      onChange={(e) => setSelectedMeeting(prev => prev ? { ...prev, title: e.target.value } : null)}
                    />
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="edit-type">Meeting Type</Label>
                    <Select 
                      value={selectedMeeting.meeting_type || ''} 
                      onValueChange={(value) => setSelectedMeeting(prev => prev ? { ...prev, meeting_type: value } : null)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select meeting type" />
                      </SelectTrigger>
                      <SelectContent>
                        {meetingTypes.map(type => (
                          <SelectItem key={type.id} value={type.name}>
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-3 h-3 rounded"
                                style={{ backgroundColor: type.color }}
                              />
                              {type.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label>Meeting Date *</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className="justify-start text-left font-normal"
                          >
                            {format(new Date(selectedMeeting.meeting_date), "PPP")}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 z-[100]" align="start">
                          <CalendarComponent
                            mode="single"
                            selected={new Date(selectedMeeting.meeting_date)}
                            onSelect={(date) => setSelectedMeeting(prev => prev && date ? { ...prev, meeting_date: format(date, 'yyyy-MM-dd') } : prev)}
                            initialFocus
                            className="pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    
                    <div className="grid gap-2">
                      <Label htmlFor="edit-time">Meeting Time *</Label>
                      <Input
                        id="edit-time"
                        type="time"
                        value={selectedMeeting.meeting_time}
                        onChange={(e) => setSelectedMeeting(prev => prev ? { ...prev, meeting_time: e.target.value } : null)}
                      />
                    </div>
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="edit-location">Location</Label>
                    <Input
                      id="edit-location"
                      value={selectedMeeting.location || ''}
                      onChange={(e) => setSelectedMeeting(prev => prev ? { ...prev, location: e.target.value } : null)}
                      placeholder="Meeting location or video link"
                    />
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="edit-description">Description</Label>
                    <Textarea
                      id="edit-description"
                      value={selectedMeeting.description || ''}
                      onChange={(e) => setSelectedMeeting(prev => prev ? { ...prev, description: e.target.value } : null)}
                      placeholder="Meeting description or agenda"
                      rows={3}
                    />
                  </div>
                  
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsEditingMeeting(false)
                        fetchMeetings()
                      }}
                    >
                      Cancel
                    </Button>
                    <Button onClick={handleUpdateMeeting}>
                      <Save className="h-4 w-4 mr-2" />
                      Save Changes
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {selectedMeeting.description && (
                    <div>
                      <h4 className="font-medium mb-2">Description</h4>
                      <p className="text-sm text-muted-foreground">{selectedMeeting.description}</p>
                    </div>
                  )}
                  
                  {selectedMeeting.location && (
                    <div>
                      <h4 className="font-medium mb-2">Location</h4>
                      <p className="text-sm text-muted-foreground">{selectedMeeting.location}</p>
                    </div>
                  )}
                  
                  <div className="border-t pt-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Scribe Notes
                      </h4>
                      {!editingNotes && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingNotes(true)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    
                    {editingNotes ? (
                      <div className="space-y-2">
                        <Textarea
                          defaultValue={selectedMeeting.scribe_notes || ''}
                          placeholder="Add meeting notes..."
                          rows={6}
                          id="meeting-notes"
                        />
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingNotes(false)}
                          >
                            <X className="h-4 w-4" />
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => {
                              const textarea = document.getElementById('meeting-notes') as HTMLTextAreaElement
                              handleUpdateNotes(selectedMeeting.id, textarea.value)
                            }}
                          >
                            <Save className="h-4 w-4" />
                            Save Notes
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-md">
                        {selectedMeeting.scribe_notes || 'No notes added yet. Click the edit button to add notes.'}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  )
}