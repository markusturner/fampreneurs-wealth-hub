import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { FeedbackDialog } from '@/components/dashboard/feedback-dialog'
import { useToast } from '@/hooks/use-toast'
import { MessageSquare, TrendingUp, Users, Star, Calendar } from 'lucide-react'

interface FeedbackResponse {
  id: string
  user_id: string
  overall_satisfaction: number
  program_effectiveness: number
  ease_of_use: number
  community_support: number
  feature_usefulness: number
  improvement_suggestions: string | null
  additional_feedback: string | null
  created_at: string
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
    return `User ${response.user_id.slice(0, 8)}`
  }

  const calculateAverageRating = (responses: FeedbackResponse[], field: keyof Pick<FeedbackResponse, 'overall_satisfaction' | 'program_effectiveness' | 'ease_of_use' | 'community_support' | 'feature_usefulness'>) => {
    if (responses.length === 0) return 0
    const sum = responses.reduce((acc, response) => acc + (response[field] || 0), 0)
    return (sum / responses.length).toFixed(1)
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
          <h2 className="text-2xl font-bold">Feedback Management</h2>
          <p className="text-muted-foreground">
            Monitor program feedback and user satisfaction
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
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
            <CardTitle className="text-sm font-medium">Overall Satisfaction</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-1">
              {calculateAverageRating(feedbackResponses, 'overall_satisfaction')}
              <Star className="h-4 w-4 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Program Effectiveness</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-1">
              {calculateAverageRating(feedbackResponses, 'program_effectiveness')}
              <TrendingUp className="h-4 w-4 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Ease of Use</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-1">
              {calculateAverageRating(feedbackResponses, 'ease_of_use')}
              <Users className="h-4 w-4 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Community Support</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-1">
              {calculateAverageRating(feedbackResponses, 'community_support')}
              <MessageSquare className="h-4 w-4 text-purple-500" />
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
                    </div>
                    <Badge variant="outline">
                      {response.overall_satisfaction}/10 Overall
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-3">
                    <div className="text-center">
                      <div className="text-sm font-medium">{response.overall_satisfaction}</div>
                      <div className="text-xs text-muted-foreground">Overall</div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm font-medium">{response.program_effectiveness}</div>
                      <div className="text-xs text-muted-foreground">Effectiveness</div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm font-medium">{response.ease_of_use}</div>
                      <div className="text-xs text-muted-foreground">Ease of Use</div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm font-medium">{response.community_support}</div>
                      <div className="text-xs text-muted-foreground">Community</div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm font-medium">{response.feature_usefulness}</div>
                      <div className="text-xs text-muted-foreground">Features</div>
                    </div>
                  </div>

                  {(response.improvement_suggestions || response.additional_feedback) && (
                    <div className="space-y-2">
                      {response.improvement_suggestions && (
                        <div>
                          <h5 className="text-sm font-medium mb-1">Improvement Suggestions:</h5>
                          <p className="text-sm text-muted-foreground">{response.improvement_suggestions}</p>
                        </div>
                      )}
                      {response.additional_feedback && (
                        <div>
                          <h5 className="text-sm font-medium mb-1">Additional Comments:</h5>
                          <p className="text-sm text-muted-foreground">{response.additional_feedback}</p>
                        </div>
                      )}
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