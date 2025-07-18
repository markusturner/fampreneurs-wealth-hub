import React, { useState, useEffect } from 'react'
import { Phone, Users, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/integrations/supabase/client'

interface Coach {
  id: string
  full_name: string
  email: string
}

interface CallButtonProps {
  onCallAdded: () => void
}

export function CallButton({ onCallAdded }: CallButtonProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [coaches, setCoaches] = useState<Coach[]>([])
  const [sessionType, setSessionType] = useState<'group' | 'individual'>('group')
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    coach_id: '',
    session_date: '',
    session_time: '',
    duration_minutes: '60',
    max_participants: '10',
    meeting_url: '',
    meeting_password: '',
    client_email: '' // For individual sessions
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
        .from('financial_advisors')
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
      const currentUser = await supabase.auth.getUser()
      
      if (sessionType === 'group') {
        // Create group coaching session
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
            created_by: currentUser.data.user?.id
          })

        if (error) throw error
      } else {
        // Create individual coaching session
        let clientId = currentUser.data.user?.id

        // For individual sessions, just use current user as client
        // In a real app, you'd need admin permissions to assign sessions to other users

        const { error } = await supabase
          .from('individual_coaching_sessions')
          .insert({
            title: formData.title,
            description: formData.description,
            coach_id: formData.coach_id,
            client_id: clientId,
            session_date: formData.session_date,
            session_time: formData.session_time,
            duration_minutes: parseInt(formData.duration_minutes),
            meeting_url: formData.meeting_url,
            meeting_password: formData.meeting_password,
            meeting_type: 'zoom',
            created_by: currentUser.data.user?.id
          })

        if (error) throw error
      }

      toast({
        title: "Session created successfully",
        description: `${sessionType === 'group' ? 'Group' : '1-on-1'} coaching session has been scheduled.`,
      })

      setFormData({
        title: '',
        description: '',
        coach_id: '',
        session_date: '',
        session_time: '',
        duration_minutes: '60',
        max_participants: '10',
        meeting_url: '',
        meeting_password: '',
        client_email: ''
      })
      setOpen(false)
      onCallAdded()
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
    <>
      <Button 
        onClick={() => setOpen(true)}
        className="gap-2"
        style={{ backgroundColor: '#ffb500', color: '#290a52' }}
      >
        <Phone className="h-4 w-4" />
        Call
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Schedule Coaching Session</DialogTitle>
            <DialogDescription>
              Create a new group or individual coaching session.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Session Type Toggle */}
            <div className="flex gap-2">
              <Button
                type="button"
                variant={sessionType === 'group' ? 'default' : 'outline'}
                onClick={() => setSessionType('group')}
                className="flex-1 gap-2"
              >
                <Users className="h-4 w-4" />
                Group Call
              </Button>
              <Button
                type="button"
                variant={sessionType === 'individual' ? 'default' : 'outline'}
                onClick={() => setSessionType('individual')}
                className="flex-1 gap-2"
              >
                <User className="h-4 w-4" />
                1-on-1 Call
              </Button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Session Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder={sessionType === 'group' ? "Financial Planning Workshop" : "Personal Financial Consultation"}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="coach">Coach *</Label>
                <Select value={formData.coach_id} onValueChange={(value) => setFormData({ ...formData, coach_id: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a coach" />
                  </SelectTrigger>
                  <SelectContent>
                    {coaches.map((coach) => (
                      <SelectItem key={coach.id} value={coach.id}>
                        {coach.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {sessionType === 'individual' && (
                <div className="space-y-2">
                  <Label htmlFor="client_email">Client Email (optional)</Label>
                  <Input
                    id="client_email"
                    type="email"
                    value={formData.client_email}
                    onChange={(e) => setFormData({ ...formData, client_email: e.target.value })}
                    placeholder="client@example.com (leave empty to assign to yourself)"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="session_date">Date *</Label>
                  <Input
                    id="session_date"
                    type="date"
                    value={formData.session_date}
                    onChange={(e) => setFormData({ ...formData, session_date: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="session_time">Time *</Label>
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
                  <Label htmlFor="duration">Duration (minutes)</Label>
                  <Input
                    id="duration"
                    type="number"
                    value={formData.duration_minutes}
                    onChange={(e) => setFormData({ ...formData, duration_minutes: e.target.value })}
                    min="15"
                    max="180"
                  />
                </div>
                {sessionType === 'group' && (
                  <div className="space-y-2">
                    <Label htmlFor="max_participants">Max Participants</Label>
                    <Input
                      id="max_participants"
                      type="number"
                      value={formData.max_participants}
                      onChange={(e) => setFormData({ ...formData, max_participants: e.target.value })}
                      min="1"
                      max="50"
                    />
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="meeting_url">Meeting URL *</Label>
                <Input
                  id="meeting_url"
                  value={formData.meeting_url}
                  onChange={(e) => setFormData({ ...formData, meeting_url: e.target.value })}
                  placeholder="https://zoom.us/j/..."
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="meeting_password">Meeting Password</Label>
                <Input
                  id="meeting_password"
                  value={formData.meeting_password}
                  onChange={(e) => setFormData({ ...formData, meeting_password: e.target.value })}
                  placeholder="Optional"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">{sessionType === 'group' ? 'Description' : 'Notes'}</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder={sessionType === 'group' ? "Session agenda and details..." : "Session notes and agenda..."}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? 'Creating...' : `Create ${sessionType === 'group' ? 'Group' : '1-on-1'} Session`}
                </Button>
              </div>
            </form>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}