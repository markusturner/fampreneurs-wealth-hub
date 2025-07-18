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
import { Plus, Users, User } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/integrations/supabase/client'

interface Coach {
  id: string
  full_name: string
  email: string
}

interface AddCoachingSessionDialogProps {
  onSessionAdded: () => void
  type: 'group' | 'one-on-one'
}

export function AddCoachingSessionDialog({ onSessionAdded, type }: AddCoachingSessionDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [coaches, setCoaches] = useState<Coach[]>([])
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    coach_id: '',
    session_date: '',
    session_time: '',
    duration_minutes: '60',
    max_participants: type === 'group' ? '10' : '1',
    meeting_url: '',
    meeting_password: '',
    is_recurring: false,
    recurrence_pattern: 'weekly',
    recurrence_end_date: ''
  })
  const { toast } = useToast()

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
      const selectedCoach = coaches.find(c => c.id === formData.coach_id)
      
      if (type === 'group') {
        const { error } = await supabase
          .from('group_coaching_sessions')
          .insert({
            title: formData.title,
            description: formData.description,
            coach_name: selectedCoach?.full_name || 'Unknown Coach',
            session_date: formData.session_date,
            session_time: formData.session_time,
            duration_minutes: parseInt(formData.duration_minutes),
            max_participants: parseInt(formData.max_participants),
            meeting_url: formData.meeting_url,
            meeting_password: formData.meeting_password,
            meeting_type: 'zoom',
            is_recurring: formData.is_recurring,
            recurrence_pattern: formData.is_recurring ? formData.recurrence_pattern : null,
            recurrence_end_date: formData.is_recurring ? formData.recurrence_end_date : null,
            created_by: (await supabase.auth.getUser()).data.user?.id
          })
        
        if (error) throw error
      } else {
        // 1-on-1 session - insert into individual_coaching_sessions table
        const { error } = await supabase
          .from('individual_coaching_sessions')
          .insert({
            title: formData.title,
            description: formData.description,
            coach_id: formData.coach_id,
            session_date: formData.session_date,
            session_time: formData.session_time,
            duration_minutes: parseInt(formData.duration_minutes),
            meeting_url: formData.meeting_url,
            meeting_password: formData.meeting_password,
            meeting_type: 'zoom',
            created_by: (await supabase.auth.getUser()).data.user?.id
          })
        
        if (error) throw error
      }

      toast({
        title: "Session created successfully",
        description: `${type === 'group' ? 'Group' : '1-on-1'} coaching session has been scheduled.`,
      })

      setFormData({
        title: '',
        description: '',
        coach_id: '',
        session_date: '',
        session_time: '',
        duration_minutes: '60',
        max_participants: type === 'group' ? '10' : '1',
        meeting_url: '',
        meeting_password: '',
        is_recurring: false,
        recurrence_pattern: 'weekly',
        recurrence_end_date: ''
      })
      setOpen(false)
      onSessionAdded()
    } catch (error: any) {
      toast({
        title: "Error creating session",
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
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          {type === 'group' ? (
            <>
              <Users className="h-4 w-4 mr-1" />
              Add Group Session
            </>
          ) : (
            <>
              <User className="h-4 w-4 mr-1" />
              Add 1-on-1 Session
            </>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Add {type === 'group' ? 'Group' : '1-on-1'} Coaching Session
          </DialogTitle>
          <DialogDescription>
            Schedule a new {type === 'group' ? 'group' : '1-on-1'} coaching session with a coach.
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
            <Label htmlFor="coach_id">Coach</Label>
            <Select value={formData.coach_id} onValueChange={(value) => setFormData({ ...formData, coach_id: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Select a coach" />
              </SelectTrigger>
              <SelectContent>
                {coaches.map((coach) => (
                  <SelectItem key={coach.id} value={coach.id}>
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
            
            {type === 'group' && (
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
            )}
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

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Session'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}