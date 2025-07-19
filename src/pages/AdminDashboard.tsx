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
import { UserSessionQuotaDialog } from '@/components/admin/user-session-quota-dialog'
import { AssignCoachDialog } from '@/components/admin/assign-coach-dialog'
import { ZapierIntegration } from '@/components/admin/zapier-integration'
import { CoachingRecordings } from '@/components/admin/coaching-recordings'
import { FeedbackManagement } from '@/components/dashboard/feedback-management'
import { WeeklyCheckinManagement } from '@/components/dashboard/weekly-checkin-management'
import { EnhancedAddVideoDialog } from '@/components/courses/enhanced-add-video-dialog'
import { 
  DndContext, 
  DragEndEvent, 
  DragOverlay, 
  DragStartEvent,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCenter,
  useDroppable
} from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { 
  useSortable
} from '@dnd-kit/sortable'
import { GripVertical } from 'lucide-react'
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

function DroppableStage({ id, children }: { id: string; children: React.ReactNode }) {
  const { setNodeRef } = useDroppable({ id })
  
  return <div ref={setNodeRef}>{children}</div>
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
  assigned_coach?: {
    id: string
    full_name: string
  } | null
  program_name: string | null
  membership_type: string | null
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

interface OnboardingEmail {
  id: string
  user_id: string
  email_type: string
  email_subject: string
  sent_at: string
  email_status: string
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
}

interface CoachData {
  id: string
  name: string
  clients: number
}

function SortableUser({ user, stage }: { user: Profile; stage: FulfillmentStage }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: user.id })

  const style = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`p-3 bg-card border rounded-lg ${isDragging ? 'opacity-50' : ''}`}
      {...attributes}
    >
      <div className="flex items-center space-x-3">
        <div {...listeners} className="cursor-grab hover:cursor-grabbing">
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>
        {user.avatar_url && (
          <img 
            src={user.avatar_url} 
            alt={user.display_name || 'User'} 
            className="w-8 h-8 rounded-full object-cover"
          />
        )}
        <div className="flex-1">
          <div className="font-medium text-sm">
            {user.display_name || `${user.first_name} ${user.last_name}`}
          </div>
          <div className="text-xs text-muted-foreground">
            Progress: {user.course_progress || 0}% | 
            Group: {user.group_calls_attended || 0} | 
            1-1: {user.one_on_one_calls_attended || 0}
          </div>
        </div>
      </div>
    </div>
  )
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
  const [onboardingEmails, setOnboardingEmails] = useState<OnboardingEmail[]>([])
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
    groupCallsThisMonth: 0
  })
  const [coachData, setCoachData] = useState<CoachData[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [platformSettings, setPlatformSettings] = useState({ 
    platform_name: 'Fampreneurs', 
    admin_email: 'admin@fampreneurs.com' 
  })
  const [activeId, setActiveId] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban')
  const [selectedSessionForPreview, setSelectedSessionForPreview] = useState<any>(null)

  const sensors = useSensors(
    useSensor(MouseSensor),
    useSensor(TouchSensor)
  )

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
            assigned_coach: assignedCoach
          }
        })
      )

      setUsers(usersWithRoles)

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

      // Load onboarding emails
      const { data: emailsData, error: emailsError } = await supabase
        .from('onboarding_emails')
        .select('*')
        .order('sent_at', { ascending: false })

      if (emailsError) throw emailsError
      setOnboardingEmails(emailsData || [])

      // Load metrics
      await loadMetrics()
      await loadCoachData()

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

  const loadMetrics = async () => {
    try {
      const now = new Date()
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      const fifteenDaysAgo = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000)
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

      // Revenue metrics
      const { data: revenueData } = await supabase
        .from('revenue_metrics')
        .select('*')
        .gte('transaction_date', thirtyDaysAgo.toISOString())

      const newRenewals = revenueData?.filter(r => r.transaction_type === 'renewal').length || 0
      const newUpsells = revenueData?.filter(r => r.transaction_type === 'upsell').length || 0
      const totalRevenue = revenueData?.reduce((sum, r) => sum + Number(r.amount), 0) || 0
      const averageRevenue = revenueData?.length ? totalRevenue / revenueData.length : 0

      // Satisfaction scores from feedback responses
      const { data: feedbackData } = await supabase
        .from('feedback_responses')
        .select('overall_experience_rating, coach_response_rating')
        .gte('created_at', thirtyDaysAgo.toISOString())

      const avgSatisfaction = feedbackData?.length 
        ? feedbackData.reduce((sum, response) => {
            const experienceRating = response.overall_experience_rating || 0
            const coachRating = response.coach_response_rating || 0
            return sum + ((experienceRating + coachRating) / 2)
          }, 0) / feedbackData.length 
        : 0

      // Coaching calls data - using session_attendance for accurate data
      const { data: attendanceData } = await supabase
        .from('session_attendance')
        .select('session_type, created_at, attended')
        .eq('attended', true)
        .gte('created_at', thirtyDaysAgo.toISOString())

      const groupCalls30Days = attendanceData?.filter(a => a.session_type === 'group').length || 0
      const groupCalls15Days = attendanceData?.filter(a => 
        a.session_type === 'group' && new Date(a.created_at) >= fifteenDaysAgo
      ).length || 0
      const groupCallsThisMonth = attendanceData?.filter(a => 
        a.session_type === 'group' && new Date(a.created_at) >= startOfMonth
      ).length || 0

      const oneOnOneCalls30Days = attendanceData?.filter(a => a.session_type === 'individual').length || 0
      const oneOnOneCalls15Days = attendanceData?.filter(a => 
        a.session_type === 'individual' && new Date(a.created_at) >= fifteenDaysAgo
      ).length || 0
      const oneOnOneCallsThisMonth = attendanceData?.filter(a => 
        a.session_type === 'individual' && new Date(a.created_at) >= startOfMonth
      ).length || 0

      setMetrics({
        newRenewals,
        nonRenewals: 5, // Placeholder
        newUpsells,
        nonUpsells: 3, // Placeholder
        totalRevenue,
        averageRevenue,
        renewalRate: 85, // Placeholder
        satisfactionScore: avgSatisfaction,
        oneOnOneCalls30Days,
        oneOnOneCalls15Days,
        oneOnOneCallsThisMonth,
        groupCalls30Days,
        groupCalls15Days,
        groupCallsThisMonth
      })

    } catch (error) {
      console.error('Error loading metrics:', error)
    }
  }

  const loadCoachData = async () => {
    try {
      console.log('Loading coach data...')
      
      // Get all coaches first
      const { data: allCoaches, error: coachesError } = await supabase
        .from('coaches')
        .select('id, full_name')
        .eq('is_active', true)

      if (coachesError) {
        console.error('Error fetching coaches:', coachesError)
        throw coachesError
      }

      console.log('Found coaches:', allCoaches)

      // Get coach assignments with coach data
      const { data: coachAssignments, error: assignmentsError } = await supabase
        .from('coach_assignments')
        .select('coach_id')
        .eq('status', 'active')

      if (assignmentsError) {
        console.error('Error fetching coach assignments:', assignmentsError)
        throw assignmentsError
      }

      console.log('Found coach assignments:', coachAssignments)

      // Count assignments per coach
      const coachCounts = coachAssignments?.reduce((acc, assignment) => {
        acc[assignment.coach_id] = (acc[assignment.coach_id] || 0) + 1
        return acc
      }, {} as Record<string, number>) || {}

      console.log('Coach counts:', coachCounts)

      // Include coaches with 0 assignments and add unique keys
      const coachDataArray = (allCoaches || []).map((coach, index) => ({
        id: coach.id, // Add unique ID for React keys
        name: coach.full_name,
        clients: coachCounts[coach.id] || 0
      }))

      console.log('Final coach data array:', coachDataArray)
      setCoachData(coachDataArray)
    } catch (error) {
      console.error('Error loading coach data:', error)
      // Fallback with sample data if there's an error
      setCoachData([
        { id: 'fallback', name: 'No coaches', clients: 0 }
      ])
    }
  }

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)

    if (!over) return

    const userId = active.id as string
    const newStageId = over.id as string

    // Update user's fulfillment stage
    try {
      // First, remove existing progress record
      await supabase
        .from('user_fulfillment_progress')
        .delete()
        .eq('user_id', userId)

      // If not moving to unassigned, insert new progress record
      if (newStageId !== 'unassigned') {
        const { error } = await supabase
          .from('user_fulfillment_progress')
          .insert({
            user_id: userId,
            stage_id: newStageId,
            moved_by: user?.id,
            moved_to_stage_at: new Date().toISOString()
          })

        if (error) throw error
      }

      // Update local state immediately for better UX
      setUsers(prevUsers => prevUsers.map(u => {
        if (u.user_id === userId) {
          const stageName = newStageId === 'unassigned' 
            ? null 
            : fulfillmentStages.find(s => s.id === newStageId)?.name || null
          return { ...u, fulfillment_stage: stageName }
        }
        return u
      }))

      toast({
        title: "User moved",
        description: "User has been moved to the new stage successfully.",
      })

      // Reload data to ensure consistency
      setTimeout(() => loadAdminData(), 500)
    } catch (error: any) {
      toast({
        title: "Error moving user",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  const savePlatformSettings = async () => {
    try {
      const settingsToUpdate = [
        { setting_key: 'platform_name', setting_value: platformSettings.platform_name },
        { setting_key: 'admin_email', setting_value: platformSettings.admin_email }
      ]

      for (const setting of settingsToUpdate) {
        const { error } = await supabase
          .from('platform_settings')
          .upsert({
            setting_key: setting.setting_key,
            setting_value: setting.setting_value,
            updated_by: user?.id,
            description: setting.setting_key === 'platform_name' ? 'Platform display name' : 'Administrator email address'
          }, {
            onConflict: 'setting_key'
          })

        if (error) throw error
      }

      toast({
        title: "Settings saved",
        description: "Platform settings have been updated successfully.",
      })
      
      // Reload only the platform settings to reflect the saved changes
      const { data: settingsData, error: settingsError } = await supabase
        .from('platform_settings')
        .select('setting_key, setting_value')
        .in('setting_key', ['platform_name', 'admin_email'])

      if (!settingsError && settingsData) {
        const settings = settingsData.reduce((acc, setting) => {
          acc[setting.setting_key] = setting.setting_value
          return acc
        }, {} as any)

        setPlatformSettings({
          platform_name: settings.platform_name || 'Fampreneurs',
          admin_email: settings.admin_email || 'admin@fampreneurs.com'
        })
      }
    } catch (error: any) {
      toast({
        title: "Error saving settings",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  const filteredUsers = users.filter(user => 
    user.display_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (!user || !profile?.is_admin) {
    return null
  }

  const getUsersInStage = (stageId: string) => {
    return users.filter(user => {
      // Get the user's current stage from their fulfillment progress
      return user.fulfillment_stage === fulfillmentStages.find(s => s.id === stageId)?.name
    })
  }

  const getUsersWithoutStage = () => {
    return users.filter(user => !user.fulfillment_stage)
  }

  const activeUser = activeId ? users.find(u => u.id === activeId) : null

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b" style={{ backgroundColor: '#290a52' }}>
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/')}
                className="text-white hover:bg-white/10 transition-colors hover:text-[#ffb500]"
                title="Back to Dashboard"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <Shield className="h-8 w-8" style={{ color: '#ffb500' }} />
              <div>
                <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
                <p className="text-gray-300">Manage your Fampreneurs platform</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <AdminThemeToggle />
              <Badge variant="secondary" style={{ backgroundColor: '#ffb500', color: '#290a52' }}>
                Admin
              </Badge>
              <Button 
                variant="outline" 
                onClick={signOut}
                className="border-white/20 hover:bg-white/10"
                style={{ 
                  color: '#290a52',
                  backgroundColor: theme === 'light' ? 'transparent' : '#ffb500',
                  borderColor: theme === 'light' ? 'rgba(255, 255, 255, 0.2)' : '#ffb500'
                }}
              >
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="overview">
              <BarChart3 className="h-4 w-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="users">
              <Users className="h-4 w-4 mr-2" />
              Users
            </TabsTrigger>
            <TabsTrigger value="courses">
              <BookOpen className="h-4 w-4 mr-2" />
              Courses
             </TabsTrigger>
            <TabsTrigger value="coaching">
              <Calendar className="h-4 w-4 mr-2" />
              Coaching
            </TabsTrigger>
            <TabsTrigger value="feedback">
              <MessageSquare className="h-4 w-4 mr-2" />
              Feedback
            </TabsTrigger>
            <TabsTrigger value="settings">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Revenue Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">New Renewals</CardTitle>
                  <TrendingUp className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{metrics.newRenewals}</div>
                  <p className="text-xs text-muted-foreground">Last 30 days</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Non-Renewals</CardTitle>
                  <TrendingDown className="h-4 w-4 text-red-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{metrics.nonRenewals}</div>
                  <p className="text-xs text-muted-foreground">Last 30 days</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">New Upsells</CardTitle>
                  <Target className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{metrics.newUpsells}</div>
                  <p className="text-xs text-muted-foreground">Last 30 days</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Non-Upsells</CardTitle>
                  <XCircle className="h-4 w-4 text-red-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{metrics.nonUpsells}</div>
                  <p className="text-xs text-muted-foreground">Last 30 days</p>
                </CardContent>
              </Card>
            </div>

            {/* Financial Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                  <DollarSign className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${metrics.totalRevenue.toFixed(2)}</div>
                  <p className="text-xs text-muted-foreground">Last 30 days</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Average Revenue</CardTitle>
                  <BarChart className="h-4 w-4 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${metrics.averageRevenue.toFixed(2)}</div>
                  <p className="text-xs text-green-600">On track</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Renewal Rate</CardTitle>
                  <Activity className="h-4 w-4 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{metrics.renewalRate}%</div>
                  <p className="text-xs text-green-600">Good performance</p>
                </CardContent>
              </Card>
            </div>

            {/* Satisfaction & Calls */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Satisfaction Score</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center space-x-2">
                    <Star className="h-5 w-5 text-yellow-500" />
                    <div className="text-2xl font-bold">{(metrics.satisfactionScore * 10).toFixed(1)}%</div>
                  </div>
                  <p className="text-xs text-muted-foreground">Average user satisfaction</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Coaching Calls</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">1-1 Calls (This Month):</span>
                      <span className="font-bold">{metrics.oneOnOneCallsThisMonth}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">1-1 Calls (15 days):</span>
                      <span className="font-bold">{metrics.oneOnOneCalls15Days}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">1-1 Calls (30 days):</span>
                      <span className="font-bold">{metrics.oneOnOneCalls30Days}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Group Calls (This Month):</span>
                      <span className="font-bold">{metrics.groupCallsThisMonth}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Group Calls (15 days):</span>
                      <span className="font-bold">{metrics.groupCalls15Days}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Group Calls (30 days):</span>
                      <span className="font-bold">{metrics.groupCalls30Days}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Clients per Coach Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Members per Coach</CardTitle>
                <CardDescription>Distribution of members across coaches</CardDescription>
              </CardHeader>
              <CardContent>
                 {coachData.length > 0 ? (
                  <div>
                    <div className="mb-2 text-sm text-muted-foreground">
                      Debug: Found {coachData.length} coaches
                    </div>
                  <ResponsiveContainer width="100%" height={300}>
                     <RechartsBarChart data={coachData} layout="horizontal" margin={{ left: 20, right: 20, top: 20, bottom: 20 }}>
                       <CartesianGrid strokeDasharray="3 3" />
                       <XAxis type="number" />
                       <YAxis 
                         dataKey="name" 
                         type="category" 
                         width={180} 
                         tick={{ fontSize: 12 }}
                         interval={0}
                       />
                       <Tooltip 
                         formatter={(value: number, name: string) => [`${value} member${value !== 1 ? 's' : ''}`, 'Assigned Members']}
                         labelFormatter={(label: string) => `Coach: ${label}`}
                       />
                       <Bar 
                         dataKey="clients" 
                         fill="#ffb500"
                         radius={[0, 4, 4, 0]}
                       />
                     </RechartsBarChart>
                   </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                    <div className="text-center">
                      <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No coach assignments yet</p>
                      <p className="text-sm">Assign coaches to members in the Users section to see the distribution</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-semibold">Users Management</h2>
              <Select onValueChange={(value) => {
                if (value === 'create-stages') {
                  // Handle create stages
                  toast({
                    title: "Create Stages",
                    description: "Stage creation functionality coming soon",
                  })
                } else if (value === 'import-stages') {
                  // Handle import template
                  toast({
                    title: "Import Template",
                    description: "Template import functionality coming soon",
                  })
                } else if (value === 'manage-stages') {
                  // Handle manage stages
                  toast({
                    title: "Manage Stages",
                    description: "Stage management functionality coming soon",
                  })
                }
              }}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Setup Pipeline" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="create-stages">Create Stages</SelectItem>
                  <SelectItem value="import-stages">Import Template</SelectItem>
                  <SelectItem value="manage-stages">Manage Stages</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Users
                  </CardTitle>
                </div>
                <div className="flex items-center space-x-2">
                  <Search className="h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search users..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="max-w-sm"
                  />
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {filteredUsers.map(user => (
                    <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg gap-4">
                      <UserCard 
                        user={user} 
                        onRolesUpdated={loadAdminData}
                      />
                      <div className="flex items-end gap-4 flex-shrink-0">
                        <div>
                          <Label className="text-sm font-medium">Assigned Coach</Label>
                          <Select 
                            value={user.assigned_coach?.id || 'none'}
                            onValueChange={async (value) => {
                              if (!value) return
                              
                              try {
                                // First, deactivate any existing assignments
                                await supabase
                                  .from('coach_assignments')
                                  .update({ status: 'inactive' })
                                  .eq('user_id', user.user_id)
                                  .eq('status', 'active')

                                // If value is "none", just deactivate and don't create new assignment
                                if (value === 'none') {
                                  toast({
                                    title: "Coach Unassigned",
                                    description: "Coach has been removed from the user.",
                                  })
                                } else {
                                  // Then create new assignment
                                  const { error } = await supabase
                                    .from('coach_assignments')
                                    .insert({
                                      user_id: user.user_id,
                                      coach_id: value,
                                      status: 'active'
                                    })
                                  
                                  if (error) throw error
                                  
                                  toast({
                                    title: "Coach Assigned",
                                    description: "Coach has been successfully assigned to the user.",
                                  })
                                }
                                
                                loadAdminData()
                              } catch (error) {
                                console.error('Error assigning coach:', error)
                                toast({
                                  title: "Error",
                                  description: "Failed to assign coach. Please try again.",
                                  variant: "destructive",
                                })
                              }
                            }}
                          >
                            <SelectTrigger className="w-[200px] mt-1">
                              <SelectValue placeholder="Select coach" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">No Coach</SelectItem>
                              {coaches.map((coach) => (
                                <SelectItem key={coach.id} value={coach.id}>
                                  {coach.full_name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-sm font-medium">Activation Status</Label>
                          <Select onValueChange={(value) => {
                            toast({
                              title: "Activation Point Updated",
                              description: `User moved to: ${value}`,
                            })
                          }}>
                            <SelectTrigger className="w-[250px] mt-1">
                              <SelectValue placeholder="Select activation point" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="admin-onboarding">Admin Onboarding</SelectItem>
                              <SelectItem value="onboarding-call">Onboarding Call</SelectItem>
                              <SelectItem value="credit-repair">Credit Repair</SelectItem>
                              <SelectItem value="credit-funding">Credit Funding</SelectItem>
                              <SelectItem value="pending-account">Pending Account</SelectItem>
                              <SelectItem value="3-trusts-approved">3 Trusts Approved</SelectItem>
                              <SelectItem value="first-trust-funded">First Trust Funded</SelectItem>
                              <SelectItem value="digital-family-office-online">Digital Family Office Online</SelectItem>
                              <SelectItem value="scheduled-1st-family-legacy-meeting">Scheduled 1st Family Legacy Meeting</SelectItem>
                              <SelectItem value="graduated">Graduated</SelectItem>
                              <SelectItem value="upsell-renewals">Upsell/Renewals</SelectItem>
                              <SelectItem value="paused">Paused</SelectItem>
                              <SelectItem value="mentee-lost">Mentee Lost</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Courses Tab */}
          <TabsContent value="courses" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Course Management</CardTitle>
                    <CardDescription>
                      Picture-based courses with video content management
                    </CardDescription>
                  </div>
                  <CreateCourseDialog onCourseCreated={loadAdminData} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {courses.map((course) => (
                    <Card key={course.id} className="overflow-hidden">
                      <div className="aspect-video bg-muted relative">
                        {course.image_url ? (
                          <img 
                            src={course.image_url} 
                            alt={course.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <BookOpen className="h-12 w-12 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <CardContent className="p-4">
                        <h4 className="font-medium truncate">{course.title}</h4>
                        <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                          {course.description || 'No description'}
                        </p>
                        <div className="flex items-center justify-between mt-3">
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">{course.category || 'General'}</Badge>
                            <Badge 
                              variant={(course as any).status === 'published' ? 'default' : 'outline'}
                              className={(course as any).status === 'draft' ? 'text-orange-600 border-orange-600' : ''}
                            >
                              {(course as any).status === 'published' ? 'Published' : 'Draft'}
                            </Badge>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {course.level || 'Beginner'}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 mt-3">
                          <VideoDialogWrapper 
                            courseId={course.id}
                            onVideoAdded={loadAdminData}
                          />
                          <EditCourseDialog 
                            course={course} 
                            onCourseUpdated={loadAdminData}
                          />
                          <Button
                            variant="outline" 
                            size="sm"
                            onClick={() => navigate(`/courses?course=${course.id}`)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Videos
                          </Button>
                          <Button 
                            variant="destructive" 
                            size="sm"
                            onClick={() => {
                              supabase.from('courses').delete().eq('id', course.id).then(() => {
                                toast({ title: "Course deleted" })
                                loadAdminData()
                              })
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Coaching Tab */}
          <TabsContent value="coaching" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Coaches</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{coaches.length}</div>
                  <p className="text-xs text-muted-foreground">Active coaches</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Coaching Sessions</CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{coachingSessions.length}</div>
                  <p className="text-xs text-muted-foreground">Scheduled sessions</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Booking Rate</CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">85%</div>
                  <p className="text-xs text-green-600">High booking rate</p>
                </CardContent>
              </Card>
            </div>

            {/* Coaches Management */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Coaches Management</CardTitle>
                    <CardDescription>
                      Manage coaches and their availability for 1-on-1 sessions
                    </CardDescription>
                  </div>
                  <div className="flex items-center justify-between">
                    <AddCoachDialog onCoachAdded={loadAdminData} />
                    <UserSessionQuotaDialog onQuotaUpdated={loadAdminData} />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {coaches.map((coach) => (
                    <Card key={coach.id}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center space-x-3">
                          {coach.avatar_url ? (
                            <img 
                              src={coach.avatar_url} 
                              alt={coach.full_name}
                              className="w-12 h-12 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                              <Users className="h-6 w-6 text-muted-foreground" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-sm truncate">{coach.full_name}</CardTitle>
                            <CardDescription className="truncate">{coach.email}</CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Rate:</span>
                            <span>${coach.hourly_rate || 'N/A'}/hr</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>Experience:</span>
                            <span>{coach.years_experience || 'N/A'} years</span>
                          </div>
                          <div className="flex items-center justify-between mt-3">
                            <Badge variant={coach.is_active ? "default" : "secondary"}>
                              {coach.is_active ? "Active" : "Inactive"}
                            </Badge>
                            <EditCoachDialog 
                              coach={coach} 
                              onCoachUpdated={loadAdminData}
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Coaching Sessions */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Coaching Sessions</CardTitle>
                    <CardDescription>
                      Schedule and manage group and 1-on-1 coaching sessions
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <AddCoachingSessionDialog 
                      type="group" 
                      onSessionAdded={loadAdminData} 
                    />
                    <AddCoachingSessionDialog 
                      type="one-on-one" 
                      onSessionAdded={loadAdminData} 
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {coachingSessions.map((session) => (
                    <div key={session.id} className="p-4 border rounded-lg">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <h4 className="font-medium">{session.title}</h4>
                            <Badge variant={session.max_participants > 1 ? "default" : "secondary"}>
                              {session.max_participants > 1 ? "Group" : "1-on-1"}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            Coach: {session.coach_name}
                          </p>
                          <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                            <span>📅 {new Date(session.session_date).toLocaleDateString()}</span>
                            <span>🕐 {session.session_time}</span>
                            <span>⏱️ {session.duration_minutes} min</span>
                            <span>👥 {session.current_participants || 0}/{session.max_participants}</span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setSelectedSessionForPreview(session)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <EditCoachingSessionDialog 
                            session={session} 
                            onSessionUpdated={loadAdminData} 
                          />
                          <Button 
                            variant="destructive" 
                            size="sm"
                            onClick={async () => {
                              const sessionTable = session.session_type === 'group' || (session.max_participants || 1) > 1 
                                ? 'group_coaching_sessions' 
                                : 'individual_coaching_sessions'
                              
                              const { error } = await supabase
                                .from(sessionTable)
                                .delete()
                                .eq('id', session.id)
                              
                              if (!error) {
                                toast({ title: "Session deleted" })
                                loadAdminData()
                              } else {
                                toast({ 
                                  title: "Error deleting session", 
                                  description: error.message,
                                  variant: "destructive" 
                                })
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Coaching Call Recordings */}
            <CoachingRecordings />
          </TabsContent>

          {/* Feedback Tab */}
          <TabsContent value="feedback" className="space-y-6">
            <FeedbackManagement />
            
            {/* Weekly Check-ins Section */}
            <div className="mt-8">
              <WeeklyCheckinManagement />
            </div>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>System Settings</CardTitle>
                <CardDescription>
                  Configure platform settings and preferences
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h4 className="font-medium">Platform Settings</h4>
                      <div className="space-y-2">
                        <Label htmlFor="platform-name">Platform Name</Label>
                        <Input 
                          id="platform-name" 
                          value={platformSettings.platform_name}
                          onChange={(e) => setPlatformSettings(prev => ({ ...prev, platform_name: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="admin-email">Admin Email</Label>
                        <Input 
                          id="admin-email" 
                          value={platformSettings.admin_email}
                          onChange={(e) => setPlatformSettings(prev => ({ ...prev, admin_email: e.target.value }))}
                        />
                      </div>
                      <Button onClick={savePlatformSettings}>
                        <Save className="h-4 w-4 mr-2" />
                        Save Settings
                      </Button>
                    </div>
                    <div className="space-y-4">
                      <h4 className="font-medium">Security Settings</h4>
                      <Button variant="outline" className="w-full">
                        Reset Admin Password
                      </Button>
                      <Button variant="outline" className="w-full">
                        Backup Database
                      </Button>
                      <Button variant="destructive" className="w-full">
                        Clear All Data
                      </Button>
                    </div>
                  </div>
                  
                  {/* Zapier Integration Section */}
                  <div className="pt-6 border-t">
                    <ZapierIntegration />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Session Preview Dialog */}
        <Dialog open={!!selectedSessionForPreview} onOpenChange={() => setSelectedSessionForPreview(null)}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Session Preview
              </DialogTitle>
            </DialogHeader>
            {selectedSessionForPreview && (
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-lg">{selectedSessionForPreview.title}</h3>
                  <p className="text-muted-foreground">{selectedSessionForPreview.coach_name}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Date</Label>
                    <p className="text-sm">{format(new Date(selectedSessionForPreview.session_date), 'MMMM d, yyyy')}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Time</Label>
                    <p className="text-sm">{selectedSessionForPreview.session_time}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Duration</Label>
                    <p className="text-sm">{selectedSessionForPreview.duration_minutes} minutes</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Type</Label>
                    <p className="text-sm">{selectedSessionForPreview.session_type === 'group' ? 'Group Session' : '1-on-1 Session'}</p>
                  </div>
                </div>

                {selectedSessionForPreview.description && (
                  <div>
                    <Label className="text-sm font-medium">Description</Label>
                    <p className="text-sm text-muted-foreground">{selectedSessionForPreview.description}</p>
                  </div>
                )}

                {selectedSessionForPreview.session_type === 'group' && (
                  <div>
                    <Label className="text-sm font-medium">Participants</Label>
                    <p className="text-sm">{selectedSessionForPreview.current_participants || 0} / {selectedSessionForPreview.max_participants}</p>
                  </div>
                )}

                <div className="flex gap-2 pt-4">
                  <Button 
                    onClick={() => window.open(selectedSessionForPreview.meeting_url, '_blank')} 
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
    </div>
  )
}