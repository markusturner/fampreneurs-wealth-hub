import { useState, useEffect } from "react"
import { Plus, ChevronLeft, ChevronRight, FileText, Edit, Save, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay, addMonths, subMonths } from "date-fns"
import { cn } from "@/lib/utils"
import { NavHeader } from "@/components/dashboard/nav-header"
import { MeetingTypesManager } from "@/components/dashboard/meeting-types-manager"
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
  const [newMeeting, setNewMeeting] = useState({
    title: '',
    description: '',
    meeting_date: new Date(),
    meeting_time: '',
    meeting_type: '',
    location: '',
    attendees: ''
  })

  useEffect(() => {
    fetchMeetings()
    fetchMeetingTypes()
  }, [])

  const fetchMeetingTypes = async () => {
    try {
      const { data, error } = await supabase
        .from('meeting_types')
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: true })

      if (error) throw error
      setMeetingTypes(data || [])
    } catch (error) {
      console.error('Error fetching meeting types:', error)
    }
  }

  const getMeetingTypeColor = (meetingTypeName: string | null) => {
    if (!meetingTypeName) return 'bg-gray-500 text-white'
    
    const meetingType = meetingTypes.find(type => type.name === meetingTypeName)
    if (meetingType) {
      return `text-white`
    }
    return 'bg-gray-500 text-white'
  }

  const getMeetingTypeStyle = (meetingTypeName: string | null) => {
    if (!meetingTypeName) return { backgroundColor: '#6b7280' }
    
    const meetingType = meetingTypes.find(type => type.name === meetingTypeName)
    if (meetingType) {
      return { backgroundColor: meetingType.color }
    }
    return { backgroundColor: '#6b7280' }
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
    if (!user?.id || !newMeeting.title.trim()) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      })
      return
    }

    try {
      const attendeesArray = newMeeting.attendees
        ? newMeeting.attendees.split(',').map(a => a.trim()).filter(a => a)
        : []

      const { error } = await supabase
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
          status: 'scheduled'
        })

      if (error) throw error

      toast({
        title: "Success",
        description: "Meeting created successfully"
      })

      setNewMeeting({
        title: '',
        description: '',
        meeting_date: new Date(),
        meeting_time: '',
        meeting_type: '',
        location: '',
        attendees: ''
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
            "min-h-[120px] border-r border-b border-border p-2 cursor-pointer hover:bg-muted/50",
            !isSameMonth(day, monthStart) && "bg-muted/20 text-muted-foreground",
            isSameDay(day, new Date()) && "bg-primary/10"
          )}
          onClick={() => {
            setNewMeeting(prev => ({ ...prev, meeting_date: day }))
            setIsCreateMeetingOpen(true)
          }}
        >
          <div className={cn(
            "text-sm font-medium mb-2",
            isSameDay(day, new Date()) && "bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center"
          )}>
            {format(cloneDay, dateFormat)}
          </div>
          <div className="space-y-1">
            {dayMeetings.slice(0, 3).map((meeting) => (
              <div
                key={meeting.id}
                className={cn(
                  "text-xs p-1 rounded truncate cursor-pointer",
                  getMeetingTypeColor(meeting.meeting_type)
                )}
                style={getMeetingTypeStyle(meeting.meeting_type)}
                onClick={(e) => {
                  e.stopPropagation()
                  setSelectedMeeting(meeting)
                }}
              >
                {meeting.meeting_time} - {meeting.title}
              </div>
            ))}
            {dayMeetings.length > 3 && (
              <div className="text-xs text-muted-foreground">
                +{dayMeetings.length - 3} more
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
    return format(now, 'h:mmaaa') + ' New York time'
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
      <div className="container mx-auto p-4 lg:p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => setCurrentDate(new Date())}>
              Today
            </Button>
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setCurrentDate(subMonths(currentDate, 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <h1 className="text-2xl font-bold min-w-[200px] text-center">
                {format(currentDate, 'MMMM yyyy')}
              </h1>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setCurrentDate(addMonths(currentDate, 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <div className="text-sm text-muted-foreground">
              {getCurrentTime()}
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <MeetingTypesManager onMeetingTypesChange={fetchMeetingTypes} />
            
            <Dialog open={isCreateMeetingOpen} onOpenChange={setIsCreateMeetingOpen}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Schedule Meeting
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
                        <PopoverContent className="w-auto p-0" align="start">
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
                      placeholder="Meeting location or video link"
                    />
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
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
              <div key={day} className="p-4 text-center font-medium border-r border-border last:border-r-0">
                {day}
              </div>
            ))}
          </div>
          {/* Calendar rows */}
          {rows}
        </div>

        {/* Meeting Detail Dialog */}
        {selectedMeeting && (
          <Dialog open={!!selectedMeeting} onOpenChange={() => setSelectedMeeting(null)}>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={getMeetingTypeStyle(selectedMeeting.meeting_type)}
                  />
                  {selectedMeeting.title}
                </DialogTitle>
                <DialogDescription>
                  {format(new Date(selectedMeeting.meeting_date), 'EEEE, MMMM d, yyyy')} at {selectedMeeting.meeting_time}
                </DialogDescription>
              </DialogHeader>
              
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
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  )
}