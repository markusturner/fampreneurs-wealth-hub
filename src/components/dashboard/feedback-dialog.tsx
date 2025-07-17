import { useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { MessageSquare, Star, Loader2 } from 'lucide-react'

interface FeedbackDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface RatingQuestion {
  key: string
  label: string
  description: string
}

const ratingQuestions: RatingQuestion[] = [
  {
    key: 'overall_satisfaction',
    label: 'Overall Satisfaction',
    description: 'How satisfied are you with the program overall?'
  },
  {
    key: 'program_effectiveness',
    label: 'Program Effectiveness',
    description: 'How effective is the program in helping you achieve your goals?'
  },
  {
    key: 'ease_of_use',
    label: 'Ease of Use',
    description: 'How easy is it to navigate and use the platform?'
  },
  {
    key: 'community_support',
    label: 'Community Support',
    description: 'How would you rate the support from the family community?'
  },
  {
    key: 'feature_usefulness',
    label: 'Feature Usefulness',
    description: 'How useful are the current features and tools?'
  }
]

export function FeedbackDialog({ open, onOpenChange }: FeedbackDialogProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [ratings, setRatings] = useState<Record<string, number>>({})
  const [improvementSuggestions, setImprovementSuggestions] = useState('')
  const [additionalFeedback, setAdditionalFeedback] = useState('')

  const handleRatingChange = (questionKey: string, rating: number) => {
    setRatings(prev => ({
      ...prev,
      [questionKey]: rating
    }))
  }

  const handleSubmit = async () => {
    if (!user?.id) return

    // Validate that all ratings are provided
    const missingRatings = ratingQuestions.filter(q => !ratings[q.key])
    if (missingRatings.length > 0) {
      toast({
        title: "Please complete all ratings",
        description: "All rating questions are required.",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      // Submit feedback response
      const { error: responseError } = await supabase
        .from('feedback_responses')
        .insert({
          user_id: user.id,
          overall_satisfaction: ratings.overall_satisfaction,
          program_effectiveness: ratings.program_effectiveness,
          ease_of_use: ratings.ease_of_use,
          community_support: ratings.community_support,
          feature_usefulness: ratings.feature_usefulness,
          improvement_suggestions: improvementSuggestions.trim() || null,
          additional_feedback: additionalFeedback.trim() || null,
        })

      if (responseError) throw responseError

      // Update notification tracking
      const { error: notificationError } = await supabase
        .from('feedback_notifications')
        .upsert({
          user_id: user.id,
          last_notification_sent: new Date().toISOString(),
          notification_count: 1
        }, {
          onConflict: 'user_id',
          ignoreDuplicates: false
        })

      if (notificationError) throw notificationError

      toast({
        title: "Feedback submitted",
        description: "Thank you for your valuable feedback!",
      })

      // Reset form
      setRatings({})
      setImprovementSuggestions('')
      setAdditionalFeedback('')
      onOpenChange(false)
    } catch (error) {
      console.error('Error submitting feedback:', error)
      toast({
        title: "Error",
        description: "Failed to submit feedback. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const RatingScale = ({ questionKey, label, description }: { questionKey: string; label: string; description: string }) => (
    <Card className="p-4">
      <div className="space-y-3">
        <div>
          <Label className="text-sm font-medium">{label}</Label>
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-xs text-muted-foreground">Poor</span>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((rating) => (
              <button
                key={rating}
                onClick={() => handleRatingChange(questionKey, rating)}
                className={`w-8 h-8 rounded-full border-2 text-xs font-medium transition-colors ${
                  ratings[questionKey] === rating
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'border-muted-foreground/30 hover:border-primary/50'
                }`}
              >
                {rating}
              </button>
            ))}
          </div>
          <span className="text-xs text-muted-foreground">Excellent</span>
        </div>
      </div>
    </Card>
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Program Feedback
          </DialogTitle>
          <DialogDescription>
            Help us improve by sharing your experience with the program. Your feedback is valuable to us!
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Rating Questions */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Rate Your Experience</h3>
            {ratingQuestions.map((question) => (
              <RatingScale key={question.key} questionKey={question.key} label={question.label} description={question.description} />
            ))}
          </div>

          {/* Text Feedback */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="improvements">What improvements would you like to see?</Label>
              <Textarea
                id="improvements"
                placeholder="Share your suggestions for improving the program..."
                value={improvementSuggestions}
                onChange={(e) => setImprovementSuggestions(e.target.value)}
                className="mt-2"
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="additional">Additional Comments</Label>
              <Textarea
                id="additional"
                placeholder="Any other feedback you'd like to share..."
                value={additionalFeedback}
                onChange={(e) => setAdditionalFeedback(e.target.value)}
                className="mt-2"
                rows={3}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Skip for Now
            </Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Submit Feedback
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}