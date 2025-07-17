import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { NavHeader } from "@/components/dashboard/nav-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Loader2, Calendar as CalendarIcon, Clock, User, Video, Phone, Users, Star, CheckCircle, Plus, ChevronLeft, ChevronRight, List, Grid } from 'lucide-react'
import { format, isSameDay, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, addMonths, subMonths, getDay } from 'date-fns'
import { cn } from '@/lib/utils'

const Coaching = () => {
  const { user, profile, loading } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date())
  const [viewType, setViewType] = useState<'month' | 'list'>('month')

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

  const displayName = profile?.display_name || profile?.first_name || 'Member'

  // Sample group coaching data with recurring events
  const upcomingCalls = [
    {
      id: 1,
      title: "Live Forex Trading",
      coach: "Sarah Johnson, CFP",
      date: "2025-07-07",
      time: "8am",
      type: "Group Coaching",
      status: "confirmed",
      avatar: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=100&h=100&fit=crop&crop=face",
      participants: 8,
      maxParticipants: 12,
      zoomMeetingId: "123-456-789",
      zoomMeetingUrl: "https://zoom.us/j/123456789?pwd=example"
    },
    {
      id: 2,
      title: "Q&A Accountability",
      coach: "Michael Chen, CFA",
      date: "2025-07-02",
      time: "9pm",
      type: "Group Coaching",
      status: "confirmed",
      avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face",
      participants: 15,
      maxParticipants: 20,
      zoomMeetingId: "987-654-321",
      zoomMeetingUrl: "https://zoom.us/j/987654321?pwd=example"
    },
    {
      id: 3,
      title: "Trust Coaching", 
      coach: "Elizabeth Davis, J.D.",
      date: "2025-07-09",
      time: "9pm",
      type: "Group Coaching",
      status: "confirmed",
      avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face",
      participants: 6,
      maxParticipants: 10,
      zoomMeetingId: "555-777-999",
      zoomMeetingUrl: "https://zoom.us/j/555777999?pwd=example"
    },
    {
      id: 4,
      title: "YouTube Live",
      coach: "Tech Team",
      date: "2025-07-04",
      time: "9pm",
      type: "Live Stream",
      status: "confirmed",
      avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face",
      participants: 50,
      maxParticipants: 100,
      zoomMeetingId: "888-999-000",
      zoomMeetingUrl: "https://youtube.com/live/example"
    },
    {
      id: 5,
      title: "Family Functions",
      coach: "Community Team",
      date: "2025-07-06",
      time: "7pm",
      type: "Community Event",
      status: "confirmed",
      avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face",
      participants: 25,
      maxParticipants: 30,
      zoomMeetingId: "111-222-333",
      zoomMeetingUrl: "https://zoom.us/j/111222333?pwd=example"
    }
  ]

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
          <Button className="gap-2">
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

        {/* Upcoming Sessions Summary */}
        <Card className="shadow-soft">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Upcoming Group Sessions
            </CardTitle>
            <CardDescription>
              Next 3 scheduled group coaching sessions
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <div className="grid gap-4 md:grid-cols-3">
              {upcomingCalls.slice(0, 3).map((session) => (
                <div key={session.id} className="p-3 bg-muted/20 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={session.avatar} />
                      <AvatarFallback className="text-xs">{session.coach.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <span className="font-medium text-sm truncate">{session.title}</span>
                  </div>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <div>{format(new Date(session.date), 'MMM d, yyyy')}</div>
                    <div>{session.time}</div>
                    <div>{session.participants}/{session.maxParticipants} joined</div>
                  </div>
                </div>
              ))}
            </div>
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
    </div>
  )
}

export default Coaching