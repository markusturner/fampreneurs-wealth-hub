import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/integrations/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { CalendarCheck, TrendingUp, Star, Users, BarChart3 } from 'lucide-react'
import { WeeklyCheckinDialog } from './weekly-checkin-dialog'

interface WeeklyCheckinResponse {
  id: string
  user_id: string
  full_name: string
  week_ending: string
  grateful_for: string | null
  training_rating: number
  energy_level: number
  setbacks_rating: number
  completed_sessions: boolean
  session_completion_notes: string | null
  weekly_goals: string | null
  potential_obstacles: string | null
  completed_main_action: boolean
  roadblocks_faced: string | null
  created_at: string
  updated_at: string
  profiles?: {
    display_name: string | null
    first_name: string | null
    last_name: string | null
  } | null
}

export function WeeklyCheckinManagement() {
  const { user, profile } = useAuth()
  const { toast } = useToast()
  const [responses, setResponses] = useState<WeeklyCheckinResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)

  useEffect(() => {
    fetchResponses()
  }, [])

  const fetchResponses = async () => {
    try {
      let query = supabase
        .from('weekly_checkin_responses')
        .select(`
          *,
          profiles:user_id (
            display_name,
            first_name,
            last_name
          )
        `)
        .order('created_at', { ascending: false })

      // If not admin, only show current user's responses
      if (!profile?.is_admin) {
        query = query.eq('user_id', user?.id)
      }

      const { data, error } = await query.limit(50)

      if (error) throw error
      setResponses((data as any) || [])
    } catch (error) {
      console.error('Error fetching weekly check-in responses:', error)
      toast({
        title: "Error",
        description: "Failed to load weekly check-in responses",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getDisplayName = (response: WeeklyCheckinResponse) => {
    if (response.profiles?.display_name) return response.profiles.display_name
    if (response.profiles?.first_name && response.profiles?.last_name) {
      return `${response.profiles.first_name} ${response.profiles.last_name}`
    }
    return 'Unknown User'
  }

  const getRatingColor = (rating: number) => {
    if (rating >= 8) return 'text-green-600'
    if (rating >= 6) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getAverageRating = (response: WeeklyCheckinResponse) => {
    const ratings = [
      response.training_rating,
      response.energy_level,
      response.setbacks_rating
    ]
    return (ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length).toFixed(1)
  }

  const getOverallStats = () => {
    if (responses.length === 0) return { avgRating: 0, totalResponses: 0, uniqueUsers: 0 }
    
    const totalRatings = responses.reduce((sum, response) => {
      return sum + parseFloat(getAverageRating(response))
    }, 0)
    
    const uniqueUsers = new Set(responses.map(r => r.user_id)).size
    
    return {
      avgRating: (totalRatings / responses.length).toFixed(1),
      totalResponses: responses.length,
      uniqueUsers
    }
  }

  const stats = getOverallStats()

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">Loading weekly check-ins...</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <div className="space-y-6">
        {/* Header with Stats */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <CalendarCheck className="h-6 w-6" />
              Weekly Check-ins
            </h2>
            <p className="text-muted-foreground">
              {profile?.is_admin ? 'Monitor team progress and well-being' : 'Track your weekly progress and reflections'}
            </p>
          </div>
          
          <Button onClick={() => setDialogOpen(true)} className="gap-2">
            <CalendarCheck className="h-4 w-4" />
            New Check-in
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Star className="h-4 w-4" />
                Average Rating
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.avgRating}/10</div>
              <p className="text-xs text-muted-foreground">Overall satisfaction</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Total Responses
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalResponses}</div>
              <p className="text-xs text-muted-foreground">Check-ins completed</p>
            </CardContent>
          </Card>

          {profile?.is_admin && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Active Users
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.uniqueUsers}</div>
                <p className="text-xs text-muted-foreground">Team members participating</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Responses List */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Check-ins</CardTitle>
            <CardDescription>
              Weekly reflections and progress tracking
            </CardDescription>
          </CardHeader>
          <CardContent>
            {responses.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CalendarCheck className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No weekly check-ins found</p>
                <p className="text-sm">Complete your first check-in to get started</p>
              </div>
            ) : (
              <div className="space-y-4">
                {responses.map((response) => (
                  <div key={response.id} className="border rounded-lg p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          {profile?.is_admin && (
                            <span className="font-medium">{getDisplayName(response)}</span>
                          )}
                          <Badge variant="secondary">
                            Week ending {formatDate(response.week_ending)}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Submitted {formatDate(response.created_at)}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <div className={`text-lg font-bold ${getRatingColor(parseInt(getAverageRating(response)))}`}>
                            {getAverageRating(response)}/10
                          </div>
                          <div className="text-xs text-muted-foreground">Avg Rating</div>
                        </div>
                      </div>
                    </div>

                    {/* Rating Breakdown */}
                    <div className="grid grid-cols-3 gap-2 mb-4">
                      <div className="text-center p-2 bg-muted/30 rounded">
                        <div className={`font-bold ${getRatingColor(response.training_rating)}`}>
                          {response.training_rating}
                        </div>
                        <div className="text-xs text-muted-foreground">Training</div>
                      </div>
                      <div className="text-center p-2 bg-muted/30 rounded">
                        <div className={`font-bold ${getRatingColor(response.energy_level)}`}>
                          {response.energy_level}
                        </div>
                        <div className="text-xs text-muted-foreground">Energy</div>
                      </div>
                      <div className="text-center p-2 bg-muted/30 rounded">
                        <div className={`font-bold ${getRatingColor(response.setbacks_rating)}`}>
                          {response.setbacks_rating}
                        </div>
                        <div className="text-xs text-muted-foreground">Setbacks</div>
                      </div>
                    </div>

                    {/* Progress Indicators */}
                    <div className="grid grid-cols-2 gap-2 mb-4">
                      <div className={`text-center p-2 rounded ${response.completed_sessions ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        <div className="text-xs font-medium">
                          {response.completed_sessions ? '✓ Sessions Done' : '✗ Sessions Missed'}
                        </div>
                      </div>
                      <div className={`text-center p-2 rounded ${response.completed_main_action ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        <div className="text-xs font-medium">
                          {response.completed_main_action ? '✓ Action Complete' : '✗ Action Pending'}
                        </div>
                      </div>
                    </div>

                    {/* Text Responses */}
                    <div className="space-y-2 text-sm">
                      {response.grateful_for && (
                        <div>
                          <span className="font-medium">Grateful For: </span>
                          <span className="text-muted-foreground">{response.grateful_for}</span>
                        </div>
                      )}
                      {response.weekly_goals && (
                        <div>
                          <span className="font-medium">Weekly Goals: </span>
                          <span className="text-muted-foreground">{response.weekly_goals}</span>
                        </div>
                      )}
                      {response.potential_obstacles && (
                        <div>
                          <span className="font-medium">Potential Obstacles: </span>
                          <span className="text-muted-foreground">{response.potential_obstacles}</span>
                        </div>
                      )}
                      {response.roadblocks_faced && (
                        <div>
                          <span className="font-medium">Roadblocks Faced: </span>
                          <span className="text-muted-foreground">{response.roadblocks_faced}</span>
                        </div>
                      )}
                      {response.session_completion_notes && (
                        <div>
                          <span className="font-medium">Session Notes: </span>
                          <span className="text-muted-foreground">{response.session_completion_notes}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <WeeklyCheckinDialog 
        open={dialogOpen} 
        onOpenChange={(open) => {
          setDialogOpen(open)
          if (!open) {
            fetchResponses() // Refresh the list when dialog closes
          }
        }}
      />
    </>
  )
}