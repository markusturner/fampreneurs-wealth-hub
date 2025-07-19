import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { FeedbackDialog } from '@/components/dashboard/feedback-dialog'
import { useToast } from '@/hooks/use-toast'
import { MessageSquare, TrendingUp, Users, Star, Calendar } from 'lucide-react'

interface FeedbackResponse {
  id: string
  user_id: string
  full_name: string | null
  current_module: string | null
  overall_experience_rating: number | null
  experience_explanation: string | null
  coach_response_rating: number | null
  improvement_suggestions: string | null
  retreat_interest: string | null
  additional_comments: string | null
  created_at: string
  updated_at: string
}

export function FeedbackManagement() {
  const { user, profile } = useAuth()
  const { toast } = useToast()
  const [feedbackResponses, setFeedbackResponses] = useState<FeedbackResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [feedbackDialogOpen, setFeedbackDialogOpen] = useState(false)

  const fetchFeedbackResponses = async () => {
    if (!profile?.is_admin) return

    try {
      const { data, error } = await supabase
        .from('feedback_responses')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      setFeedbackResponses(data || [])
    } catch (error) {
      console.error('Error fetching feedback responses:', error)
      toast({
        title: "Error",
        description: "Failed to load feedback responses.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleTriggerFeedbackForAll = async () => {
    try {
      // Call the edge function to trigger feedback notifications
      const { error } = await supabase.functions.invoke('feedback-notifications')
      
      if (error) throw error

      toast({
        title: "Feedback notifications sent",
        description: "All eligible users have been notified to provide feedback.",
      })
    } catch (error) {
      console.error('Error triggering feedback notifications:', error)
      toast({
        title: "Error",
        description: "Failed to send feedback notifications.",
        variant: "destructive",
      })
    }
  }

  useEffect(() => {
    if (profile?.is_admin) {
      fetchFeedbackResponses()
    } else {
      setLoading(false)
    }
  }, [profile?.is_admin])

  const getDisplayName = (response: FeedbackResponse) => {
    return response.full_name || `User ${response.user_id.slice(0, 8)}`
  }

  const calculateAverageRating = (responses: FeedbackResponse[], field: 'overall_experience_rating' | 'coach_response_rating') => {
    const validResponses = responses.filter(r => r[field] !== null)
    if (validResponses.length === 0) return "0.0"
    const sum = validResponses.reduce((acc, response) => acc + (response[field] || 0), 0)
    return (sum / validResponses.length).toFixed(1)
  }

  const getSatisfactionScore = () => {
    if (feedbackResponses.length === 0) return 0
    const avgExperience = parseFloat(calculateAverageRating(feedbackResponses, 'overall_experience_rating'))
    const avgCoach = parseFloat(calculateAverageRating(feedbackResponses, 'coach_response_rating'))
    return Math.round((avgExperience + avgCoach) / 2 * 10) // Convert to percentage
  }

  if (!profile?.is_admin) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Program Feedback
            </CardTitle>
            <CardDescription>
              Share your thoughts about the program and help us improve your experience.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setFeedbackDialogOpen(true)}>
              <MessageSquare className="h-4 w-4 mr-2" />
              Provide Feedback
            </Button>
          </CardContent>
        </Card>

        <FeedbackDialog 
          open={feedbackDialogOpen} 
          onOpenChange={setFeedbackDialogOpen}
        />
      </div>
    )
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-muted rounded animate-pulse"></div>
        <div className="h-64 bg-muted rounded animate-pulse"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Satisfaction Survey</h2>
          <p className="text-muted-foreground">
            Monitor user satisfaction and gather feedback through 6-week surveys
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setFeedbackDialogOpen(true)}>
            <MessageSquare className="h-4 w-4 mr-2" />
            Test Feedback Form
          </Button>
          <Button onClick={handleTriggerFeedbackForAll}>
            <Calendar className="h-4 w-4 mr-2" />
            Send Feedback Requests
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Responses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{feedbackResponses.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Overall Experience</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-1">
              {calculateAverageRating(feedbackResponses, 'overall_experience_rating')}
              <Star className="h-4 w-4 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Coach Response</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-1">
              {calculateAverageRating(feedbackResponses, 'coach_response_rating')}
              <TrendingUp className="h-4 w-4 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Satisfaction Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-1">
              {getSatisfactionScore()}%
              <Users className="h-4 w-4 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Feedback Responses */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Feedback</CardTitle>
          <CardDescription>
            Latest feedback responses from users
          </CardDescription>
        </CardHeader>
        <CardContent>
          {feedbackResponses.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No feedback responses yet</p>
              <p className="text-sm">Encourage users to share their thoughts about the program</p>
            </div>
          ) : (
            <div className="space-y-4">
              {feedbackResponses.map((response) => (
                <Card key={response.id} className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-medium">{getDisplayName(response)}</h4>
                      <p className="text-sm text-muted-foreground">
                        {new Date(response.created_at).toLocaleDateString()}
                      </p>
                      {response.current_module && (
                        <Badge variant="secondary" className="mt-1">
                          {response.current_module}
                        </Badge>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {response.overall_experience_rating && (
                        <Badge variant="outline">
                          Experience: {response.overall_experience_rating}/10
                        </Badge>
                      )}
                      {response.coach_response_rating && (
                        <Badge variant="outline">
                          Coach: {response.coach_response_rating}/10
                        </Badge>
                      )}
                    </div>
                  </div>

                  {response.experience_explanation && (
                    <div className="mb-3">
                      <h5 className="text-sm font-medium mb-1">Experience Explanation:</h5>
                      <p className="text-sm text-muted-foreground">{response.experience_explanation}</p>
                    </div>
                  )}

                  {response.improvement_suggestions && (
                    <div className="mb-3">
                      <h5 className="text-sm font-medium mb-1">Improvement Suggestions:</h5>
                      <p className="text-sm text-muted-foreground">{response.improvement_suggestions}</p>
                    </div>
                  )}

                  {response.retreat_interest && (
                    <div className="mb-3">
                      <h5 className="text-sm font-medium mb-1">Retreat Interest:</h5>
                      <p className="text-sm text-muted-foreground">{response.retreat_interest}</p>
                    </div>
                  )}

                  {response.additional_comments && (
                    <div>
                      <h5 className="text-sm font-medium mb-1">Additional Comments:</h5>
                      <p className="text-sm text-muted-foreground">{response.additional_comments}</p>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <FeedbackDialog 
        open={feedbackDialogOpen} 
        onOpenChange={setFeedbackDialogOpen}
      />
    </div>
  )
}