import { useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { Settings, Crown, Heart, Loader2 } from 'lucide-react'

interface MemberProfile {
  id: string
  user_id: string
  first_name: string | null
  last_name: string | null
  display_name: string | null
  avatar_url: string | null
  bio: string | null
  family_role: string | null
  occupation: string | null
  phone: string | null
  is_admin: boolean | null
  is_accountability_partner: boolean | null
  created_at: string
}

interface EditMemberDialogProps {
  member: MemberProfile
  onMemberUpdated: () => void
}

export function EditMemberDialog({ member, onMemberUpdated }: EditMemberDialogProps) {
  const { user, profile } = useAuth()
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [isAdmin, setIsAdmin] = useState(member.is_admin || false)
  const [isAccountabilityPartner, setIsAccountabilityPartner] = useState(member.is_accountability_partner || false)

  const getDisplayName = () => {
    return member.display_name || 
           (member.first_name && member.last_name ? `${member.first_name} ${member.last_name}` : 
           member.first_name || 'Family Member')
  }

  const handleSaveRoles = async () => {
    if (!user?.id) return

    setLoading(true)
    try {
      // Handle admin role assignment/removal
      if (isAdmin && !member.is_admin) {
        const { error } = await supabase.rpc('assign_admin_role', {
          target_user_id: member.user_id,
          assigner_user_id: user.id
        })
        if (error) throw error
      }

      // Handle accountability partner role assignment/removal
      if (isAccountabilityPartner && !member.is_accountability_partner) {
        const { error } = await supabase.rpc('assign_accountability_role', {
          target_user_id: member.user_id,
          assigner_user_id: user.id,
          specialties: ['general_support']
        })
        if (error) throw error
      }

      // For removing roles, we need to update the profile directly since there's no remove function
      if (!isAdmin && member.is_admin) {
        const { error } = await supabase
          .from('profiles')
          .update({ is_admin: false, admin_permissions: null })
          .eq('user_id', member.user_id)
        if (error) throw error

        // Also remove from user_roles table
        const { error: roleError } = await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', member.user_id)
          .eq('role', 'admin')
        if (roleError) throw roleError
      }

      if (!isAccountabilityPartner && member.is_accountability_partner) {
        const { error } = await supabase
          .from('profiles')
          .update({ is_accountability_partner: false, accountability_specialties: null })
          .eq('user_id', member.user_id)
        if (error) throw error

        // Also remove from user_roles table
        const { error: roleError } = await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', member.user_id)
          .eq('role', 'accountability_partner')
        if (roleError) throw roleError
      }

      toast({
        title: "Member updated",
        description: `${getDisplayName()}'s roles have been updated successfully.`,
      })

      setOpen(false)
      onMemberUpdated()
    } catch (error) {
      console.error('Error updating member roles:', error)
      toast({
        title: "Error",
        description: "Failed to update member roles. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Only show edit button to admins
  if (!profile?.is_admin) {
    return null
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Settings className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Member Roles</DialogTitle>
          <DialogDescription>
            Manage roles and permissions for {getDisplayName()}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Current Roles Display */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Current Roles</Label>
            <div className="flex gap-2">
              {member.is_admin && (
                <Badge variant="destructive">
                  <Crown className="h-3 w-3 mr-1" />
                  Admin
                </Badge>
              )}
              {member.is_accountability_partner && (
                <Badge variant="secondary">
                  <Heart className="h-3 w-3 mr-1" />
                  Accountability Partner
                </Badge>
              )}
              {!member.is_admin && !member.is_accountability_partner && (
                <Badge variant="outline">Member</Badge>
              )}
            </div>
          </div>

          {/* Role Assignment */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="admin"
                checked={isAdmin}
                onCheckedChange={(checked) => setIsAdmin(checked as boolean)}
              />
              <Label htmlFor="admin" className="flex items-center gap-2">
                <Crown className="h-4 w-4 text-destructive" />
                Administrator
              </Label>
            </div>
            <p className="text-xs text-muted-foreground ml-6">
              Can manage all family members, settings, and admin functions
            </p>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="accountability"
                checked={isAccountabilityPartner}
                onCheckedChange={(checked) => setIsAccountabilityPartner(checked as boolean)}
              />
              <Label htmlFor="accountability" className="flex items-center gap-2">
                <Heart className="h-4 w-4 text-primary" />
                Accountability Partner
              </Label>
            </div>
            <p className="text-xs text-muted-foreground ml-6">
              Can provide accountability support and coaching to family members
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveRoles} disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}