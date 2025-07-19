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
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { MessageSquare, Loader2 } from 'lucide-react'

interface FeedbackDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const moduleOptions = [
  'Module 1: Foundation & Assessment',
  'Module 2: Business Structure & Legal',
  'Module 3: Financial Planning',
  'Module 4: Investment Strategies',
  'Module 5: Family Governance',
  'Module 6: Next Generation Preparation',
  'Module 7: Exit Planning',
  'Module 8: Legacy & Wealth Transfer'
]

const retreatOptions = [
  'Yes, definitely interested!',
  'Maybe, tell me more',
  'No, not interested',
  'I need to check my schedule'
]

export function FeedbackDialog({ open, onOpenChange }: FeedbackDialogProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [fullName, setFullName] = useState('')
  const [currentModule, setCurrentModule] = useState('')
  const [overallExperienceRating, setOverallExperienceRating] = useState<number | null>(null)
  const [experienceExplanation, setExperienceExplanation] = useState('')
  const [coachResponseRating, setCoachResponseRating] = useState<number | null>(null)
  const [improvementSuggestions, setImprovementSuggestions] = useState('')
  const [retreatInterest, setRetreatInterest] = useState('')
  const [additionalComments, setAdditionalComments] = useState('')

  const handleSubmit = async () => {
    if (!user?.id) return

    // Validate required fields
    if (!fullName.trim()) {
      toast({
        title: "Full Name Required",
        description: "Please enter your full name.",
        variant: "destructive",
      })
      return
    }

    if (!currentModule) {
      toast({
        title: "Current Module Required", 
        description: "Please select your current module.",
        variant: "destructive",
      })
      return
    }

    if (overallExperienceRating === null) {
      toast({
        title: "Experience Rating Required",
        description: "Please rate your overall experience.",
        variant: "destructive",
      })
      return
    }

    if (coachResponseRating === null) {
      toast({
        title: "Coach Response Rating Required",
        description: "Please rate your coaches' response rate.",
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
          full_name: fullName.trim(),
          current_module: currentModule,
          overall_experience_rating: overallExperienceRating,
          experience_explanation: experienceExplanation.trim() || null,
          coach_response_rating: coachResponseRating,
          improvement_suggestions: improvementSuggestions.trim() || null,
          retreat_interest: retreatInterest || null,
          additional_comments: additionalComments.trim() || null,
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
      setFullName('')
      setCurrentModule('')
      setOverallExperienceRating(null)
      setExperienceExplanation('')
      setCoachResponseRating(null)
      setImprovementSuggestions('')
      setRetreatInterest('')
      setAdditionalComments('')
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

  const RatingScale = ({ 
    value, 
    onChange, 
    label, 
    description 
  }: { 
    value: number | null; 
    onChange: (rating: number) => void; 
    label: string; 
    description: string 
  }) => (
    <Card className="p-4">
      <div className="space-y-3">
        <div>
          <Label className="text-sm font-medium">{label}</Label>
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-xs text-muted-foreground">Needs work</span>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((rating) => (
              <button
                key={rating}
                onClick={() => onChange(rating)}
                className={`w-8 h-8 rounded-full border-2 text-xs font-medium transition-colors ${
                  value === rating
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'border-muted-foreground/30 hover:border-primary/50'
                }`}
              >
                {rating}
              </button>
            ))}
          </div>
          <span className="text-xs text-muted-foreground">Excellent!</span>
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
            Complete this survey to support us in improving our coaching, curriculum, calls, and processes.
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Full Name */}
          <div>
            <Label htmlFor="fullName" className="text-sm font-medium">
              Full Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Enter your full name"
              className="mt-2"
            />
          </div>

          {/* Current Module */}
          <div>
            <Label className="text-sm font-medium">
              What module in the curriculum are you currently working on? <span className="text-destructive">*</span>
            </Label>
            <Select value={currentModule} onValueChange={setCurrentModule}>
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Select current module" />
              </SelectTrigger>
              <SelectContent>
                {moduleOptions.map((module) => (
                  <SelectItem key={module} value={module}>
                    {module}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Overall Experience Rating */}
          <RatingScale
            value={overallExperienceRating}
            onChange={setOverallExperienceRating}
            label="How would you rate your overall experience in The Family Business Accelerator? *"
            description="10 being 'Excellent! I would recommend to others' and 1 being 'Needs work. I would not recommend.'"
          />

          {/* Experience Explanation */}
          <div>
            <Label htmlFor="explanation" className="text-sm font-medium">
              Why did you answer the way you did? <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="explanation"
              value={experienceExplanation}
              onChange={(e) => setExperienceExplanation(e.target.value)}
              placeholder="Please explain your rating..."
              className="mt-2"
              rows={3}
            />
          </div>

          {/* Coach Response Rating */}
          <RatingScale
            value={coachResponseRating}
            onChange={setCoachResponseRating}
            label="How would you rate your coaches response rate to your community posts & messages? *"
            description="10 being 'Excellent! I would recommend to others' and 1 being 'Needs work. I would not recommend.'"
          />

          {/* Improvement Suggestions */}
          <div>
            <Label htmlFor="improvements" className="text-sm font-medium">
              How else can we improve? <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="improvements"
              value={improvementSuggestions}
              onChange={(e) => setImprovementSuggestions(e.target.value)}
              placeholder="Curriculum, calls, masterclasses, general coaching, etc."
              className="mt-2"
              rows={3}
            />
          </div>

          {/* Retreat Interest */}
          <div>
            <Label className="text-sm font-medium">
              Interested in joining us for a retreat in 2026? <span className="text-destructive">*</span>
            </Label>
            <p className="text-xs text-muted-foreground mt-1">
              We know the location but want to confirm you're a HECK YES before we start ordering barbecue, booking guest speakers & filling up the cold plunges.
            </p>
            <Select value={retreatInterest} onValueChange={setRetreatInterest}>
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Select your interest level" />
              </SelectTrigger>
              <SelectContent>
                {retreatOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Additional Comments */}
          <div>
            <Label htmlFor="additional" className="text-sm font-medium">
              Anything else you'd like us to know? <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="additional"
              value={additionalComments}
              onChange={(e) => setAdditionalComments(e.target.value)}
              placeholder="Share any additional thoughts or feedback..."
              className="mt-2"
              rows={3}
            />
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