import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/integrations/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import { Trophy, Star, BookOpen, Video, Users, Award, CheckCircle } from 'lucide-react'

interface Member {
  id: string
  user_id: string
  first_name: string | null
  last_name: string | null
  display_name: string | null
  avatar_url: string | null
  course_progress: number
  group_calls_attended: number
  individual_calls_attended: number
  badges: string[]
  total_score: number
}

export function Scoreboard() {
  const { user } = useAuth()
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchMemberScores()
  }, [])

  const fetchMemberScores = async () => {
    try {
      // Get all profiles first
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')

      if (profilesError) throw profilesError

      // Calculate scores for each member
      const membersWithScores = await Promise.all(
        (profiles || []).map(async (profile) => {
          // Get course completion data
          const { data: enrollments } = await supabase
            .from('course_enrollments')
            .select('progress')
            .eq('user_id', profile.user_id)

          const courseProgress = enrollments?.length 
            ? Math.round(enrollments.reduce((sum, e) => sum + e.progress, 0) / enrollments.length)
            : 0

          // Get group calls attended (mock data for now)
          const groupCallsAttended = Math.floor(Math.random() * 15)
          
          // Get individual calls attended (mock data for now)
          const individualCallsAttended = Math.floor(Math.random() * 8)

          // Calculate badges
          const badges = []
          if (courseProgress >= 100) badges.push('Course Completed')
          if (courseProgress >= 50) badges.push('Halfway There')
          if (groupCallsAttended >= 10) badges.push('Group Participant')
          if (individualCallsAttended >= 5) badges.push('1-on-1 Champion')
          if (courseProgress >= 75 && groupCallsAttended >= 5) badges.push('Engaged Learner')

          // Calculate total score
          const totalScore = courseProgress + (groupCallsAttended * 5) + (individualCallsAttended * 10)

          return {
            id: profile.id,
            user_id: profile.user_id,
            first_name: profile.first_name,
            last_name: profile.last_name,
            display_name: profile.display_name,
            avatar_url: profile.avatar_url,
            course_progress: courseProgress,
            group_calls_attended: groupCallsAttended,
            individual_calls_attended: individualCallsAttended,
            badges,
            total_score: totalScore
          }
        })
      )

      // Sort by total score
      membersWithScores.sort((a, b) => b.total_score - a.total_score)
      setMembers(membersWithScores)
    } catch (error) {
      console.error('Error fetching member scores:', error)
    } finally {
      setLoading(false)
    }
  }

  const getDisplayName = (member: Member) => {
    if (member.display_name) return member.display_name
    if (member.first_name && member.last_name) return `${member.first_name} ${member.last_name}`
    if (member.first_name) return member.first_name
    return 'Anonymous'
  }

  const getInitials = (member: Member) => {
    const name = getDisplayName(member)
    return name.split(' ').map(n => n.charAt(0)).join('').toUpperCase()
  }

  const getRankIcon = (index: number) => {
    if (index === 0) return <Trophy className="h-5 w-5 text-yellow-500" />
    if (index === 1) return <Award className="h-5 w-5 text-gray-400" />
    if (index === 2) return <Award className="h-5 w-5 text-orange-500" />
    return <Star className="h-5 w-5 text-muted-foreground" />
  }

  const getBadgeColor = (badge: string) => {
    switch (badge) {
      case 'Course Completed': return 'bg-green-500'
      case 'Halfway There': return 'bg-blue-500'
      case 'Group Participant': return 'bg-purple-500'
      case '1-on-1 Champion': return 'bg-red-500'
      case 'Engaged Learner': return 'bg-yellow-500'
      default: return 'bg-gray-500'
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-16 bg-muted rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Scoreboard Header */}
      <Card className="bg-gradient-to-r from-primary/10 to-secondary/10 border-2">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2 text-2xl">
            <Trophy className="h-6 w-6 text-yellow-500" />
            Family Office Badge System
          </CardTitle>
          <CardDescription>
            Track your progress and earn badges through course completion and call participation
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Badge Progress Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-2 border-green-200 dark:border-green-800">
          <CardHeader className="text-center pb-2">
            <BookOpen className="h-8 w-8 mx-auto text-green-600" />
            <CardTitle className="text-lg">Course Progress</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <div className="text-3xl font-bold text-green-600">
              {members.length > 0 ? Math.round(members.reduce((sum, m) => sum + m.course_progress, 0) / members.length) : 0}%
            </div>
            <p className="text-sm text-muted-foreground">Average Completion</p>
          </CardContent>
        </Card>

        <Card className="border-2 border-purple-200 dark:border-purple-800">
          <CardHeader className="text-center pb-2">
            <Users className="h-8 w-8 mx-auto text-purple-600" />
            <CardTitle className="text-lg">Group Sessions</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <div className="text-3xl font-bold text-purple-600">
              {members.length > 0 ? Math.round(members.reduce((sum, m) => sum + m.group_calls_attended, 0) / members.length) : 0}
            </div>
            <p className="text-sm text-muted-foreground">Average Attended</p>
          </CardContent>
        </Card>

        <Card className="border-2 border-red-200 dark:border-red-800">
          <CardHeader className="text-center pb-2">
            <Video className="h-8 w-8 mx-auto text-red-600" />
            <CardTitle className="text-lg">1-on-1 Sessions</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <div className="text-3xl font-bold text-red-600">
              {members.length > 0 ? Math.round(members.reduce((sum, m) => sum + m.individual_calls_attended, 0) / members.length) : 0}
            </div>
            <p className="text-sm text-muted-foreground">Average Attended</p>
          </CardContent>
        </Card>
      </div>

      {/* Member Cards with Badge Focus */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {members.map((member, index) => (
          <Card key={member.id} className={`relative ${index < 3 ? 'ring-2 ring-primary/30' : ''} hover:shadow-lg transition-all duration-300`}>
            <CardContent className="p-6">
              {/* Rank Badge */}
              {index < 3 && (
                <div className="absolute -top-2 -right-2 bg-gradient-to-r from-yellow-400 to-yellow-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">
                  #{index + 1}
                </div>
              )}
              
              {/* Member Info */}
              <div className="text-center mb-4">
                <Avatar className="h-16 w-16 mx-auto mb-3 ring-2 ring-primary/20">
                  <AvatarImage src={member.avatar_url || ''} />
                  <AvatarFallback className="text-lg">{getInitials(member)}</AvatarFallback>
                </Avatar>
                <h3 className="font-semibold text-lg">{getDisplayName(member)}</h3>
                <div className="text-sm text-muted-foreground">Rank #{index + 1}</div>
              </div>

              {/* Progress Indicators */}
              <div className="space-y-3 mb-4">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium flex items-center gap-1">
                      <BookOpen className="h-3 w-3" />
                      Courses
                    </span>
                    <span className="text-sm text-green-600 font-semibold">{member.course_progress}%</span>
                  </div>
                  <Progress value={member.course_progress} className="h-2" />
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-center">
                  <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-2">
                    <div className="text-lg font-bold text-purple-600">{member.group_calls_attended}</div>
                    <div className="text-xs text-muted-foreground">Group Calls</div>
                  </div>
                  <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-2">
                    <div className="text-lg font-bold text-red-600">{member.individual_calls_attended}</div>
                    <div className="text-xs text-muted-foreground">1-on-1 Calls</div>
                  </div>
                </div>
              </div>

              {/* Badges Display */}
              <div className="mb-4">
                <div className="text-sm font-medium mb-2 flex items-center gap-1">
                  <Award className="h-3 w-3" />
                  Badges Earned ({member.badges.length})
                </div>
                <div className="flex flex-wrap gap-1">
                  {member.badges.map((badge, badgeIndex) => (
                    <Badge 
                      key={badgeIndex}
                      variant="outline"
                      className={`text-xs px-2 py-1 ${getBadgeColor(badge)} text-white border-none`}
                      title={badge}
                    >
                      <CheckCircle className="h-3 w-3 mr-1" />
                      {badge.replace(' ', '')}
                    </Badge>
                  ))}
                  {member.badges.length === 0 && (
                    <span className="text-xs text-muted-foreground italic">No badges yet</span>
                  )}
                </div>
              </div>

              {/* Total Score */}
              <div className="text-center pt-3 border-t">
                <div className="text-2xl font-bold" style={{ color: '#ffb500' }}>
                  {member.total_score}
                </div>
                <div className="text-sm text-muted-foreground">Total Points</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Badge Achievement System */}
      <Card className="border-2 border-primary/20">
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <Award className="h-5 w-5" />
            Badge Achievement System
          </CardTitle>
          <CardDescription>
            Complete these activities to earn badges and climb the leaderboard
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="font-semibold text-green-600 flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                Course Badges
              </h4>
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="w-4 h-4 rounded-full bg-blue-500"></div>
                  <div>
                    <div className="font-medium">Halfway There</div>
                    <div className="text-sm text-muted-foreground">Complete 50% of available courses</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <div className="w-4 h-4 rounded-full bg-green-500"></div>
                  <div>
                    <div className="font-medium">Course Master</div>
                    <div className="text-sm text-muted-foreground">Complete 100% of available courses</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-semibold text-purple-600 flex items-center gap-2">
                <Users className="h-4 w-4" />
                Participation Badges
              </h4>
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <div className="w-4 h-4 rounded-full bg-purple-500"></div>
                  <div>
                    <div className="font-medium">Group Participant</div>
                    <div className="text-sm text-muted-foreground">Attend 10+ group coaching calls</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <div className="w-4 h-4 rounded-full bg-red-500"></div>
                  <div>
                    <div className="font-medium">1-on-1 Champion</div>
                    <div className="text-sm text-muted-foreground">Attend 5+ individual coaching sessions</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                  <div className="w-4 h-4 rounded-full bg-yellow-500"></div>
                  <div>
                    <div className="font-medium">Engaged Learner</div>
                    <div className="text-sm text-muted-foreground">75% course completion + 5+ group calls</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}