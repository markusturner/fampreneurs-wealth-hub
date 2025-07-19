import React, { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { UserRoleManagement } from './user-role-management'
import { Users, Calendar } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'

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
  program_name: string | null
  membership_type: string | null
}

interface UserCardProps {
  user: Profile
  onRolesUpdated: () => void
}

interface UserStats {
  courseProgress: number
  totalCourses: number
  completedCourses: number
  groupSessions: number
  oneOnOneSessions: number
}

export function UserCard({ user, onRolesUpdated }: UserCardProps) {
  const { toast } = useToast()
  const [stats, setStats] = useState<UserStats>({
    courseProgress: 0,
    totalCourses: 0,
    completedCourses: 0,
    groupSessions: 0,
    oneOnOneSessions: 0
  })
  const [loading, setLoading] = useState(true)
  const [updatingProgram, setUpdatingProgram] = useState(false)

  useEffect(() => {
    loadUserStats()
  }, [user.user_id])

  const loadUserStats = async () => {
    try {
      setLoading(true)

      // Load course enrollments and progress
      const { data: enrollments, error: enrollmentError } = await supabase
        .from('course_enrollments')
        .select('progress, completed_at')
        .eq('user_id', user.user_id)

      if (enrollmentError) throw enrollmentError

      // Load coaching session enrollments
      const { data: sessionEnrollments, error: sessionError } = await supabase
        .from('session_enrollments')
        .select(`
          *,
          group_coaching_sessions (
            meeting_type,
            max_participants
          )
        `)
        .eq('user_id', user.user_id)

      if (sessionError) throw sessionError

      // Calculate stats
      const totalCourses = enrollments?.length || 0
      const completedCourses = enrollments?.filter(e => e.completed_at)?.length || 0
      const avgProgress = totalCourses > 0 
        ? Math.round(enrollments.reduce((acc, e) => acc + (e.progress || 0), 0) / totalCourses)
        : 0

      // Count group vs 1-on-1 sessions
      const groupSessions = sessionEnrollments?.filter(
        e => e.group_coaching_sessions?.max_participants && e.group_coaching_sessions.max_participants > 1
      )?.length || 0

      const oneOnOneSessions = sessionEnrollments?.filter(
        e => !e.group_coaching_sessions?.max_participants || e.group_coaching_sessions.max_participants === 1
      )?.length || 0

      setStats({
        courseProgress: avgProgress,
        totalCourses,
        completedCourses,
        groupSessions,
        oneOnOneSessions
      })

    } catch (error: any) {
      console.error('Error loading user stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const getInitials = (user: Profile) => {
    if (user.display_name) return user.display_name.charAt(0)
    if (user.first_name) return user.first_name.charAt(0)
    return 'U'
  }

  const getDisplayName = (user: Profile) => {
    return user.display_name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Unnamed User'
  }

  const handleProgramChange = async (newProgram: string) => {
    setUpdatingProgram(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ program_name: newProgram })
        .eq('user_id', user.user_id)

      if (error) throw error

      toast({
        title: "Success",
        description: "User program updated successfully!"
      })

      onRolesUpdated() // Refresh the user data
    } catch (error) {
      console.error('Error updating program:', error)
      toast({
        title: "Error",
        description: "Failed to update user program",
        variant: "destructive"
      })
    } finally {
      setUpdatingProgram(false)
    }
  }

  return (
    <Card className="p-4">
      <CardContent className="p-0">
        <div className="flex items-start space-x-4">
          {/* Avatar */}
          <Avatar className="h-12 w-12">
            <AvatarImage src={user.avatar_url || undefined} />
            <AvatarFallback className="bg-primary text-primary-foreground">
              {getInitials(user)}
            </AvatarFallback>
          </Avatar>

            {/* User Info */}
            <div className="flex-1 space-y-3">
              <div>
                <div className="flex items-center space-x-2">
                  <h4 className="font-medium">{getDisplayName(user)}</h4>
                  {user.membership_type === 'paid' && (
                    <Badge variant="secondary" className="text-xs">
                      Paid
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{user.email}</p>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Program:</span>
                  <Select
                    value={user.program_name || ''}
                    onValueChange={handleProgramChange}
                    disabled={updatingProgram}
                  >
                    <SelectTrigger className="h-6 text-xs min-w-[200px]">
                      <SelectValue placeholder="Select program" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="The Family Business University">The Family Business University</SelectItem>
                      <SelectItem value="The Family Vault">The Family Vault</SelectItem>
                      <SelectItem value="The Family Business Accelerator">The Family Business Accelerator</SelectItem>
                      <SelectItem value="The Family Legacy: VIP Weekend">The Family Legacy: VIP Weekend</SelectItem>
                      <SelectItem value="The Family Fortune Mastermind">The Family Fortune Mastermind</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

            {/* Course Progress */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Course Progress</span>
                <span className="font-medium">{stats.courseProgress}%</span>
              </div>
              <Progress value={stats.courseProgress} className="h-2" />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{stats.completedCourses}/{stats.totalCourses} completed</span>
              </div>
            </div>

            {/* Coaching Stats */}
            <div className="flex items-center space-x-4 text-sm">
              <div className="flex items-center space-x-1">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Group:</span>
                <span className="font-medium">{stats.groupSessions}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">1-on-1:</span>
                <span className="font-medium">{stats.oneOnOneSessions}</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-2">
            <UserRoleManagement 
              user={user} 
              onRolesUpdated={onRolesUpdated}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}