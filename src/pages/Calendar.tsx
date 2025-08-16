import { useState, useEffect } from "react"
import { Plus, FileText, Clock, CalendarIcon, User, Edit, Save, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { NavHeader } from "@/components/dashboard/nav-header"
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

export default function Calendar() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [loading, setLoading] = useState(true)
  const [isCreateMeetingOpen, setIsCreateMeetingOpen] = useState(false)
  const [editingNotes, setEditingNotes] = useState<string | null>(null)
  const [newMeeting, setNewMeeting] = useState({
    title: '',
    description: '',
    meeting_date: new Date(),
    meeting_time: '',
    meeting_type: '',
    location: '',
    attendees: ''
  })

  const meetingTypes = [
    'Board Meeting',
    'Family Meeting',
    'Investment Review',
    'Estate Planning',
    'Tax Planning',
    'Philanthropy',
    'Team Meeting',
    'Other'
  ]

  useEffect(() => {
    fetchMeetings()
  }, [])

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

      setEditingNotes(null)
      fetchMeetings()
    } catch (error) {
      console.error('Error updating notes:', error)
      toast({
        title: "Error",
        description: "Failed to update meeting notes",
        variant: "destructive"
      })
    }
  }

  const getStatusColor = (status: string) => {
    const colors = {
      'scheduled': 'bg-blue-100 text-blue-800',
      'in-progress': 'bg-yellow-100 text-yellow-800',
      'completed': 'bg-green-100 text-green-800',
      'cancelled': 'bg-red-100 text-red-800'
    }
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <NavHeader />
        <div className="container mx-auto p-4 lg:p-6">
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-4 bg-muted rounded w-1/3 mb-4"></div>
                  <div className="h-3 bg-muted rounded w-2/3"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <NavHeader />
      <div className="container mx-auto p-4 lg:p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold">Meeting Calendar</h1>
            <p className="text-muted-foreground mt-1">
              Manage meetings and scribe notes for your family office
            </p>
          </div>
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
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={newMeeting.description}
                    onChange={(e) => setNewMeeting(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Meeting description or agenda"
                    rows={3}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Meeting Date *</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "justify-start text-left font-normal",
                            !newMeeting.meeting_date && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {newMeeting.meeting_date ? format(newMeeting.meeting_date, "PPP") : "Pick a date"}
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
                  <Label htmlFor="type">Meeting Type</Label>
                  <Select value={newMeeting.meeting_type} onValueChange={(value) => setNewMeeting(prev => ({ ...prev, meeting_type: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select meeting type" />
                    </SelectTrigger>
                    <SelectContent>
                      {meetingTypes.map(type => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                  <Label htmlFor="attendees">Attendees</Label>
                  <Input
                    id="attendees"
                    value={newMeeting.attendees}
                    onChange={(e) => setNewMeeting(prev => ({ ...prev, attendees: e.target.value }))}
                    placeholder="Comma-separated list of attendees"
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

        <div className="space-y-4">
          {meetings.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <CalendarIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-medium mb-2">No meetings scheduled</h3>
                <p className="text-muted-foreground mb-4">
                  Create your first meeting to get started
                </p>
              </CardContent>
            </Card>
          ) : (
            meetings.map((meeting) => (
              <Card key={meeting.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-lg">{meeting.title}</CardTitle>
                      {meeting.description && (
                        <CardDescription>{meeting.description}</CardDescription>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant="outline" 
                        className={`text-xs ${getStatusColor(meeting.status)}`}
                      >
                        {meeting.status}
                      </Badge>
                      {meeting.meeting_type && (
                        <Badge variant="secondary" className="text-xs">
                          {meeting.meeting_type}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                      <span>{new Date(meeting.meeting_date).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>{meeting.meeting_time}</span>
                    </div>
                    {meeting.location && (
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span>{meeting.location}</span>
                      </div>
                    )}
                  </div>
                  
                  {meeting.attendees && meeting.attendees.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium mb-2">Attendees:</h4>
                      <div className="flex flex-wrap gap-1">
                        {meeting.attendees.map((attendee, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {attendee}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div className="border-t pt-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-medium flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Scribe Notes
                      </h4>
                      {editingNotes !== meeting.id && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingNotes(meeting.id)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    
                    {editingNotes === meeting.id ? (
                      <div className="space-y-2">
                        <Textarea
                          defaultValue={meeting.scribe_notes || ''}
                          placeholder="Add meeting notes..."
                          rows={4}
                          id={`notes-${meeting.id}`}
                        />
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingNotes(null)}
                          >
                            <X className="h-4 w-4" />
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => {
                              const textarea = document.getElementById(`notes-${meeting.id}`) as HTMLTextAreaElement
                              handleUpdateNotes(meeting.id, textarea.value)
                            }}
                          >
                            <Save className="h-4 w-4" />
                            Save Notes
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-md">
                        {meeting.scribe_notes || 'No notes added yet. Click the edit button to add notes.'}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  )
}