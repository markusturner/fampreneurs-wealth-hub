import React, { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/integrations/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { 
  Users, 
  Settings, 
  BookOpen, 
  MessageSquare, 
  Calendar,
  Shield,
  Database,
  FileText,
  BarChart3,
  ArrowLeft,
  Home
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useNavigate } from 'react-router-dom'
import { useTheme } from '@/components/theme-provider'
import { CreateCourseDialog } from '@/components/admin/create-course-dialog'
import { EditCourseDialog } from '@/components/admin/edit-course-dialog'
import { UserRoleManagement } from '@/components/admin/user-role-management'
import { UserCard } from '@/components/admin/user-card'
import { CommunicationManagement } from '@/components/admin/communication-management'
import { AdminThemeToggle } from '@/components/admin/admin-theme-toggle'
import { ThemeSettings } from '@/components/admin/theme-settings'
import { AddCoachDialog } from '@/components/admin/add-coach-dialog'
import { EditCoachDialog } from '@/components/admin/edit-coach-dialog'
import { AddCoachingSessionDialog } from '@/components/admin/add-coaching-session-dialog'
import { EditCoachingSessionDialog } from '@/components/admin/edit-coaching-session-dialog'
import { ZapierIntegration } from '@/components/admin/zapier-integration'
import { CoachingRecordings } from '@/components/admin/coaching-recordings'
import { FeedbackManagement } from '@/components/dashboard/feedback-management'
import { WeeklyCheckinManagement } from '@/components/dashboard/weekly-checkin-management'
import { EnhancedUserManagement } from '@/components/admin/enhanced-user-management'
import { format } from 'date-fns'

interface Course {
  id: string
  title: string
  description: string | null
  created_by: string
  created_at: string
  instructor: string | null
  category: string | null
  level: string | null
  duration: string | null
  price: string | null
  image_url: string | null
}

export default function AdminDashboard() {
  const { user, profile, signOut } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()
  const { theme } = useTheme()
  
  const [users, setUsers] = useState<any[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [coaches, setCoaches] = useState<any[]>([])
  const [coachingSessions, setCoachingSessions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Check admin access
  useEffect(() => {
    if (!user || !profile?.is_admin) {
      navigate('/')
      return
    }
    loadAdminData()
  }, [user, profile, navigate])

  const loadAdminData = async () => {
    try {
      setLoading(true)
      
      // Load users
      const { data: usersData, error: usersError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })

      if (usersError) throw usersError
      setUsers(usersData || [])
      
      // Load courses
      const { data: coursesData, error: coursesError } = await supabase
        .from('courses')
        .select('*')
        .order('created_at', { ascending: false })

      if (coursesError) throw coursesError
      setCourses(coursesData || [])

      // Load coaches
      const { data: coachesData, error: coachesError } = await supabase
        .from('coaches')
        .select('*')
        .order('created_at', { ascending: false })

      if (coachesError) throw coachesError
      setCoaches(coachesData || [])

      // Load coaching sessions
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('group_coaching_sessions')
        .select('*')
        .order('session_date', { ascending: false })

      if (sessionsError) throw sessionsError
      setCoachingSessions(sessionsData || [])

    } catch (error: any) {
      toast({
        title: "Error loading admin data",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSignOut = async () => {
    try {
      await signOut()
      navigate('/auth')
    } catch (error: any) {
      toast({
        title: "Error signing out",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-lg text-muted-foreground">Loading admin dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="flex h-16 items-center px-4 gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/')}
            className="mr-2"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-semibold">Admin Dashboard</h1>
          </div>
          
          <div className="ml-auto flex items-center gap-4">
            <AdminThemeToggle />
            <Button variant="outline" onClick={handleSignOut}>
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto p-6">
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <Home className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Users
            </TabsTrigger>
            <TabsTrigger value="courses" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Courses
            </TabsTrigger>
            <TabsTrigger value="coaching" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Coaching
            </TabsTrigger>
            <TabsTrigger value="communications" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Communications
            </TabsTrigger>
            <TabsTrigger value="feedback" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Feedback
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">Loading...</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Courses</CardTitle>
                  <BookOpen className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{courses.length}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Coaches</CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{coaches.filter(c => c.is_active).length}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Coaching Sessions</CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{coachingSessions.length}</div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="users" className="space-y-4">
            <EnhancedUserManagement 
              users={users} 
              coaches={coaches} 
              onUsersUpdated={loadAdminData} 
            />
          </TabsContent>

          <TabsContent value="courses" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Courses</CardTitle>
                  <CardDescription>
                    Manage your course library
                  </CardDescription>
                </div>
                <CreateCourseDialog onCourseCreated={loadAdminData} />
              </CardHeader>
              <CardContent>
                {courses.map((course) => (
                  <div key={course.id} className="flex items-center justify-between p-4 border rounded-lg mb-2">
                    <div>
                      <div className="font-medium">{course.title}</div>
                      <div className="text-sm text-muted-foreground">{course.description}</div>
                      <div className="flex gap-2 mt-2">
                        {course.category && (
                          <Badge variant="secondary">{course.category}</Badge>
                        )}
                        {course.level && (
                          <Badge variant="outline">{course.level}</Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <EditCourseDialog course={course} onCourseUpdated={loadAdminData} />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="coaching" className="space-y-4">
            <div className="grid gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Coaches</CardTitle>
                    <CardDescription>
                      Manage your coaching staff
                    </CardDescription>
                  </div>
                  <AddCoachDialog onCoachAdded={loadAdminData} />
                </CardHeader>
                <CardContent>
                  {coaches.map((coach) => (
                    <div key={coach.id} className="flex items-center justify-between p-4 border rounded-lg mb-2">
                      <div className="flex items-center space-x-3">
                        {coach.avatar_url && (
                          <img 
                            src={coach.avatar_url} 
                            alt={coach.full_name} 
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        )}
                        <div>
                          <div className="font-medium">{coach.full_name}</div>
                          <div className="text-sm text-muted-foreground">{coach.email}</div>
                          {coach.specialties && coach.specialties.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {coach.specialties.map((specialty: string, index: number) => (
                                <Badge key={index} variant="secondary" className="text-xs">
                                  {specialty}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant={coach.is_active ? "default" : "secondary"}>
                          {coach.is_active ? "Active" : "Inactive"}
                        </Badge>
                        <EditCoachDialog coach={coach} onCoachUpdated={loadAdminData} />
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Coaching Sessions</CardTitle>
                    <CardDescription>
                      Manage group and individual coaching sessions
                    </CardDescription>
                  </div>
                  <AddCoachingSessionDialog type="group" onSessionAdded={loadAdminData} />
                </CardHeader>
                <CardContent>
                  {coachingSessions.map((session) => (
                    <div key={session.id} className="flex items-center justify-between p-4 border rounded-lg mb-2">
                      <div>
                        <div className="font-medium">{session.title}</div>
                        <div className="text-sm text-muted-foreground">
                          {format(new Date(session.session_date), 'MMM d, yyyy')} • {session.coach_name}
                        </div>
                        <Badge variant="outline" className="mt-1">
                          Group Session
                        </Badge>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant={session.status === 'completed' ? "default" : "secondary"}>
                          {session.status}
                        </Badge>
                        <EditCoachingSessionDialog session={session} onSessionUpdated={loadAdminData} />
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="communications" className="space-y-4">
            <CommunicationManagement />
          </TabsContent>

          <TabsContent value="feedback" className="space-y-4">
            <FeedbackManagement />
            <WeeklyCheckinManagement />
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <ThemeSettings />
            <Card>
              <CardHeader>
                <CardTitle>Integrations</CardTitle>
                <CardDescription>Manage external integrations</CardDescription>
              </CardHeader>
              <CardContent>
                <ZapierIntegration />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Coaching Recordings</CardTitle>
                <CardDescription>Manage coaching call recordings</CardDescription>
              </CardHeader>
              <CardContent>
                <CoachingRecordings />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}