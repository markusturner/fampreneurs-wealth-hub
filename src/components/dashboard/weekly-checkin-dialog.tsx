import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Slider } from '@/components/ui/slider'
import { useToast } from '@/hooks/use-toast'
import { CalendarCheck, Star } from 'lucide-react'

interface WeeklyCheckinDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function WeeklyCheckinDialog({ open, onOpenChange }: WeeklyCheckinDialogProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [submitting, setSubmitting] = useState(false)

  const [formData, setFormData] = useState({
    fullName: '',
    gratefulFor: '',
    trainingRating: [7],
    energyLevel: [7],
    setbacksRating: [7],
    completedSessions: false,
    sessionCompletionNotes: '',
    weeklyGoals: '',
    potentialObstacles: '',
    completedMainAction: false,
    roadblocksFaced: ''
  })

  const resetForm = () => {
    setFormData({
      fullName: '',
      gratefulFor: '',
      trainingRating: [7],
      energyLevel: [7],
      setbacksRating: [7],
      completedSessions: false,
      sessionCompletionNotes: '',
      weeklyGoals: '',
      potentialObstacles: '',
      completedMainAction: false,
      roadblocksFaced: ''
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to submit a weekly check-in.",
        variant: "destructive"
      })
      return
    }

    setSubmitting(true)
    try {
      const endOfWeek = new Date()
      const dayOfWeek = endOfWeek.getDay()
      const daysUntilFriday = (5 - dayOfWeek + 7) % 7
      if (daysUntilFriday > 0) {
        endOfWeek.setDate(endOfWeek.getDate() + daysUntilFriday)
      }

      const { error } = await supabase
        .from('weekly_checkin_responses')
        .insert({
          user_id: user.id,
          full_name: formData.fullName.trim(),
          week_ending: endOfWeek.toISOString().split('T')[0],
          grateful_for: formData.gratefulFor.trim() || null,
          training_rating: formData.trainingRating[0],
          energy_level: formData.energyLevel[0],
          setbacks_rating: formData.setbacksRating[0],
          completed_sessions: formData.completedSessions,
          session_completion_notes: formData.sessionCompletionNotes.trim() || null,
          weekly_goals: formData.weeklyGoals.trim() || null,
          potential_obstacles: formData.potentialObstacles.trim() || null,
          completed_main_action: formData.completedMainAction,
          roadblocks_faced: formData.roadblocksFaced.trim() || null
        })

      if (error) throw error

      toast({
        title: "Weekly Check-in Submitted",
        description: "Thank you for completing your weekly reflection!"
      })

      resetForm()
      onOpenChange(false)
    } catch (error) {
      console.error('Error submitting weekly check-in:', error)
      toast({
        title: "Error",
        description: "Failed to submit weekly check-in. Please try again.",
        variant: "destructive"
      })
    } finally {
      setSubmitting(false)
    }
  }

  const RatingSlider = ({ 
    label, 
    value, 
    onChange, 
    description 
  }: { 
    label: string
    value: number[]
    onChange: (value: number[]) => void
    description?: string
  }) => (
    <div className="space-y-3">
      <div>
        <Label className="text-sm font-medium">{label}</Label>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </div>
      <div className="px-3 py-2 border rounded-lg bg-muted/20">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-muted-foreground">Poor</span>
          <div className="flex items-center gap-1">
            <Star className="h-3 w-3 text-primary" />
            <span className="text-sm font-medium">{value[0]}/10</span>
          </div>
          <span className="text-xs text-muted-foreground">Excellent</span>
        </div>
        <Slider
          value={value}
          onValueChange={onChange}
          max={10}
          min={1}
          step={1}
          className="w-full"
        />
      </div>
    </div>
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto mx-3 sm:mx-0 max-w-[calc(100vw-24px)]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <CalendarCheck className="h-5 w-5" />
            Weekly Check-in
          </DialogTitle>
          <DialogDescription className="text-sm">
            Take a moment to reflect on your week and plan ahead
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="font-medium text-sm">Basic Information</h3>
            
            <div>
              <Label htmlFor="fullName">Full Name *</Label>
              <Input
                id="fullName"
                value={formData.fullName}
                onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                placeholder="Enter your full name"
                required
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="gratefulFor">What are you grateful for this week?</Label>
              <Textarea
                id="gratefulFor"
                value={formData.gratefulFor}
                onChange={(e) => setFormData(prev => ({ ...prev, gratefulFor: e.target.value }))}
                placeholder="Share what you're grateful for..."
                rows={2}
                className="mt-1"
              />
            </div>
          </div>

          {/* Rating Sections */}
          <div className="space-y-4">
            <h3 className="font-medium text-sm">Weekly Ratings</h3>
            
            <RatingSlider
              label="Training/Learning Rating"
              value={formData.trainingRating}
              onChange={(value) => setFormData(prev => ({ ...prev, trainingRating: value }))}
              description="How would you rate your learning and training this week?"
            />

            <RatingSlider
              label="Energy Level"
              value={formData.energyLevel}
              onChange={(value) => setFormData(prev => ({ ...prev, energyLevel: value }))}
              description="What was your overall energy level this week?"
            />

            <RatingSlider
              label="Setbacks Rating"
              value={formData.setbacksRating}
              onChange={(value) => setFormData(prev => ({ ...prev, setbacksRating: value }))}
              description="How well did you handle setbacks and challenges?"
            />
          </div>

          {/* Progress Questions */}
          <div className="space-y-4">
            <h3 className="font-medium text-sm">Progress & Goals</h3>
            
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="completedSessions"
                checked={formData.completedSessions}
                onChange={(e) => setFormData(prev => ({ ...prev, completedSessions: e.target.checked }))}
                className="rounded border-gray-300"
              />
              <Label htmlFor="completedSessions">Did you complete your scheduled sessions/meetings?</Label>
            </div>

            <div>
              <Label htmlFor="sessionCompletionNotes">Session completion notes</Label>
              <Textarea
                id="sessionCompletionNotes"
                value={formData.sessionCompletionNotes}
                onChange={(e) => setFormData(prev => ({ ...prev, sessionCompletionNotes: e.target.value }))}
                placeholder="Notes about your sessions this week..."
                rows={2}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="weeklyGoals">What are your goals for next week?</Label>
              <Textarea
                id="weeklyGoals"
                value={formData.weeklyGoals}
                onChange={(e) => setFormData(prev => ({ ...prev, weeklyGoals: e.target.value }))}
                placeholder="List your key goals for the coming week..."
                rows={2}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="potentialObstacles">What potential obstacles do you foresee?</Label>
              <Textarea
                id="potentialObstacles"
                value={formData.potentialObstacles}
                onChange={(e) => setFormData(prev => ({ ...prev, potentialObstacles: e.target.value }))}
                placeholder="Identify potential challenges and how you'll address them..."
                rows={2}
                className="mt-1"
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="completedMainAction"
                checked={formData.completedMainAction}
                onChange={(e) => setFormData(prev => ({ ...prev, completedMainAction: e.target.checked }))}
                className="rounded border-gray-300"
              />
              <Label htmlFor="completedMainAction">Did you complete your main action item from last week?</Label>
            </div>

            <div>
              <Label htmlFor="roadblocksFaced">What roadblocks did you face?</Label>
              <Textarea
                id="roadblocksFaced"
                value={formData.roadblocksFaced}
                onChange={(e) => setFormData(prev => ({ ...prev, roadblocksFaced: e.target.value }))}
                placeholder="Describe any roadblocks and how you overcame them..."
                rows={2}
                className="mt-1"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Submitting...' : 'Submit Check-in'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}