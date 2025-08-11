import React, { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/integrations/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
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
  UserPlus,
  Trash2,
  Edit,
  Eye,
  Search,
  Plus,
  Save,
  TrendingUp,
  CalendarCheck,
  TrendingDown,
  DollarSign,
  Star,
  Phone,
  Video,
  Mail,
  BarChart,
  Activity,
  CheckCircle,
  XCircle,
  Clock,
  Target,
  ArrowLeft,
  Home
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useNavigate } from 'react-router-dom'
import { useTheme } from '@/components/theme-provider'
import { Separator } from '@/components/ui/separator'
import { TwoStepCourseCreator } from '@/components/admin/two-step-course-creator'
import { TwoStepCourseEditor } from '@/components/admin/two-step-course-editor'
import { UserRoleManagement } from '@/components/admin/user-role-management'
import { UserCard } from '@/components/admin/user-card'
import { CommunicationManagement } from '@/components/admin/communication-management'
import { AdminThemeToggle } from '@/components/admin/admin-theme-toggle'
import { ThemeSettings } from '@/components/admin/theme-settings'
import { AddCoachDialog } from '@/components/admin/add-coach-dialog'
import { EditCoachDialog } from '@/components/admin/edit-coach-dialog'
import { AddCoachingSessionDialog } from '@/components/admin/add-coaching-session-dialog'
import { EditCoachingSessionDialog } from '@/components/admin/edit-coaching-session-dialog'
import { UserSessionQuotaDialog } from '@/components/admin/user-session-quota-dialog'
import { AssignCoachDialog } from '@/components/admin/assign-coach-dialog'
import { ZapierIntegration } from '@/components/admin/zapier-integration'
import { CoachingRecordings } from '@/components/admin/coaching-recordings'
import { FeedbackManagement } from '@/components/dashboard/feedback-management'
import { WeeklyCheckinManagement } from '@/components/dashboard/weekly-checkin-management'
import { EnhancedAddVideoDialog } from '@/components/courses/enhanced-add-video-dialog'
import { EnhancedUserManagement } from '@/components/admin/enhanced-user-management'
import { ResponsiveContainer, BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts'
import { format } from 'date-fns'

// Video Dialog Wrapper Component
function VideoDialogWrapper({ courseId, onVideoAdded }: { courseId: string; onVideoAdded: () => void }) {
  const [open, setOpen] = useState(false)
  
  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4 mr-2" />
        Add Video
      </Button>
      <EnhancedAddVideoDialog 
        open={open}
        onOpenChange={setOpen}
        courseId={courseId}
        onVideoAdded={onVideoAdded}
      />
    </>
  )
}

interface Profile {
  id: string
  user_id: string
  first_name: string | null
  last_name: string | null
  display_name: string | null
  email?: string
  is_admin: boolean
  created_at: string
  roles?: string[]
  avatar_url: string | null
  fulfillment_stage?: string | null
  course_progress?: number
  group_calls_attended?: number
  one_on_one_calls_attended?: number
  activation_point?: string | null
  assigned_coach?: {
    id: string
    full_name: string
  } | null
  program_name: string | null
  membership_type: string | null
  investment_amount?: number
  backend_cash_collected?: number
}

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

interface FulfillmentStage {
  id: string
  name: string
  description: string | null
  stage_order: number
  color: string | null
  created_by: string
  created_at: string
}

interface Metrics {
  newRenewals: number
  nonRenewals: number
  newUpsells: number
  nonUpsells: number
  totalRevenue: number
  averageRevenue: number
  renewalRate: number
  satisfactionScore: number
  oneOnOneCalls30Days: number
  oneOnOneCalls15Days: number
  oneOnOneCallsThisMonth: number
  groupCalls30Days: number
  groupCalls15Days: number
  groupCallsThisMonth: number
  totalFrontendCashCollected: number
  totalBackendCashCollected: number
}

interface CoachData {
  id: string
  name: string
  clients: number
}

