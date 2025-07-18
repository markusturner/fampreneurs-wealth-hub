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
  Target
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useNavigate } from 'react-router-dom'
import { Separator } from '@/components/ui/separator'
import { CreateCourseDialog } from '@/components/admin/create-course-dialog'
import { EditCourseDialog } from '@/components/admin/edit-course-dialog'
import { UserRoleManagement } from '@/components/admin/user-role-management'
import { UserCard } from '@/components/admin/user-card'
import { CommunicationManagement } from '@/components/admin/communication-management'
import { ThemeSettings } from '@/components/admin/theme-settings'
import { 
  DndContext, 
  DragEndEvent, 
  DragOverlay, 
  DragStartEvent,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCenter
} from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { 
  useSortable
} from '@dnd-kit/sortable'
import { GripVertical } from 'lucide-react'
import { ResponsiveContainer, BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts'

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

interface PostProfile {
  first_name: string | null
  last_name: string | null
  display_name: string | null
}

interface Post {
  id: string
  content: string
  user_id: string
  created_at: string
  profiles?: PostProfile | null
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
  
  const [users, setUsers] = useState<Profile[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [posts, setPosts] = useState<Post[]>([])
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
        .select(`
          *,
          user_fulfillment_progress (
            stage_id,
            fulfillment_stages (
              name
            )
          )
        `)
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
          
          return {
            ...profile,
            email: 'Protected',
            roles: userRoles?.map(r => r.role) || ['member'],
            fulfillment_stage: (profile as any).user_fulfillment_progress?.[0]?.fulfillment_stages?.name || null,
            course_progress: Math.round(avgProgress),
            group_calls_attended: groupSessions?.length || 0,
            one_on_one_calls_attended: oneOnOneSessions?.length || 0
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

      // Load community posts with reactions and comments
      const { data: postsData, error: postsError } = await supabase
        .from('community_posts')
        .select(`
          *,
          community_reactions (id),
          community_comments (id)
        `)
        .order('created_at', { ascending: false })
        .limit(20)

      if (postsError) throw postsError

      const postsWithProfiles = await Promise.all(
        (postsData || []).map(async (post) => {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('first_name, last_name, display_name')
            .eq('user_id', post.user_id)
            .single()
          
          return {
            ...post,
            profiles: profileData,
            reactions_count: (post as any).community_reactions?.length || 0,
            comments_count: (post as any).community_comments?.length || 0
          }
        })
      )

      setPosts(postsWithProfiles)

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

      // Satisfaction scores
      const { data: satisfactionData } = await supabase
        .from('satisfaction_scores')
        .select('score')
        .gte('created_at', thirtyDaysAgo.toISOString())

      const avgSatisfaction = satisfactionData?.length 
        ? satisfactionData.reduce((sum, s) => sum + s.score, 0) / satisfactionData.length 
        : 0

      // Coaching calls data
      const { data: sessionData } = await supabase
        .from('session_enrollments')
        .select('enrolled_at')
        .gte('enrolled_at', thirtyDaysAgo.toISOString())

      const calls30Days = sessionData?.length || 0
      const calls15Days = sessionData?.filter(s => new Date(s.enrolled_at) >= fifteenDaysAgo).length || 0
      const callsThisMonth = sessionData?.filter(s => new Date(s.enrolled_at) >= startOfMonth).length || 0

      setMetrics({
        newRenewals,
        nonRenewals: 5, // Placeholder
        newUpsells,
        nonUpsells: 3, // Placeholder
        totalRevenue,
        averageRevenue,
        renewalRate: 85, // Placeholder
        satisfactionScore: avgSatisfaction,
        oneOnOneCalls30Days: calls30Days,
        oneOnOneCalls15Days: calls15Days,
        oneOnOneCallsThisMonth: callsThisMonth,
        groupCalls30Days: calls30Days,
        groupCalls15Days: calls15Days,
        groupCallsThisMonth: callsThisMonth
      })

    } catch (error) {
      console.error('Error loading metrics:', error)
    }
  }

  const loadCoachData = async () => {
    try {
      const { data: coachAssignments } = await supabase
        .from('coach_assignments')
        .select(`
          coach_id,
          profiles!coach_assignments_coach_id_fkey (
            first_name,
            last_name,
            display_name
          )
        `)
        .eq('status', 'active')

      const coachCounts = coachAssignments?.reduce((acc, assignment) => {
        const coachName = (assignment as any).profiles?.display_name || 
          `${(assignment as any).profiles?.first_name} ${(assignment as any).profiles?.last_name}`
        acc[coachName] = (acc[coachName] || 0) + 1
        return acc
      }, {} as Record<string, number>) || {}

      const coachDataArray = Object.entries(coachCounts).map(([name, clients]) => ({
        name,
        clients
      }))

      setCoachData(coachDataArray)
    } catch (error) {
      console.error('Error loading coach data:', error)
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
            moved_by: user?.id
          })

        if (error) throw error
      }

      toast({
        title: "User moved",
        description: "User has been moved to the new stage successfully.",
      })

      loadAdminData()
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
          })

        if (error) throw error
      }

      toast({
        title: "Settings saved",
        description: "Platform settings have been updated successfully.",
      })
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
              <Shield className="h-8 w-8" style={{ color: '#ffb500' }} />
              <div>
                <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
                <p className="text-gray-300">Manage your Fampreneurs platform</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Badge variant="secondary" style={{ backgroundColor: '#ffb500', color: '#290a52' }}>
                Admin
              </Badge>
              <Button 
                variant="outline" 
                onClick={signOut}
                className="border-white/20 text-white hover:bg-white/10"
              >
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">
              <BarChart3 className="h-4 w-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="users">
              <Users className="h-4 w-4 mr-2" />
              Users & Fulfillment
            </TabsTrigger>
            <TabsTrigger value="courses">
              <BookOpen className="h-4 w-4 mr-2" />
              Courses
            </TabsTrigger>
            <TabsTrigger value="community">
              <MessageSquare className="h-4 w-4 mr-2" />
              Community
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
                <CardTitle>Clients per Coach</CardTitle>
                <CardDescription>Distribution of clients across coaches</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsBarChart data={coachData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="clients" fill="#ffb500" />
                  </RechartsBarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Users & Fulfillment Tab */}
          <TabsContent value="users" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Users & Fulfillment Pipeline</CardTitle>
                <CardDescription>
                  Drag and drop users between fulfillment stages
                </CardDescription>
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
                 <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                    {/* Unassigned Users Column */}
                    <Card className="min-h-[300px]">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm flex items-center space-x-2">
                          <div className="w-3 h-3 rounded-full bg-gray-400" />
                          <span>Unassigned</span>
                          <Badge variant="secondary">{getUsersWithoutStage().length}</Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <SortableContext 
                          items={getUsersWithoutStage().map(u => u.id)} 
                          strategy={verticalListSortingStrategy}
                        >
                          {getUsersWithoutStage().map((user) => (
                            <SortableUser key={user.id} user={user} stage={{ id: 'unassigned', name: 'Unassigned', description: null, stage_order: 0, color: '#6b7280', created_by: '', created_at: '' }} />
                          ))}
                        </SortableContext>
                      </CardContent>
                    </Card>

                    {/* Fulfillment Stages */}
                    {fulfillmentStages.map((stage) => {
                      const stageUsers = getUsersInStage(stage.id)
                      return (
                        <Card key={stage.id} className="min-h-[300px]">
                          <CardHeader className="pb-3">
                            <CardTitle className="text-sm flex items-center space-x-2">
                              <div 
                                className="w-3 h-3 rounded-full" 
                                style={{ backgroundColor: stage.color || '#3b82f6' }}
                              />
                              <span>{stage.name}</span>
                              <Badge variant="secondary">{stageUsers.length}</Badge>
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            <SortableContext 
                              items={stageUsers.map(u => u.id)} 
                              strategy={verticalListSortingStrategy}
                            >
                              {stageUsers.map((user) => (
                                <SortableUser key={user.id} user={user} stage={stage} />
                              ))}
                            </SortableContext>
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                  <DragOverlay>
                    {activeUser && (
                      <div className="p-3 bg-card border rounded-lg opacity-75">
                        <div className="flex items-center space-x-3">
                          {activeUser.avatar_url && (
                            <img 
                              src={activeUser.avatar_url} 
                              alt={activeUser.display_name || 'User'} 
                              className="w-8 h-8 rounded-full object-cover"
                            />
                          )}
                          <div className="font-medium text-sm">
                            {activeUser.display_name || `${activeUser.first_name} ${activeUser.last_name}`}
                          </div>
                        </div>
                      </div>
                    )}
                  </DragOverlay>
                </DndContext>
              </CardContent>
            </Card>

            {/* Onboarding Emails */}
            <Card>
              <CardHeader>
                <CardTitle>Onboarding Email Tracking</CardTitle>
                <CardDescription>
                  Track automated onboarding emails sent to new users
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {onboardingEmails.slice(0, 10).map((email) => (
                    <div key={email.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Mail className="h-4 w-4 text-blue-600" />
                        <div>
                          <div className="font-medium text-sm">{email.email_subject}</div>
                          <div className="text-xs text-muted-foreground">
                            {email.email_type} • {new Date(email.sent_at).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <Badge variant={email.email_status === 'sent' ? 'default' : 'destructive'}>
                        {email.email_status}
                      </Badge>
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
                          <Badge variant="secondary">{course.category || 'General'}</Badge>
                          <div className="text-xs text-muted-foreground">
                            {course.level || 'Beginner'}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 mt-3">
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

          {/* Community Tab */}
          <TabsContent value="community" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Posts</CardTitle>
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{posts.length}</div>
                  <p className="text-xs text-muted-foreground">Last 20 posts shown</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Groups</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">12</div>
                  <p className="text-xs text-muted-foreground">Community groups</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Engagement Rate</CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">78%</div>
                  <p className="text-xs text-green-600">High engagement</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Community Posts Management</CardTitle>
                <CardDescription>
                  Monitor and moderate community posts, reactions, and engagement
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {posts.map((post) => (
                    <div key={post.id} className="p-4 border rounded-lg">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <span className="font-medium">
                              {post.profiles?.display_name || 
                               `${post.profiles?.first_name} ${post.profiles?.last_name}` ||
                               'Anonymous User'}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(post.created_at).toLocaleDateString()}
                            </span>
                            <div className="flex items-center space-x-3 text-xs text-muted-foreground">
                              <span>❤️ {(post as any).reactions_count || 0}</span>
                              <span>💬 {(post as any).comments_count || 0}</span>
                            </div>
                          </div>
                          <p className="text-sm">{post.content}</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="destructive" 
                            size="sm"
                            onClick={async () => {
                              const { error } = await supabase
                                .from('community_posts')
                                .delete()
                                .eq('id', post.id)
                              
                              if (!error) {
                                toast({ title: "Post deleted" })
                                loadAdminData()
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

            <Card>
              <CardHeader>
                <CardTitle>Community Groups Management</CardTitle>
                <CardDescription>
                  Manage private groups, premium access, and member permissions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Create New Group
                  </Button>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">Premium Members Group</CardTitle>
                        <CardDescription>Exclusive group for premium subscribers</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between">
                          <Badge variant="secondary">24 members</Badge>
                          <Button variant="outline" size="sm">Manage</Button>
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">General Discussion</CardTitle>
                        <CardDescription>Public group for all members</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between">
                          <Badge variant="secondary">156 members</Badge>
                          <Button variant="outline" size="sm">Manage</Button>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </CardContent>
            </Card>
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
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}