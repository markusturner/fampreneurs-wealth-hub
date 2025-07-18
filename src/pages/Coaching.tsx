import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { NavHeader } from "@/components/dashboard/nav-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
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

interface IndividualSession {
  id: string
  title: string
  description?: string
  coach_id: string
  client_id: string
  session_date: string
  session_time: string
  duration_minutes: number
  meeting_type: string
  meeting_url: string
  meeting_id?: string
  meeting_password?: string
  status: string
  notes?: string
  created_by: string
  created_at: string
  updated_at: string
  // Join with financial_advisors table
  financial_advisors?: {
    full_name: string
    avatar_url?: string
  } | null
}

const Coaching = () => {
  // All hooks must be declared first, unconditionally
  const { user, profile, loading } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date())
  const [viewType, setViewType] = useState<'month' | 'list'>('month')
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false)
  const [sessions, setSessions] = useState<GroupSession[]>([])
  const [individualSessions, setIndividualSessions] = useState<IndividualSession[]>([])
  const [loadingSessions, setLoadingSessions] = useState(true)
  const [availableCoaches, setAvailableCoaches] = useState<any[]>([])
  const [loadingCoaches, setLoadingCoaches] = useState(true)
  const [calendarMode, setCalendarMode] = useState<'group' | 'individual'>('group')
  const [selectedSessionDialog, setSelectedSessionDialog] = useState<any>(null)

  const displayName = profile?.display_name || profile?.first_name || 'Member'

  // Fetch sessions from database
  const fetchSessions = async () => {
    setLoadingSessions(true)
    try {
      // Fetch group sessions including recurring ones
      const { data: groupData, error: groupError } = await supabase
        .from('group_coaching_sessions')
        .select('*')
        .eq('status', 'scheduled')
        .order('session_date', { ascending: true })
        .order('session_time', { ascending: true })

      if (groupError) throw groupError
      
      // Expand recurring sessions
      const expandedSessions = expandRecurringSessions(groupData || [])
      setSessions(expandedSessions)

      // Fetch individual sessions (only for current user)
      const { data: individualData, error: individualError } = await supabase
        .from('individual_coaching_sessions')
        .select(`
          *,
          financial_advisors (
            full_name
          )
        `)
        .eq('status', 'scheduled')
        .eq('client_id', user?.id)
        .order('session_date', { ascending: true })
        .order('session_time', { ascending: true })

      if (individualError) throw individualError
      setIndividualSessions((individualData as any) || [])
    } catch (error) {
      console.error('Error fetching sessions:', error)
    } finally {
      setLoadingSessions(false)
    }
  }

  // Fetch coaches from both tables - financial_advisors and coaches
  const fetchCoaches = async () => {
    setLoadingCoaches(true)
    try {
      // Fetch from financial_advisors table
      const { data: advisorData, error: advisorError } = await supabase
        .from('financial_advisors')
        .select('*')
        .eq('is_active', true)
        .order('full_name', { ascending: true })

      if (advisorError) throw advisorError

      // Fetch from coaches table (from admin dashboard)
      const { data: coachData, error: coachError } = await supabase
        .from('coaches')
        .select('*')
        .eq('is_active', true)
        .order('full_name', { ascending: true })

      if (coachError) throw coachError

      // Combine both datasets, avoiding duplicates by email
      const allCoaches = [...(advisorData || []), ...(coachData || [])]
      const uniqueCoaches = allCoaches.filter((coach, index, self) => 
        index === self.findIndex(c => c.email === coach.email && c.email) || !coach.email
      )

      setAvailableCoaches(uniqueCoaches || [])
    } catch (error) {
      console.error('Error fetching coaches:', error)
    } finally {
      setLoadingCoaches(false)
    }
  }

  // Single useEffect for all data fetching
  useEffect(() => {
    if (user) {
      fetchSessions()
      fetchCoaches()
    }
  }, [user])

  // Early returns after all hooks
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

  // Convert database sessions to format compatible with existing UI
  const upcomingGroupCalls = sessions.map(session => {
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

  // Convert individual sessions to format compatible with existing UI
  const upcomingIndividualCalls = individualSessions.map(session => {
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
      coach: session.financial_advisors?.full_name || 'Unknown Coach',
      date: session.session_date,
      time: formattedTime,
      type: "1-on-1 Session",
      status: "confirmed",
      avatar: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=100&h=100&fit=crop&crop=face",
      participants: 1,
      maxParticipants: 1,
      zoomMeetingId: session.meeting_id || "",
      zoomMeetingUrl: session.meeting_url,
      description: session.description,
      duration: session.duration_minutes,
      meetingType: session.meeting_type,
      notes: session.notes
    }
  })

  const currentCalls = calendarMode === 'group' ? upcomingGroupCalls : upcomingIndividualCalls

  // Get sessions for specific date
  const getSessionsForDate = (date: Date) => {
    return currentCalls.filter(call => 
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

  // Expand recurring sessions to show individual instances
  const expandRecurringSessions = (sessions: GroupSession[]) => {
    const expanded: GroupSession[] = []
    
    sessions.forEach(session => {
      if (session.is_recurring && session.recurrence_pattern) {
        // Generate instances for recurring sessions
        const baseDate = new Date(session.session_date)
        const endDate = session.recurrence_end_date ? new Date(session.recurrence_end_date) : new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) // 90 days from now
        
        let currentDate = new Date(baseDate)
        let instanceCount = 0
        
        while (currentDate <= endDate && instanceCount < 52) { // Max 52 instances
          // Add the recurring instance
          expanded.push({
            ...session,
            id: `${session.id}_${instanceCount}`,
            session_date: currentDate.toISOString().split('T')[0],
            title: instanceCount === 0 ? session.title : `${session.title} (Instance ${instanceCount + 1})`
          })
          
          // Calculate next occurrence based on recurrence pattern
          if (session.recurrence_pattern === 'weekly') {
            currentDate = new Date(currentDate.getTime() + 7 * 24 * 60 * 60 * 1000)
          } else if (session.recurrence_pattern === 'daily') {
            currentDate = new Date(currentDate.getTime() + 24 * 60 * 60 * 1000)
          } else if (session.recurrence_pattern === 'monthly') {
            currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, currentDate.getDate())
          } else {
            // Default to weekly if pattern is not recognized
            currentDate = new Date(currentDate.getTime() + 7 * 24 * 60 * 60 * 1000)
          }
          instanceCount++
        }
      } else {
        // Non-recurring session, add as-is
        expanded.push(session)
      }
    })
    
    return expanded
  }

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
        </div>

        {/* Group Coaching Calendar */}
        <Card className="shadow-soft">
          <CardHeader className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5" />
                <CardTitle className="text-lg font-bold">Coaching Calendar</CardTitle>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant={calendarMode === 'group' ? 'default' : 'outline'} 
                  size="sm"
                  onClick={() => setCalendarMode('group')}
                  className="gap-2"
                >
                  <Users className="h-4 w-4" />
                  Group Calls
                </Button>
                <Button 
                  variant={calendarMode === 'individual' ? 'default' : 'outline'} 
                  size="sm"
                  onClick={() => setCalendarMode('individual')}
                  className="gap-2"
                >
                  <User className="h-4 w-4" />
                  1-on-1 Calls
                </Button>
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
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            {viewType === 'month' ? (
              <div className="grid lg:grid-cols-4 gap-6">
                {/* Calendar - Takes up 3 columns */}
                <div className="lg:col-span-3 space-y-4">
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
                      <h2 className="text-xl font-semibold" style={{ color: '#290a52' }}>
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
                        <div key={day} className="p-2 sm:p-3 text-center text-xs sm:text-sm font-medium text-muted-foreground border-r last:border-r-0">
                          {day}
                        </div>
                      ))}
                    </div>
                    
                    {/* Calendar Days */}
                    <div className="grid grid-cols-7">
                      {allDays.map((day, index) => {
                        if (!day) {
                          return <div key={index} className="h-16 sm:h-24 border-r border-b last:border-r-0" />
                        }
                        
                        const dayEvents = getSessionsForDate(day)
                        const isCurrentMonth = isSameMonth(day, currentMonth)
                        const isDayToday = isToday(day)
                        
                        return (
                          <div 
                            key={day.toISOString()} 
                            className={cn(
                              "h-16 sm:h-24 border-r border-b last:border-r-0 p-1 sm:p-2 relative overflow-hidden",
                              !isCurrentMonth && "bg-muted/20",
                              isDayToday && "bg-primary/5"
                            )}
                          >
                            <div className={cn(
                              "text-xs sm:text-sm font-medium mb-1",
                              !isCurrentMonth && "text-muted-foreground",
                              isDayToday && "bg-red-500 text-white rounded-full w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center text-xs"
                            )}>
                              {format(day, 'd')}
                            </div>
                            
                            <div className="space-y-1">
                              {dayEvents.slice(0, 1).map((event, eventIndex) => (
                                <div
                                  key={eventIndex}
                                  className="text-xs p-1 rounded bg-primary/10 text-primary truncate cursor-pointer hover:bg-primary/20"
                                  onClick={() => setSelectedSessionDialog(event)}
                                >
                                  {event.title}
                                </div>
                              ))}
                              {dayEvents.length > 1 && (
                                <div className="text-xs text-muted-foreground">
                                  +{dayEvents.length - 1} more
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>

                {/* Available Coaches Sidebar - Takes up 1 column on the right */}
                <div className="lg:col-span-1">
                  <Card className="shadow-soft sticky top-4">
                    <CardHeader className="p-4">
                      <CardTitle className="flex items-center gap-2 text-lg font-bold">
                        <Star className="h-5 w-5" />
                        Available Coaches
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4">
                      {loadingCoaches ? (
                        <div className="space-y-4">
                          {[...Array(3)].map((_, i) => (
                            <Card key={i} className="animate-pulse">
                              <CardContent className="p-4">
                                <div className="h-4 bg-muted rounded mb-2"></div>
                                <div className="h-3 bg-muted rounded mb-1"></div>
                                <div className="h-3 bg-muted rounded"></div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      ) : availableCoaches.length === 0 ? (
                        <div className="text-center py-6">
                          <User className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                          <p className="text-sm text-muted-foreground">No coaches available</p>
                        </div>
                      ) : (
                        <div className="space-y-4 max-h-96 overflow-y-auto">
                          {availableCoaches.map((coach, index) => (
                            <Card key={index} className="shadow-sm hover:shadow-md transition-shadow">
                              <CardContent className="p-3 space-y-3">
                                <div className="flex items-center gap-3">
                                  <Avatar className="h-10 w-10">
                                    <AvatarImage src={coach.avatar_url || coach.coach_avatar_url} />
                                    <AvatarFallback className="bg-primary text-primary-foreground">
                                      {coach.full_name.charAt(0)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="flex-1 min-w-0">
                                    <h4 className="font-semibold truncate text-sm">{coach.full_name}</h4>
                                    <p className="text-xs text-muted-foreground truncate">{coach.title || coach.specialties?.[0] || 'Financial Coach'}</p>
                                  </div>
                                </div>
                                
                                {coach.bio && (
                                  <p className="text-xs text-muted-foreground line-clamp-2">{coach.bio}</p>
                                )}
                                
                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-muted-foreground">Experience:</span>
                                  <span className="font-medium">{coach.years_experience || 'N/A'} years</span>
                                </div>
                                
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-bold" style={{ color: '#ffb500' }}>
                                    ${coach.hourly_rate || '300'}/hr
                                  </span>
                                  <Button 
                                    size="sm" 
                                    className="gap-2 text-xs" 
                                    onClick={() => coach.calendar_link ? window.open(coach.calendar_link, '_blank') : setScheduleDialogOpen(true)}
                                  >
                                    <CalendarIcon className="h-3 w-3" />
                                    Book
                                  </Button>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            ) : (
              <div className="grid lg:grid-cols-4 gap-6">
                {/* Calendar/List View - Takes up 3 columns */}
                <div className="lg:col-span-3">
                  {currentCalls.length === 0 ? (
                    <div className="text-center py-12">
                      <CalendarIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No Sessions Scheduled</h3>
                      <p className="text-muted-foreground mb-4">
                        You don't have any {calendarMode === 'group' ? 'group coaching' : '1-on-1'} sessions scheduled.
                      </p>
                      <Button onClick={() => setScheduleDialogOpen(true)} className="gap-2">
                        <Plus className="h-4 w-4" />
                        Schedule Session
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {currentCalls.map((session) => (
                        <Card key={session.id} className="shadow-sm hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelectedSessionDialog(session)}>
                          <CardContent className="p-4">
                            <div className="flex flex-col sm:flex-row gap-4">
                              <div className="flex items-center gap-3">
                                <Avatar className="h-8 w-8 sm:h-10 sm:w-10 flex-shrink-0">
                                  <AvatarImage src={session.avatar} />
                                  <AvatarFallback>{session.coach.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-semibold text-sm truncate">{session.title}</h4>
                                  <p className="text-xs text-muted-foreground truncate">{session.coach}</p>
                                </div>
                                <div className="text-right flex-shrink-0">
                                  <div className="text-xs sm:text-sm font-medium">{format(parseISO(session.date), 'MMM d, yyyy')}</div>
                                  <div className="text-xs text-muted-foreground">{session.time}</div>
                                </div>
                              </div>
                              
                              <div className="flex flex-col sm:flex-row gap-2">
                                <Button 
                                  size="sm" 
                                  className="flex-1 text-xs gap-1"
                                  onClick={() => window.open(session.zoomMeetingUrl, '_blank')}
                                >
                                  <Video className="h-3 w-3" />
                                  Join Session
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  className="text-xs sm:flex-initial"
                                  onClick={() => setSelectedSessionDialog(session)}
                                >
                                  Details
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>

                {/* Available Coaches - Takes up 1 column on the right */}
                <div className="lg:col-span-1">
                  <Card className="shadow-soft sticky top-4">
                    <CardHeader className="p-4">
                      <CardTitle className="flex items-center gap-2 text-lg font-bold">
                        <Star className="h-5 w-5" />
                        Available Coaches
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4">
                      {loadingCoaches ? (
                        <div className="space-y-4">
                          {[...Array(3)].map((_, i) => (
                            <Card key={i} className="animate-pulse">
                              <CardContent className="p-4">
                                <div className="h-4 bg-muted rounded mb-2"></div>
                                <div className="h-3 bg-muted rounded mb-1"></div>
                                <div className="h-3 bg-muted rounded"></div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      ) : availableCoaches.length === 0 ? (
                        <div className="text-center py-6">
                          <User className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                          <p className="text-sm text-muted-foreground">No coaches available</p>
                        </div>
                      ) : (
                        <div className="space-y-4 max-h-96 overflow-y-auto">
                          {availableCoaches.map((coach, index) => (
                            <Card key={index} className="shadow-sm hover:shadow-md transition-shadow">
                              <CardContent className="p-3 space-y-3">
                                <div className="flex items-center gap-3">
                                  <Avatar className="h-10 w-10">
                                    <AvatarImage src={coach.avatar_url || coach.coach_avatar_url} />
                                    <AvatarFallback className="bg-primary text-primary-foreground">
                                      {coach.full_name.charAt(0)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="flex-1 min-w-0">
                                    <h4 className="font-semibold truncate text-sm">{coach.full_name}</h4>
                                    <p className="text-xs text-muted-foreground truncate">{coach.title || coach.specialties?.[0] || 'Financial Coach'}</p>
                                  </div>
                                </div>
                                
                                {coach.bio && (
                                  <p className="text-xs text-muted-foreground line-clamp-2">{coach.bio}</p>
                                )}
                                
                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-muted-foreground">Experience:</span>
                                  <span className="font-medium">{coach.years_experience || 'N/A'} years</span>
                                </div>
                                
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-bold" style={{ color: '#ffb500' }}>
                                    ${coach.hourly_rate || '300'}/hr
                                  </span>
                                  <Button 
                                    size="sm" 
                                    className="gap-2 text-xs" 
                                    onClick={() => coach.calendar_link ? window.open(coach.calendar_link, '_blank') : setScheduleDialogOpen(true)}
                                  >
                                    <CalendarIcon className="h-3 w-3" />
                                    Book
                                  </Button>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <Card className="shadow-soft text-center">
            <CardContent className="p-4">
              <div className="text-2xl font-bold" style={{ color: '#ffb500' }}>12</div>
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
              <div className="text-2xl font-bold" style={{ color: '#ffb500' }}>4.9</div>
              <div className="text-sm text-muted-foreground">Avg Rating</div>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Schedule Session Dialog */}
      <ScheduleSessionDialog
        open={scheduleDialogOpen}
        onOpenChange={setScheduleDialogOpen}
        onSessionCreated={() => {
          fetchSessions()
          setScheduleDialogOpen(false)
        }}
      />

      {/* Session Details Dialog */}
      <Dialog open={!!selectedSessionDialog} onOpenChange={() => setSelectedSessionDialog(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              Session Details
            </DialogTitle>
          </DialogHeader>
          {selectedSessionDialog && (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-lg">{selectedSessionDialog.title}</h3>
                <p className="text-muted-foreground">{selectedSessionDialog.coach}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Date</Label>
                  <p className="text-sm">{format(parseISO(selectedSessionDialog.date), 'MMMM d, yyyy')}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Time</Label>
                  <p className="text-sm">{selectedSessionDialog.time}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Duration</Label>
                  <p className="text-sm">{selectedSessionDialog.duration} minutes</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Type</Label>
                  <p className="text-sm">{selectedSessionDialog.type}</p>
                </div>
              </div>

              {selectedSessionDialog.description && (
                <div>
                  <Label className="text-sm font-medium">Description</Label>
                  <p className="text-sm text-muted-foreground">{selectedSessionDialog.description}</p>
                </div>
              )}

              {selectedSessionDialog.type === "Group Coaching" && (
                <div>
                  <Label className="text-sm font-medium">Participants</Label>
                  <p className="text-sm">{selectedSessionDialog.participants} / {selectedSessionDialog.maxParticipants}</p>
                </div>
              )}

              <div className="flex gap-2 pt-4">
                <Button 
                  onClick={() => window.open(selectedSessionDialog.zoomMeetingUrl, '_blank')} 
                  className="flex-1"
                >
                  <Video className="h-4 w-4 mr-2" />
                  Join Session
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default Coaching