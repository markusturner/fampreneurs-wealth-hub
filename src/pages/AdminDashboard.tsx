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
        loadCoachData()
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
    </div>
  )
}