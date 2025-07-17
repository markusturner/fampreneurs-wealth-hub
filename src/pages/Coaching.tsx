import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { NavHeader } from "@/components/dashboard/nav-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Loader2, Calendar as CalendarIcon, Clock, User, Video, Phone, Users, Star, CheckCircle, Plus, ChevronLeft, ChevronRight, List, Grid } from 'lucide-react'
import { format, isSameDay, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, addMonths, subMonths, getDay } from 'date-fns'
import { cn } from '@/lib/utils'
import { supabase } from '@/integrations/supabase/client'
import { ScheduleSessionDialog } from '@/components/coaching/schedule-session-dialog'

interface GroupSession {
  id: string
  title: string
  description?: string
  coach_name: string
  coach_avatar_url?: string
  session_date: string
  session_time: string
  duration_minutes: number
  meeting_type: string
  meeting_url: string
  meeting_id?: string
  meeting_password?: string
  image_url?: string
  max_participants: number
  current_participants: number
  is_recurring: boolean
  recurrence_pattern?: string
  recurrence_end_date?: string
  status: string
  created_by: string
  created_at: string
  updated_at: string
}

const Coaching = () => {
  const { user, profile, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading coaching calendar...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date())
  const [viewType, setViewType] = useState<'month' | 'list'>('month')
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false)
  const [sessions, setSessions] = useState<GroupSession[]>([])
  const [loadingSessions, setLoadingSessions] = useState(true)

  const displayName = profile?.display_name || profile?.first_name || 'Member'

  // Fetch sessions from database
  const fetchSessions = async () => {
    setLoadingSessions(true)
    try {
      const { data, error } = await supabase
        .from('group_coaching_sessions')
        .select('*')
        .eq('status', 'scheduled')
        .order('session_date', { ascending: true })
        .order('session_time', { ascending: true })

      if (error) throw error
      setSessions(data || [])
    } catch (error) {
      console.error('Error fetching sessions:', error)
    } finally {
      setLoadingSessions(false)
    }
  }

  useEffect(() => {
    fetchSessions()
  }, [])

  // Convert database sessions to format compatible with existing UI
  const upcomingCalls = sessions.map(session => {
    // Handle time formatting safely
    let formattedTime = 'TBD'
    try {
      const timeParts = session.session_time.split(':')
      const hours = parseInt(timeParts[0])
      const minutes = parseInt(timeParts[1])
      const date = new Date()
      date.setHours(hours, minutes, 0, 0)
      formattedTime = format(date, 'h:mmaaa')
    } catch (error) {
      console.error('Error formatting time:', error)
    }

    return {
      id: session.id,
      title: session.title,
      coach: session.coach_name,
      date: session.session_date,
      time: formattedTime,
      type: "Group Coaching",
      status: "confirmed",
      avatar: session.coach_avatar_url || "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=100&h=100&fit=crop&crop=face",
      participants: session.current_participants,
      maxParticipants: session.max_participants,
      zoomMeetingId: session.meeting_id || "",
      zoomMeetingUrl: session.meeting_url,
      description: session.description,
      duration: session.duration_minutes,
      meetingType: session.meeting_type,
      image: session.image_url,
      isRecurring: session.is_recurring,
      recurrencePattern: session.recurrence_pattern
    }
  })

  // Sample coaches data - keep for now

  const availableCoaches = [
    {
      id: 1,
      name: "Sarah Johnson",
      title: "Certified Financial Planner",
      speciality: "Wealth Management & Tax Strategy",
      rating: 4.9,
      reviews: 127,
      hourlyRate: "$300",
      avatar: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=100&h=100&fit=crop&crop=face",
      nextAvailable: "Today, 4:00 PM"
    },
    {
      id: 2,
      name: "Michael Chen",
      title: "Chartered Financial Analyst", 
      speciality: "Investment Strategy & Portfolio Management",
      rating: 4.8,
      reviews: 89,
      hourlyRate: "$350",
      avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face",
      nextAvailable: "Tomorrow, 9:00 AM"
    },
    {
      id: 3,
      name: "Elizabeth Davis",
      title: "Estate Planning Attorney",
      speciality: "Estate Planning & Family Governance",
      rating: 4.9,
      reviews: 156,
      hourlyRate: "$400",
      avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face",
      nextAvailable: "Next Week"
    }
  ]

  // Get sessions for specific date
  const getSessionsForDate = (date: Date) => {
    return upcomingCalls.filter(call => 
      isSameDay(parseISO(call.date), date)
    )
  }

  // Generate calendar days
  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const calendarDays = eachDayOfInterval({ start: monthStart, end: monthEnd })
  
  // Add padding days to start from Monday
  const startDay = getDay(monthStart)
  const paddingDays = startDay === 0 ? 6 : startDay - 1 // Convert Sunday (0) to 6, Monday (1) to 0, etc.
  
  const allDays = [
    ...Array(paddingDays).fill(null),
    ...calendarDays
  ]

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth(prev => direction === 'prev' ? subMonths(prev, 1) : addMonths(prev, 1))
  }

  return (
    <div className="min-h-screen bg-background">
      <NavHeader onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
      
      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6 max-w-6xl">
        {/* Welcome Section */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
              Calendar
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1">
              Manage your schedule and coaching sessions
            </p>
          </div>
          <Button className="gap-2" onClick={() => setScheduleDialogOpen(true)}>
            <CalendarIcon className="h-4 w-4" />
            <span className="hidden sm:inline">Schedule New Call</span>
            <span className="sm:hidden">Schedule</span>
          </Button>
        </div>

        {/* Group Coaching Calendar */}
        <Card className="shadow-soft">
          <CardHeader className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5" />
                <CardTitle className="text-lg font-bold">Group Coaching Calendar</CardTitle>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant={viewType === 'month' ? 'default' : 'outline'} 
                  size="sm"
                  onClick={() => setViewType('month')}
                  className="gap-2"
                >
                  <Grid className="h-4 w-4" />
                  Month
                </Button>
                <Button 
                  variant={viewType === 'list' ? 'default' : 'outline'} 
                  size="sm"
                  onClick={() => setViewType('list')}
                  className="gap-2"
                >
                  <List className="h-4 w-4" />
                  List
                </Button>
                <Button 
                  size="sm"
                  onClick={() => setScheduleDialogOpen(true)}
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" />
                  <span className="hidden lg:inline">Add Coach & Call</span>
                  <span className="lg:hidden">Add Call</span>
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            {viewType === 'month' ? (
              <div className="space-y-4">
                {/* Calendar Header */}
                <div className="flex items-center justify-between">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigateMonth('prev')}
                    className="gap-2"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  
                  <div className="text-center">
                    <h2 className="text-xl font-semibold">
                      {format(currentMonth, 'MMMM yyyy')}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(), 'h:mmaaa')} New York time
                    </p>
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigateMonth('next')}
                    className="gap-2"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>

                {/* Calendar Grid */}
                <div className="border rounded-lg overflow-hidden bg-card">
                  {/* Day Headers */}
                  <div className="grid grid-cols-7 border-b bg-muted/30">
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                      <div key={day} className="p-3 text-center text-sm font-medium text-muted-foreground border-r last:border-r-0">
                        {day}
                      </div>
                    ))}
                  </div>
                  
                  {/* Calendar Days */}
                  <div className="grid grid-cols-7">
                    {allDays.map((day, index) => {
                      if (!day) {
                        return <div key={index} className="h-24 border-r border-b last:border-r-0" />
                      }
                      
                      const dayEvents = getSessionsForDate(day)
                      const isCurrentMonth = isSameMonth(day, currentMonth)
                      const isDayToday = isToday(day)
                      
                      return (
                        <div 
                          key={day.toISOString()} 
                          className={cn(
                            "h-24 border-r border-b last:border-r-0 p-2 relative overflow-hidden",
                            !isCurrentMonth && "bg-muted/20",
                            isDayToday && "bg-primary/5"
                          )}
                        >
                          <div className={cn(
                            "text-sm font-medium mb-1",
                            !isCurrentMonth && "text-muted-foreground",
                            isDayToday && "bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs"
                          )}>
                            {format(day, 'd')}
                          </div>
                          
                          <div className="space-y-1">
                            {dayEvents.slice(0, 2).map((event, eventIndex) => (
                              <div 
                                key={event.id}
                                className="text-xs p-1 bg-primary/10 text-primary rounded truncate cursor-pointer hover:bg-primary/20 transition-colors"
                                title={`${event.time} - ${event.title}`}
                              >
                                {event.time} - {event.title.length > 12 ? event.title.substring(0, 12) + '...' : event.title}
                              </div>
                            ))}
                            {dayEvents.length > 2 && (
                              <div className="text-xs text-muted-foreground">
                                +{dayEvents.length - 2} more
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            ) : (
              /* List View */
              <div className="space-y-4">
                {upcomingCalls.map((session) => (
                  <div key={session.id} className="p-4 bg-muted/30 rounded-lg space-y-3 border">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={session.avatar} />
                        <AvatarFallback>{session.coach.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-sm truncate">{session.title}</h4>
                        <p className="text-xs text-muted-foreground">{session.coach}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">{format(parseISO(session.date), 'MMM d, yyyy')}</div>
                        <div className="text-xs text-muted-foreground">{session.time}</div>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        className="flex-1 text-xs"
                        onClick={() => window.open(session.zoomMeetingUrl, '_blank')}
                      >
                        <Video className="h-3 w-3 mr-1" />
                        Join Session
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="text-xs"
                      >
                        Details
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Available Coaches */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Available Coaches</h2>
          <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {availableCoaches.map((coach) => (
              <Card key={coach.id} className="shadow-soft hover:shadow-medium transition-smooth">
                <CardHeader className="p-4 sm:p-6">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-16 w-16">
                      <AvatarImage src={coach.avatar} />
                      <AvatarFallback>{coach.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-base leading-tight">{coach.name}</h3>
                      <p className="text-sm text-muted-foreground">{coach.title}</p>
                      <div className="flex items-center gap-1 mt-1">
                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                        <span className="text-xs">{coach.rating} ({coach.reviews} reviews)</span>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 space-y-3">
                  <div>
                    <p className="text-sm font-medium">Speciality</p>
                    <p className="text-sm text-muted-foreground">{coach.speciality}</p>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Next Available:</span>
                    <span className="font-medium">{coach.nextAvailable}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold text-primary">{coach.hourlyRate}/hr</span>
                    <Button size="sm" className="gap-2">
                      <CalendarIcon className="h-4 w-4" />
                      Book Session
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <Card className="shadow-soft text-center">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-primary">12</div>
              <div className="text-sm text-muted-foreground">Total Sessions</div>
            </CardContent>
          </Card>
          <Card className="shadow-soft text-center">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-accent">3</div>
              <div className="text-sm text-muted-foreground">This Month</div>
            </CardContent>
          </Card>
          <Card className="shadow-soft text-center">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-secondary">18</div>
              <div className="text-sm text-muted-foreground">Hours Coached</div>
            </CardContent>
          </Card>
          <Card className="shadow-soft text-center">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-muted-foreground">4.9</div>
              <div className="text-sm text-muted-foreground">Avg Rating</div>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Schedule Session Dialog */}
      <ScheduleSessionDialog
        open={scheduleDialogOpen}
        onOpenChange={setScheduleDialogOpen}
        onSessionCreated={fetchSessions}
      />
    </div>
  )
}

export default Coaching