export default function AdminDashboard() {
  const { user, profile, signOut } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()
  const { theme } = useTheme()
  
  const [users, setUsers] = useState<Profile[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [coaches, setCoaches] = useState<any[]>([])
  const [coachingSessions, setCoachingSessions] = useState<any[]>([])
  const [fulfillmentStages, setFulfillmentStages] = useState<FulfillmentStage[]>([])
  const [metrics, setMetrics] = useState<Metrics>({
    newRenewals: 0,
    nonRenewals: 0,
    newUpsells: 0,
    nonUpsells: 0,
    totalRevenue: 0,
    averageRevenue: 0,
    renewalRate: 0,
    satisfactionScore: 0,
    oneOnOneCalls30Days: 0,
    oneOnOneCalls15Days: 0,
    oneOnOneCallsThisMonth: 0,
    groupCalls30Days: 0,
    groupCalls15Days: 0,
    groupCallsThisMonth: 0,
    totalFrontendCashCollected: 0,
    totalBackendCashCollected: 0
  })
  const [coachData, setCoachData] = useState<CoachData[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [featuredCourses, setFeaturedCourses] = useState<string[]>([])
  const [platformSettings, setPlatformSettings] = useState({ 
    platform_name: 'Fampreneurs', 
    admin_email: 'admin@fampreneurs.com' 
  })

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
      
      // Load platform settings
      const { data: settingsData, error: settingsError } = await supabase
        .from('platform_settings')
        .select('setting_key, setting_value')
        .in('setting_key', ['platform_name', 'admin_email'])

      if (settingsError) throw settingsError

      const settings = settingsData?.reduce((acc, setting) => {
        acc[setting.setting_key] = setting.setting_value
        return acc
      }, {} as any) || {}

      setPlatformSettings({
        platform_name: settings.platform_name || 'Fampreneurs',
        admin_email: settings.admin_email || 'admin@fampreneurs.com'
      })

      // Load fulfillment stages
      const { data: stagesData, error: stagesError } = await supabase
        .from('fulfillment_stages')
        .select('*')
        .order('stage_order', { ascending: true })

      if (stagesError) throw stagesError
      setFulfillmentStages(stagesData || [])
      
      // Load all data in parallel
      await Promise.all([
        loadUsers(),
        loadCourses(),
        loadCoaches(),
        loadCoachingSessions(),
        loadMetrics(),
        loadCoachData(),
        loadFeaturedCourses()
      ])

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

  const loadUsers = async () => {
    try {
      // Load users with fulfillment progress
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })

      if (profilesError) throw profilesError

      // Load additional user data
      const usersWithRoles = await Promise.all(
        profilesData.map(async (profile) => {
          // Get user roles
          const { data: userRoles } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', profile.user_id)
          
          // Get fulfillment progress
          const { data: fulfillmentProgress } = await supabase
            .from('user_fulfillment_progress')
            .select(`
              stage_id,
              fulfillment_stages (
                name
              )
            `)
            .eq('user_id', profile.user_id)
            .order('moved_to_stage_at', { ascending: false })
            .limit(1)
          
          // Get course progress
          const { data: enrollments } = await supabase
            .from('course_enrollments')
            .select('progress')
            .eq('user_id', profile.user_id)
          
          const avgProgress = enrollments?.length 
            ? enrollments.reduce((sum, e) => sum + (e.progress || 0), 0) / enrollments.length 
            : 0

          // Get coaching calls attended
          const { data: groupSessions } = await supabase
            .from('session_enrollments')
            .select('session_id')
            .eq('user_id', profile.user_id)

          const { data: oneOnOneSessions } = await supabase
            .from('session_enrollments')
            .select('session_id')
            .eq('user_id', profile.user_id)

          // Get coach assignment
          const { data: coachAssignment } = await supabase
            .from('coach_assignments')
            .select('coach_id')
            .eq('user_id', profile.user_id)
            .eq('status', 'active')
            .maybeSingle()

          // Get coach details if assignment exists
          let assignedCoach = null
          if (coachAssignment?.coach_id) {
            const { data: coachData } = await supabase
              .from('coaches')
              .select('id, full_name')
              .eq('id', coachAssignment.coach_id)
              .maybeSingle()
            
            assignedCoach = coachData
          }
          
          return {
            ...profile,
            email: 'Protected',
            roles: userRoles?.map(r => r.role) || ['member'],
            fulfillment_stage: fulfillmentProgress?.[0]?.fulfillment_stages?.name || null,
            course_progress: Math.round(avgProgress),
            group_calls_attended: groupSessions?.length || 0,
            one_on_one_calls_attended: oneOnOneSessions?.length || 0,
            assigned_coach: assignedCoach,
            activation_point: profile.activation_point
          }
        })
      )

      setUsers(usersWithRoles)
    } catch (error) {
      console.error('Error loading users:', error)
    }
  }

  const loadCourses = async () => {
    try {
      const { data: coursesData, error: coursesError } = await supabase
        .from('courses')
        .select('*')
        .order('created_at', { ascending: false })

      if (coursesError) throw coursesError
      setCourses(coursesData || [])
    } catch (error) {
      console.error('Error loading courses:', error)
    }
  }

  const loadCoaches = async () => {
    try {
      const { data: coachesData, error: coachesError } = await supabase
        .from('coaches')
        .select('*')
        .order('created_at', { ascending: false })

      if (coachesError) throw coachesError
      setCoaches(coachesData || [])
    } catch (error) {
      console.error('Error loading coaches:', error)
    }
  }

  const loadCoachingSessions = async () => {
    try {
      // Load coaching sessions (both group and individual)
      const [groupSessionsResult, individualSessionsResult] = await Promise.all([
        supabase
          .from('group_coaching_sessions')
          .select('*, coaches:coach_name')
          .order('session_date', { ascending: false }),
        supabase
          .from('individual_coaching_sessions')
          .select(`
            *,
            coaches:coach_id (
              full_name
            )
          `)
          .order('session_date', { ascending: false })
      ])

      if (groupSessionsResult.error) throw groupSessionsResult.error
      if (individualSessionsResult.error) throw individualSessionsResult.error

      // Merge and normalize both types of sessions
      const groupSessions = (groupSessionsResult.data || []).map(session => ({
        ...session,
        session_type: 'group',
        coach_name: session.coach_name,
        max_participants: session.max_participants || 1
      }))

      const individualSessions = (individualSessionsResult.data || []).map(session => ({
        ...session,
        session_type: 'individual',
        coach_name: (session as any).coaches?.full_name || 'Unknown Coach',
        max_participants: 1
      }))

      const allSessions = [...groupSessions, ...individualSessions]
        .sort((a, b) => new Date(b.session_date).getTime() - new Date(a.session_date).getTime())

      setCoachingSessions(allSessions)
    } catch (error) {
      console.error('Error loading coaching sessions:', error)
    }
  }

  const loadMetrics = async () => {
    try {
      const now = new Date()
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      const fifteenDaysAgo = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000)
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

      // Get real coaching session data
      const { data: groupSessions } = await supabase
        .from('group_coaching_sessions')
        .select('session_date, status')
        .eq('status', 'completed')

      const { data: individualSessions } = await supabase
        .from('individual_coaching_sessions')
        .select('session_date, status')
        .eq('status', 'completed')

      // Get actual attendance data
      const { data: attendanceData } = await supabase
        .from('session_attendance')
        .select('session_type, attended, created_at')
        .eq('attended', true)

      // Calculate real metrics based on attendance data
      const oneOnOneCalls30Days = attendanceData?.filter(a => 
        a.session_type === 'individual' && 
        new Date(a.created_at) >= thirtyDaysAgo
      ).length || 0

      const oneOnOneCalls15Days = attendanceData?.filter(a => 
        a.session_type === 'individual' && 
        new Date(a.created_at) >= fifteenDaysAgo
      ).length || 0

      const oneOnOneCallsThisMonth = attendanceData?.filter(a => 
        a.session_type === 'individual' && 
        new Date(a.created_at) >= startOfMonth
      ).length || 0

      const groupCalls30Days = attendanceData?.filter(a => 
        a.session_type === 'group' && 
        new Date(a.created_at) >= thirtyDaysAgo
      ).length || 0

      const groupCalls15Days = attendanceData?.filter(a => 
        a.session_type === 'group' && 
        new Date(a.created_at) >= fifteenDaysAgo
      ).length || 0

       const groupCallsThisMonth = attendanceData?.filter(a => 
         a.session_type === 'group' && 
         new Date(a.created_at) >= startOfMonth
       ).length || 0

       // Calculate total frontend cash collected from users over past 12 months
       const twelveMonthsAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
       const { data: usersWithInvestments } = await supabase
         .from('profiles')
         .select('investment_amount, created_at')
         .gte('created_at', twelveMonthsAgo.toISOString())

       const totalFrontendCashCollected = usersWithInvestments?.reduce((total, user) => {
         return total + (user.investment_amount || 0)
       }, 0) || 0

       // Calculate total backend cash collected from users over past 12 months
       const { data: usersWithBackendCash } = await supabase
         .from('profiles')
         .select('backend_cash_collected, created_at')
         .gte('created_at', twelveMonthsAgo.toISOString())

       const totalBackendCashCollected = usersWithBackendCash?.reduce((total, user) => {
         return total + (user.backend_cash_collected || 0)
       }, 0) || 0

       setMetrics({
         newRenewals: 12, // Keep mock data for financial metrics for now
         nonRenewals: 3,
         newUpsells: 8,
         nonUpsells: 2,
         totalRevenue: 45000,
         averageRevenue: 3750,
         renewalRate: 80,
         satisfactionScore: 4.2,
         oneOnOneCalls30Days,
         oneOnOneCalls15Days,
         oneOnOneCallsThisMonth,
         groupCalls30Days,
         groupCalls15Days,
         groupCallsThisMonth,
         totalFrontendCashCollected,
         totalBackendCashCollected
       })
    } catch (error) {
      console.error('Error loading metrics:', error)
    }
  }

  const loadCoachData = async () => {
    try {
      // Get all coaches
      const { data: coachesData, error: coachesError } = await supabase
        .from('coaches')
        .select('id, full_name')
        .eq('is_active', true)

      if (coachesError) throw coachesError

      // Get coach assignments and count active clients for each coach
      const coachDataWithClients = await Promise.all(
        (coachesData || []).map(async (coach) => {
          const { data: assignments, error: assignmentsError } = await supabase
            .from('coach_assignments')
            .select('user_id')
            .eq('coach_id', coach.id)
            .eq('status', 'active')

          if (assignmentsError) {
            console.error('Error loading assignments for coach:', coach.full_name, assignmentsError)
            return {
              id: coach.id,
              name: coach.full_name,
              clients: 0
            }
          }

          return {
            id: coach.id,
            name: coach.full_name,
            clients: assignments?.length || 0
          }
        })
      )

      setCoachData(coachDataWithClients)
    } catch (error) {
      console.error('Error loading coach data:', error)
      // Fallback to empty array on error
      setCoachData([])
    }
  }

  const loadFeaturedCourses = async () => {
    try {
      const { data: featuredData, error } = await supabase
        .from('featured_courses')
        .select('course_id')
        .eq('is_featured', true)
      
      if (error) throw error
      setFeaturedCourses(featuredData?.map(f => f.course_id) || [])
    } catch (error) {
      console.error('Error loading featured courses:', error)
      setFeaturedCourses([])
    }
  }

  const handleToggleFeatured = async (courseId: string) => {
    try {
      const isFeatured = featuredCourses.includes(courseId)
      
      if (isFeatured) {
        // Remove from featured
        const { error } = await supabase
          .from('featured_courses')
          .delete()
          .eq('course_id', courseId)
        
        if (error) throw error
        
        setFeaturedCourses(prev => prev.filter(id => id !== courseId))
        toast({
          title: "Course unfeatured",
          description: "Course has been removed from featured courses.",
        })
      } else {
        // Add to featured
        const { error } = await supabase
          .from('featured_courses')
          .insert({
            course_id: courseId,
            featured_by: user?.id,
            is_featured: true
          })
        
        if (error) throw error
        
        setFeaturedCourses(prev => [...prev, courseId])
        toast({
          title: "Course featured",
          description: "Course has been added to featured courses.",
        })
      }
    } catch (error: any) {
      toast({
        title: "Error updating featured status",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  const handleDeleteCoach = async (coachId: string) => {
    const { error } = await supabase
      .from('coaches')
      .delete()
      .eq('id', coachId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete coach",
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "Success",
      description: "Coach deleted successfully"
    });
    
    loadAdminData();
  };

  const handleDeleteCoachingSession = async (sessionId: string) => {
    const { error } = await supabase
      .from('group_coaching_sessions')
      .delete()
      .eq('id', sessionId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete coaching session",
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "Success",
      description: "Coaching session deleted successfully"
    });
    
    loadAdminData();
  };

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
            <Shield className="h-6 w-6" style={{ color: '#ffb500' }} />
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
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2 sm:gap-3 lg:gap-4">
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
            {/* Key Metrics Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{users.length}</div>
                  <p className="text-xs text-muted-foreground">
                    Active members in platform
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Frontend Cash Collected</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${metrics.totalFrontendCashCollected.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">
                    Past 12 months from all users
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Backend Cash Collected</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${metrics.totalBackendCashCollected.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">
                    Past 12 months from all users
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Satisfaction</CardTitle>
                  <Star className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{metrics.satisfactionScore}/5</div>
                  <p className="text-xs text-muted-foreground">
                    Average satisfaction score
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Revenue and Calls Charts */}
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Monthly Performance</CardTitle>
                  <CardDescription>
                    Revenue and renewal tracking
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center">
                          <TrendingUp className="h-4 w-4 mr-2 text-green-600" />
                          <span className="text-sm font-medium">New Renewals</span>
                        </div>
                        <div className="text-2xl font-bold text-green-600">{metrics.newRenewals}</div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center">
                          <TrendingDown className="h-4 w-4 mr-2 text-red-600" />
                          <span className="text-sm font-medium">Non-Renewals</span>
                        </div>
                        <div className="text-2xl font-bold text-red-600">{metrics.nonRenewals}</div>
                      </div>
                    </div>
                    <Separator />
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center">
                          <Target className="h-4 w-4 mr-2 text-blue-600" />
                          <span className="text-sm font-medium">New Upsells</span>
                        </div>
                        <div className="text-2xl font-bold text-blue-600">{metrics.newUpsells}</div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center">
                          <Activity className="h-4 w-4 mr-2 text-orange-600" />
                          <span className="text-sm font-medium">Renewal Rate</span>
                        </div>
                        <div className="text-2xl font-bold text-orange-600">{metrics.renewalRate}%</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Coaching Activity</CardTitle>
                  <CardDescription>
                    Call volume and trends
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">1-on-1 Calls (30 days)</span>
                        <span className="text-sm text-muted-foreground">{metrics.oneOnOneCalls30Days}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">1-on-1 Calls (15 days)</span>
                        <span className="text-sm text-muted-foreground">{metrics.oneOnOneCalls15Days}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">1-on-1 Calls (This month)</span>
                        <span className="text-sm text-muted-foreground">{metrics.oneOnOneCallsThisMonth}</span>
                      </div>
                    </div>
                    <Separator />
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Group Calls (30 days)</span>
                        <span className="text-sm text-muted-foreground">{metrics.groupCalls30Days}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Group Calls (15 days)</span>
                        <span className="text-sm text-muted-foreground">{metrics.groupCalls15Days}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Group Calls (This month)</span>
                        <span className="text-sm text-muted-foreground">{metrics.groupCallsThisMonth}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Coach Performance */}
            <Card>
              <CardHeader>
                <CardTitle>Coach Performance</CardTitle>
                <CardDescription>
                  Client distribution across coaches
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                  {coachData.map((coach) => (
                    <div key={coach.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <div className="font-medium">{coach.name}</div>
                        <div className="text-sm text-muted-foreground">Active Clients</div>
                      </div>
                      <div className="text-2xl font-bold">{coach.clients}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* System Overview */}
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Courses</CardTitle>
                  <BookOpen className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{courses.length}</div>
                  <p className="text-xs text-muted-foreground">
                    Available courses
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Coaches</CardTitle>
                  <CalendarCheck className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{coaches.filter(c => c.is_active).length}</div>
                  <p className="text-xs text-muted-foreground">
                    Available for sessions
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Coaching Sessions</CardTitle>
                  <Video className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{coachingSessions.length}</div>
                  <p className="text-xs text-muted-foreground">
                    Scheduled sessions
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="users" className="space-y-4">
            {/* User Management */}
            <EnhancedUserManagement 
              users={users} 
              coaches={coaches} 
              onUsersUpdated={() => {
                loadUsers()
                loadMetrics()
              }} 
            />
          </TabsContent>

          <TabsContent value="courses" className="space-y-4">
            <div className="grid gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Courses</CardTitle>
                    <CardDescription>
                      Manage your course library
                    </CardDescription>
                  </div>
                  <TwoStepCourseCreator onCourseCreated={loadAdminData} />
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
                        <TwoStepCourseEditor course={course} onCourseUpdated={loadAdminData} />
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Featured Courses</CardTitle>
                  <CardDescription>Manage featured course selection</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {courses.map((course) => (
                      <div key={course.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          {course.image_url && (
                            <img 
                              src={course.image_url} 
                              alt={course.title} 
                              className="w-12 h-12 rounded object-cover"
                            />
                          )}
                          <div>
                            <div className="font-medium">{course.title}</div>
                            <div className="text-sm text-muted-foreground">{course.description}</div>
                            <div className="flex gap-2 mt-1">
                              {course.category && (
                                <Badge variant="secondary" className="text-xs">{course.category}</Badge>
                              )}
                              {course.level && (
                                <Badge variant="outline" className="text-xs">{course.level}</Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {featuredCourses.includes(course.id) && (
                            <Badge variant="default" className="bg-yellow-500 text-black">
                              Featured
                            </Badge>
                          )}
                          <Button
                            variant={featuredCourses.includes(course.id) ? "destructive" : "outline"}
                            size="sm"
                            onClick={() => handleToggleFeatured(course.id)}
                          >
                            {featuredCourses.includes(course.id) ? "Remove Featured" : "Feature Course"}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
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
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteCoach(coach.id)}
                        >
                          Delete
                        </Button>
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
                        <Badge variant="outline" className="mt-1" style={{ backgroundColor: '#ffb500', borderColor: '#ffb500', color: '#290a52' }}>
                          Group Session
                        </Badge>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-muted-foreground">
                          {session.current_participants || 0}/{session.max_participants} participants
                        </span>
                        <EditCoachingSessionDialog session={session} onSessionUpdated={loadAdminData} />
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteCoachingSession(session.id)}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Call Recordings</CardTitle>
                  <CardDescription>
                    Manage coaching call recordings
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <CoachingRecordings />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="communications" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Communication Management</CardTitle>
                <CardDescription>
                  Send announcements and manage communication settings
                </CardDescription>
              </CardHeader>
              <CardContent>
                <CommunicationManagement />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="feedback" className="space-y-4">
            <div className="grid gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Feedback Management</CardTitle>
                  <CardDescription>
                    View and manage user feedback
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <FeedbackManagement />
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Weekly Check-ins</CardTitle>
                  <CardDescription>
                    Manage weekly check-in campaigns
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <WeeklyCheckinManagement />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Platform Settings</CardTitle>
                <CardDescription>
                  Configure platform-wide settings
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium mb-4">User Management</h3>
                    <p className="text-sm text-muted-foreground">User role management coming soon...</p>
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <h3 className="text-lg font-medium mb-4">Stage Management</h3>
                    <p className="text-sm text-muted-foreground">Stage management coming soon...</p>
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <h3 className="text-lg font-medium mb-4">Fulfillment Management</h3>
                    <p className="text-sm text-muted-foreground">Fulfillment management coming soon...</p>
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <h3 className="text-lg font-medium mb-4">Theme Settings</h3>
                    <ThemeSettings />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Zapier Integration</CardTitle>
                <CardDescription>
                  Configure Zapier webhooks and automation
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ZapierIntegration />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}