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
      <Card className="bg-gradient-to-r from-primary/10 to-secondary/10">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2 text-2xl">
            <Trophy className="h-6 w-6 text-yellow-500" />
            Family Office Scoreboard
          </CardTitle>
          <CardDescription>
            Earn badges and points by completing courses and attending calls
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Top 3 Leaderboard */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {members.slice(0, 3).map((member, index) => (
          <Card key={member.id} className={`relative ${index === 0 ? 'ring-2 ring-yellow-500' : ''}`}>
            <CardContent className="p-6 text-center">
              <div className="flex justify-center mb-3">
                {getRankIcon(index)}
              </div>
              <Avatar className="h-16 w-16 mx-auto mb-3">
                <AvatarImage src={member.avatar_url || ''} />
                <AvatarFallback className="text-lg">{getInitials(member)}</AvatarFallback>
              </Avatar>
              <h3 className="font-semibold mb-1">{getDisplayName(member)}</h3>
              <div className="text-2xl font-bold text-primary mb-2">{member.total_score} pts</div>
              <div className="flex justify-center gap-1">
                {member.badges.slice(0, 2).map((badge, badgeIndex) => (
                  <div key={badgeIndex} className={`w-3 h-3 rounded-full ${getBadgeColor(badge)}`} />
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Full Leaderboard */}
      <Card>
        <CardHeader>
          <CardTitle>Complete Rankings</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {members.map((member, index) => (
            <div key={member.id} className="flex items-center justify-between p-4 border-b last:border-b-0 hover:bg-muted/30 transition-colors">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 w-8">
                  <span className="text-lg font-bold text-muted-foreground">#{index + 1}</span>
                </div>
                <Avatar className="h-10 w-10">
                  <AvatarImage src={member.avatar_url || ''} />
                  <AvatarFallback>{getInitials(member)}</AvatarFallback>
                </Avatar>
                <div>
                  <h4 className="font-medium">{getDisplayName(member)}</h4>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <BookOpen className="h-3 w-3" />
                    <span>{member.course_progress}% courses</span>
                    <Users className="h-3 w-3 ml-2" />
                    <span>{member.group_calls_attended} group calls</span>
                    <Video className="h-3 w-3 ml-2" />
                    <span>{member.individual_calls_attended} 1-on-1s</span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="flex gap-1">
                  {member.badges.map((badge, badgeIndex) => (
                    <div 
                      key={badgeIndex}
                      className={`w-2 h-2 rounded-full ${getBadgeColor(badge)}`}
                      title={badge}
                    />
                  ))}
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold" style={{ color: '#ffb500' }}>
                    {member.total_score}
                  </div>
                  <div className="text-xs text-muted-foreground">points</div>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Badge Legend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Badge System</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 rounded-full bg-green-500"></div>
              <div>
                <div className="font-medium">Course Completed</div>
                <div className="text-sm text-muted-foreground">Complete 100% of courses</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 rounded-full bg-blue-500"></div>
              <div>
                <div className="font-medium">Halfway There</div>
                <div className="text-sm text-muted-foreground">Complete 50% of courses</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 rounded-full bg-purple-500"></div>
              <div>
                <div className="font-medium">Group Participant</div>
                <div className="text-sm text-muted-foreground">Attend 10+ group calls</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 rounded-full bg-red-500"></div>
              <div>
                <div className="font-medium">1-on-1 Champion</div>
                <div className="text-sm text-muted-foreground">Attend 5+ individual calls</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 rounded-full bg-yellow-500"></div>
              <div>
                <div className="font-medium">Engaged Learner</div>
                <div className="text-sm text-muted-foreground">75% courses + 5+ group calls</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}