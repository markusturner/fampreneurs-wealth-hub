import React, { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { UserPlus, Users } from 'lucide-react'

interface Coach {
  id: string
  full_name: string
  email: string | null
  specialties: string[] | null
  is_active: boolean
}

interface AssignCoachDialogProps {
  userId: string
  userName: string
  currentCoachId?: string
  onAssignmentUpdated: () => void
}

export function AssignCoachDialog({ userId, userName, currentCoachId, onAssignmentUpdated }: AssignCoachDialogProps) {
  const [coaches, setCoaches] = useState<Coach[]>([])
  const [selectedCoachId, setSelectedCoachId] = useState<string>(currentCoachId || '')
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (isOpen) {
      loadCoaches()
    }
  }, [isOpen])

  const loadCoaches = async () => {
    const { data, error } = await supabase
      .from('coaches')
      .select('id, full_name, email, specialties, is_active')
      .eq('is_active', true)
      .order('full_name')

    if (!error && data) {
      setCoaches(data)
    }
  }

  const handleAssignment = async () => {
    if (!selectedCoachId) {
      toast({
        title: "Please select a coach",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    try {
      // Remove existing assignment if any
      if (currentCoachId) {
        await supabase
          .from('coach_assignments')
          .delete()
          .eq('user_id', userId)
          .eq('status', 'active')
      }

      // Create new assignment
      const { error } = await supabase
        .from('coach_assignments')
        .insert({
          user_id: userId,
          coach_id: selectedCoachId,
          status: 'active'
        })

      if (error) throw error

      // Immediately update the assignment and close dialog
      onAssignmentUpdated()
      setIsOpen(false)

      toast({
        title: "Coach assigned successfully",
        description: `${userName} has been assigned to the selected coach.`,
      })
    } catch (error: any) {
      toast({
        title: "Error assigning coach",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleRemoveAssignment = async () => {
    if (!currentCoachId) return

    setIsLoading(true)
    try {
      const { error } = await supabase
        .from('coach_assignments')
        .update({ status: 'inactive' })
        .eq('user_id', userId)
        .eq('status', 'active')

      if (error) throw error

      toast({
        title: "Coach assignment removed",
        description: `${userName} is no longer assigned to a coach.`,
      })

      setIsOpen(false)
      onAssignmentUpdated()
    } catch (error: any) {
      toast({
        title: "Error removing assignment",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          {currentCoachId ? <Users className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
          {currentCoachId ? 'Change Coach' : 'Assign Coach'}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {currentCoachId ? 'Change Coach Assignment' : 'Assign Coach'}
          </DialogTitle>
          <DialogDescription>
            {currentCoachId 
              ? `Change the coach assignment for ${userName}` 
              : `Select a coach to assign to ${userName}`
            }
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="coach">Select Coach</Label>
            <Select value={selectedCoachId} onValueChange={setSelectedCoachId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a coach" />
              </SelectTrigger>
              <SelectContent>
                {coaches.map((coach) => (
                  <SelectItem key={coach.id} value={coach.id}>
                    <div className="flex flex-col">
                      <span className="font-medium">{coach.full_name}</span>
                      {coach.specialties && coach.specialties.length > 0 && (
                        <span className="text-xs text-muted-foreground">
                          {coach.specialties.join(', ')}
                        </span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={handleAssignment} 
              disabled={isLoading || !selectedCoachId}
              className="flex-1"
            >
              {currentCoachId ? 'Update Assignment' : 'Assign Coach'}
            </Button>
            {currentCoachId && (
              <Button 
                variant="destructive" 
                onClick={handleRemoveAssignment}
                disabled={isLoading}
              >
                Remove
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}