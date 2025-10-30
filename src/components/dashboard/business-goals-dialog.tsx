import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Target, Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/contexts/AuthContext'

interface BusinessGoalsDialogProps {
  onGoalsUpdated?: () => void
}

export function BusinessGoalsDialog({ onGoalsUpdated }: BusinessGoalsDialogProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [fetchingGoals, setFetchingGoals] = useState(false)
  const [goals, setGoals] = useState('')
  const [targetRevenue, setTargetRevenue] = useState('')
  const [targetTimeline, setTargetTimeline] = useState('12_months')

  useEffect(() => {
    if (open && user?.id) {
      fetchGoals()
    }
  }, [open, user?.id])

  const fetchGoals = async () => {
    if (!user?.id) return
    
    setFetchingGoals(true)
    try {
      const { data, error } = await supabase
        .from('business_goals')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()

      if (error && error.code !== 'PGRST116') throw error

      if (data) {
        setGoals(data.goals || '')
        setTargetRevenue(data.target_revenue?.toString() || '')
        setTargetTimeline(data.target_timeline || '12_months')
      }
    } catch (error) {
      console.error('Error fetching goals:', error)
      toast({
        title: "Error",
        description: "Failed to fetch your business goals",
        variant: "destructive"
      })
    } finally {
      setFetchingGoals(false)
    }
  }

  const handleSave = async () => {
    if (!user?.id) return
    
    if (!goals.trim()) {
      toast({
        title: "Goals Required",
        description: "Please enter your business goals",
        variant: "destructive"
      })
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase
        .from('business_goals')
        .upsert({
          user_id: user.id,
          goals: goals.trim(),
          target_revenue: targetRevenue ? parseFloat(targetRevenue) : null,
          target_timeline: targetTimeline,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        })

      if (error) throw error

      toast({
        title: "Success",
        description: "Your business goals have been saved"
      })

      setOpen(false)
      onGoalsUpdated?.()
    } catch (error) {
      console.error('Error saving goals:', error)
      toast({
        title: "Error",
        description: "Failed to save your business goals",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Target className="h-4 w-4" />
          Set Business Goals
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Set Your Business Goals</DialogTitle>
          <DialogDescription>
            Share your business goals to get personalized AI financial insights aligned with your objectives.
          </DialogDescription>
        </DialogHeader>

        {fetchingGoals ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="goals">Your Business Goals</Label>
              <Textarea
                id="goals"
                placeholder="E.g., Scale my service business to $1M revenue, acquire 2 rental properties, launch new product line, hire 5 employees..."
                value={goals}
                onChange={(e) => setGoals(e.target.value)}
                rows={6}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">
                Be specific about what you want to achieve. The AI will provide tailored insights to help you reach these goals.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="revenue">Target Revenue ($)</Label>
                <Input
                  id="revenue"
                  type="number"
                  placeholder="1000000"
                  value={targetRevenue}
                  onChange={(e) => setTargetRevenue(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="timeline">Timeline</Label>
                <Select value={targetTimeline} onValueChange={setTargetTimeline}>
                  <SelectTrigger id="timeline">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="6_months">6 Months</SelectItem>
                    <SelectItem value="12_months">12 Months</SelectItem>
                    <SelectItem value="2_years">2 Years</SelectItem>
                    <SelectItem value="5_years">5 Years</SelectItem>
                    <SelectItem value="10_years">10 Years</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Save Goals
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
