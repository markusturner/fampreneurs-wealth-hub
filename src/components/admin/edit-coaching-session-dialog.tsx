import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Edit, Users, User } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/integrations/supabase/client'

interface Coach {
  id: string
  full_name: string
  email: string
}

interface Session {
  id: string
  title: string
  description: string | null
  coach_name: string
  session_date: string
  session_time: string
  duration_minutes: number
  max_participants: number | null
  meeting_url: string
  meeting_password: string | null
  is_recurring?: boolean | null
  recurrence_pattern?: string | null
  recurrence_end_date?: string | null
  session_type?: 'group' | 'individual'
  coach_id?: string | null
  client_id?: string | null
  status?: string
  notes?: string | null
}

interface EditCoachingSessionDialogProps {
  session: Session
  onSessionUpdated: () => void
}

export function EditCoachingSessionDialog({ session, onSessionUpdated }: EditCoachingSessionDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [coaches, setCoaches] = useState<Coach[]>([])
  const [formData, setFormData] = useState({
    title: session.title,
    description: session.description || '',
    coach_name: session.coach_name,
    session_date: session.session_date,
    session_time: session.session_time,
    duration_minutes: session.duration_minutes.toString(),
    max_participants: (session.max_participants || 1).toString(),
    meeting_url: session.meeting_url,
    meeting_password: session.meeting_password || '',
    is_recurring: session.is_recurring || false,
    recurrence_pattern: session.recurrence_pattern || 'weekly',
    recurrence_end_date: session.recurrence_end_date || ''
  })
  const { toast } = useToast()

  const isGroupSession = session.session_type === 'group' || (session.max_participants || 1) > 1

  useEffect(() => {
    if (open) {
      loadCoaches()
    }
  }, [open])

  const loadCoaches = async () => {
    try {
      const { data, error } = await supabase
        .from('coaches')
        .select('id, full_name, email')
        .eq('is_active', true)

      if (error) throw error
      setCoaches(data || [])
    } catch (error: any) {
      toast({
        title: "Error loading coaches",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Determine if this is a group session or individual session
      const sessionTable = isGroupSession ? 'group_coaching_sessions' : 'individual_coaching_sessions'
      
      const updateData: any = {
        title: formData.title,
        description: formData.description,
        session_date: formData.session_date,
        session_time: formData.session_time,
        duration_minutes: parseInt(formData.duration_minutes),
        meeting_url: formData.meeting_url,
        meeting_password: formData.meeting_password || null
      }

      // Add fields specific to each session type
      if (isGroupSession) {
        updateData.coach_name = formData.coach_name
        updateData.max_participants = parseInt(formData.max_participants)
        updateData.is_recurring = formData.is_recurring
        updateData.recurrence_pattern = formData.is_recurring ? formData.recurrence_pattern : null
        updateData.recurrence_end_date = formData.is_recurring && formData.recurrence_end_date ? formData.recurrence_end_date : null
      } else {
        // For individual sessions
        updateData.notes = formData.description
        // Find coach by name and set coach_id
        const selectedCoach = coaches.find(c => c.full_name === formData.coach_name)
        if (selectedCoach) {
          updateData.coach_id = selectedCoach.id
        }
      }

      const { error } = await supabase
        .from(sessionTable)
        .update(updateData)
        .eq('id', session.id)

      if (error) throw error

      toast({
        title: "Session updated successfully",
        description: `${isGroupSession ? 'Group' : '1-on-1'} coaching session has been updated.`,
      })

      setOpen(false)
      onSessionUpdated()
    } catch (error: any) {
      toast({
        title: "Error updating session",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Edit className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Edit {isGroupSession ? 'Group' : '1-on-1'} Coaching Session
          </DialogTitle>
          <DialogDescription>
            Update the details for this {isGroupSession ? 'group' : '1-on-1'} coaching session.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Session Title</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="coach_name">Coach Name</Label>
            <Select value={formData.coach_name} onValueChange={(value) => setFormData({ ...formData, coach_name: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Select a coach" />
              </SelectTrigger>
              <SelectContent>
                {coaches.map((coach) => (
                  <SelectItem key={coach.id} value={coach.full_name}>
                    {coach.full_name} ({coach.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="session_date">Date</Label>
              <Input
                id="session_date"
                type="date"
                value={formData.session_date}
                onChange={(e) => setFormData({ ...formData, session_date: e.target.value })}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="session_time">Time</Label>
              <Input
                id="session_time"
                type="time"
                value={formData.session_time}
                onChange={(e) => setFormData({ ...formData, session_time: e.target.value })}
                required
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="duration_minutes">Duration (minutes)</Label>
              <Input
                id="duration_minutes"
                type="number"
                value={formData.duration_minutes}
                onChange={(e) => setFormData({ ...formData, duration_minutes: e.target.value })}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="max_participants">Max Participants</Label>
              <Input
                id="max_participants"
                type="number"
                value={formData.max_participants}
                onChange={(e) => setFormData({ ...formData, max_participants: e.target.value })}
                required
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="meeting_url">Meeting URL</Label>
            <Input
              id="meeting_url"
              type="url"
              value={formData.meeting_url}
              onChange={(e) => setFormData({ ...formData, meeting_url: e.target.value })}
              placeholder="https://zoom.us/j/..."
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="meeting_password">Meeting Password (optional)</Label>
            <Input
              id="meeting_password"
              value={formData.meeting_password}
              onChange={(e) => setFormData({ ...formData, meeting_password: e.target.value })}
            />
          </div>

          {/* Recurring Session Options */}
          <div className="space-y-4 border-t pt-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="is_recurring"
                checked={formData.is_recurring}
                onCheckedChange={(checked) => setFormData({ ...formData, is_recurring: checked })}
              />
              <Label htmlFor="is_recurring">Make this a recurring session</Label>
            </div>

            {formData.is_recurring && (
              <div className="space-y-4 ml-6">
                <div className="space-y-2">
                  <Label htmlFor="recurrence_pattern">Recurrence Pattern</Label>
                  <Select value={formData.recurrence_pattern} onValueChange={(value) => setFormData({ ...formData, recurrence_pattern: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="biweekly">Biweekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="recurrence_end_date">End Date (optional)</Label>
                  <Input
                    id="recurrence_end_date"
                    type="date"
                    value={formData.recurrence_end_date}
                    onChange={(e) => setFormData({ ...formData, recurrence_end_date: e.target.value })}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Updating...' : 'Update Session'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}