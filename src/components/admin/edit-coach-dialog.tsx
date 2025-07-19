import React, { useState } from 'react'
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
import { Edit } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/integrations/supabase/client'

interface Coach {
  id: string
  full_name: string
  email: string | null
  phone: string | null
  bio: string | null
  specialties: string[] | null
  hourly_rate: number | null
  years_experience: number | null
  is_active: boolean | null
  calendar_link: string | null
}

interface EditCoachDialogProps {
  coach: Coach
  onCoachUpdated: () => void
}

export function EditCoachDialog({ coach, onCoachUpdated }: EditCoachDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    full_name: coach.full_name,
    email: coach.email || '',
    phone: coach.phone || '',
    bio: coach.bio || '',
    specialties: coach.specialties?.join(', ') || '',
    hourly_rate: coach.hourly_rate?.toString() || '',
    years_experience: coach.years_experience?.toString() || '',
    is_active: coach.is_active ?? true,
    calendar_link: coach.calendar_link || ''
  })
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { error } = await supabase
        .from('coaches')
        .update({
          full_name: formData.full_name,
          email: formData.email || null,
          phone: formData.phone || null,
          bio: formData.bio || null,
          specialties: formData.specialties ? formData.specialties.split(',').map(s => s.trim()) : null,
          hourly_rate: formData.hourly_rate ? parseFloat(formData.hourly_rate) : null,
          years_experience: formData.years_experience ? parseInt(formData.years_experience) : null,
          is_active: formData.is_active,
          calendar_link: formData.calendar_link || null
        })
        .eq('id', coach.id)

      // Also update the hourly rate in financial_advisors table if this coach exists there
      if (formData.hourly_rate) {
        await supabase
          .from('financial_advisors')
          .update({ hourly_rate: parseFloat(formData.hourly_rate) })
          .eq('full_name', formData.full_name)
      }

      if (error) throw error

      toast({
        title: "Coach updated successfully",
        description: "The coach information has been updated.",
      })

      setOpen(false)
      onCoachUpdated()
    } catch (error: any) {
      toast({
        title: "Error updating coach",
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
          <Edit className="h-4 w-4 mr-1" />
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Coach</DialogTitle>
          <DialogDescription>
            Update the coach's information and availability.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="full_name">Full Name</Label>
            <Input
              id="full_name"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              rows={3}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="specialties">Specialties (comma separated)</Label>
            <Input
              id="specialties"
              value={formData.specialties}
              onChange={(e) => setFormData({ ...formData, specialties: e.target.value })}
              placeholder="Estate Planning, Tax Strategy, Investment Management"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="hourly_rate">Hourly Rate ($)</Label>
              <Input
                id="hourly_rate"
                type="number"
                value={formData.hourly_rate}
                onChange={(e) => setFormData({ ...formData, hourly_rate: e.target.value })}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="years_experience">Years Experience</Label>
              <Input
                id="years_experience"
                type="number"
                value={formData.years_experience}
                onChange={(e) => setFormData({ ...formData, years_experience: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="calendar_link">Calendar Booking Link</Label>
            <Input
              id="calendar_link"
              type="url"
              value={formData.calendar_link}
              onChange={(e) => setFormData({ ...formData, calendar_link: e.target.value })}
              placeholder="https://calendly.com/your-link or https://cal.com/your-link"
            />
            <p className="text-xs text-muted-foreground">
              Link to your calendar booking system (Calendly, Cal.com, etc.)
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="rounded border-input"
            />
            <Label htmlFor="is_active">Active Coach</Label>
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Updating...' : 'Update Coach'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}