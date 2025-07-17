import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { NavHeader } from "@/components/dashboard/nav-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Loader2, Calendar as CalendarIcon, Clock, User, Video, Phone, Users, Star, CheckCircle, Plus } from 'lucide-react'
import { format, isSameDay, parseISO } from 'date-fns'
import { cn } from '@/lib/utils'

const Coaching = () => {
  const { user, profile, loading } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [showCalendar, setShowCalendar] = useState(true)

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

  // Sample group coaching data with Zoom integration
  const upcomingCalls = [
    {
      id: 1,
      title: "Group Wealth Strategy Session",
      coach: "Sarah Johnson, CFP",
      date: "2024-07-20",
      time: "2:00 PM - 3:00 PM",
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
      title: "Investment Portfolio Masterclass",
      coach: "Michael Chen, CFA",
      date: "2024-07-22",
      time: "10:00 AM - 11:30 AM", 
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
      title: "Estate Planning Workshop", 
      coach: "Elizabeth Davis, J.D.",
      date: "2024-07-25",
      time: "3:30 PM - 4:30 PM",
      type: "Group Coaching",
      status: "pending",
      avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face",
      participants: 6,
      maxParticipants: 10,
      zoomMeetingId: "555-777-999",
      zoomMeetingUrl: "https://zoom.us/j/555777999?pwd=example"
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

  // Get sessions for selected date
  const getSessionsForDate = (date: Date) => {
    return upcomingCalls.filter(call => 
      isSameDay(parseISO(call.date), date)
    )
  }

  // Get all dates that have sessions
  const getSessionDates = () => {
    return upcomingCalls.map(call => parseISO(call.date))
  }

  const sessionDates = getSessionDates()
  const selectedDateSessions = getSessionsForDate(selectedDate)

  return (
    <div className="min-h-screen bg-background">
      <NavHeader onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
      
      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6 max-w-6xl">
        {/* Welcome Section */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
              Coaching Calls
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1">
              Join group coaching sessions with wealth management experts
            </p>
          </div>
          <Button className="gap-2">
            <CalendarIcon className="h-4 w-4" />
            <span className="hidden sm:inline">Schedule New Call</span>
            <span className="sm:hidden">Schedule</span>
          </Button>
        </div>

        {/* Calendar View */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Calendar */}
          <Card className="lg:col-span-2 shadow-soft">
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <CalendarIcon className="h-5 w-5" />
                Coaching Calendar
              </CardTitle>
              <CardDescription>
                Click on a date to view scheduled coaching sessions
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                modifiers={{
                  hasSession: sessionDates
                }}
                modifiersStyles={{
                  hasSession: {
                    backgroundColor: 'hsl(var(--primary))',
                    color: 'hsl(var(--primary-foreground))',
                    fontWeight: 'bold'
                  }
                }}
                className={cn("w-full pointer-events-auto")}
              />
            </CardContent>
          </Card>

          {/* Selected Date Sessions */}
          <Card className="shadow-soft">
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-lg font-bold">
                {format(selectedDate, 'MMMM d, yyyy')}
              </CardTitle>
              <CardDescription>
                {selectedDateSessions.length > 0 
                  ? `${selectedDateSessions.length} session${selectedDateSessions.length !== 1 ? 's' : ''} scheduled`
                  : 'No sessions scheduled'
                }
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 space-y-4">
              {selectedDateSessions.length > 0 ? (
                selectedDateSessions.map((session) => (
                  <div key={session.id} className="p-3 bg-muted/30 rounded-lg space-y-2">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={session.avatar} />
                        <AvatarFallback>{session.coach.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm truncate">{session.title}</h4>
                        <p className="text-xs text-muted-foreground">{session.coach}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>{session.time}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Users className="h-3 w-3" />
                      <span>{session.participants}/{session.maxParticipants} joined</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <Badge variant={session.status === 'confirmed' ? 'default' : 'secondary'} className="text-xs">
                        {session.status}
                      </Badge>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="text-xs px-2"
                        onClick={() => window.open(session.zoomMeetingUrl, '_blank')}
                      >
                        Join Zoom
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6">
                  <CalendarIcon className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                  <p className="text-sm text-muted-foreground">No coaching sessions scheduled for this date</p>
                  <Button size="sm" variant="outline" className="mt-3 gap-2">
                    <Plus className="h-4 w-4" />
                    Schedule Session
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

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