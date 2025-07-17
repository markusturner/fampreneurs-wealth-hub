import React, { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { UserCog, Shield, CreditCard, Settings, Crown, Users } from 'lucide-react'

interface Profile {
  id: string
  user_id: string
  first_name: string | null
  last_name: string | null
  display_name: string | null
  email?: string
  is_admin: boolean
  created_at: string
  roles?: string[]
}

interface UserRoleManagementProps {
  user: Profile
  onRolesUpdated: () => void
}

const roleIcons = {
  member: Users,
  billing_manager: CreditCard,
  admin: Shield,
  moderator: Settings,
  group_owner: Crown,
  accountability_partner: UserCog
}

const roleColors = {
  member: 'bg-slate-100 text-slate-800',
  billing_manager: 'bg-green-100 text-green-800',
  admin: 'bg-red-100 text-red-800',
  moderator: 'bg-blue-100 text-blue-800',
  group_owner: 'bg-purple-100 text-purple-800',
  accountability_partner: 'bg-orange-100 text-orange-800'
}

const roleDescriptions = {
  member: 'Normal members with basic access',
  billing_manager: 'Co-owners with full access including billing',
  admin: 'Full access except billing settings',
  moderator: 'Community moderation privileges',
  group_owner: 'Platform owners with complete access',
  accountability_partner: 'Provides accountability support to members'
}

export function UserRoleManagement({ user, onRolesUpdated }: UserRoleManagementProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [selectedRole, setSelectedRole] = useState<'member' | 'billing_manager' | 'admin' | 'moderator' | 'group_owner' | 'accountability_partner' | ''>('')
  const { toast } = useToast()
  const { user: currentUser } = useAuth()

  const assignRole = async () => {
    if (!currentUser || !selectedRole) return

    try {
      setLoading(true)
      
      const { error } = await supabase.rpc('assign_user_role', {
        target_user_id: user.user_id,
        new_role: selectedRole,
        assigner_user_id: currentUser.id
      })
      
      if (error) throw error
      
      // Update profile fields for backward compatibility
      if (selectedRole === 'admin') {
        await supabase.rpc('assign_admin_role', {
          target_user_id: user.user_id,
          assigner_user_id: currentUser.id
        })
      }
      
      if (selectedRole === 'moderator') {
        await supabase.rpc('assign_moderator_role', {
          target_user_id: user.user_id,
          assigner_user_id: currentUser.id
        })
      }
      
      toast({
        title: "Role assigned",
        description: `User has been assigned the ${selectedRole} role.`,
      })
      
      setSelectedRole('')
      setOpen(false)
      onRolesUpdated()
    } catch (error: any) {
      toast({
        title: "Error assigning role",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const removeRole = async (role: 'member' | 'billing_manager' | 'admin' | 'moderator' | 'group_owner' | 'accountability_partner') => {
    if (!currentUser) return

    try {
      setLoading(true)
      
      const { error } = await supabase.rpc('remove_user_role', {
        target_user_id: user.user_id,
        role_to_remove: role,
        remover_user_id: currentUser.id
      })
      
      if (error) throw error
      
      // Update profile fields for backward compatibility
      if (role === 'admin') {
        await supabase
          .from('profiles')
          .update({ is_admin: false })
          .eq('user_id', user.user_id)
      }
      
      if (role === 'moderator') {
        await supabase
          .from('profiles')
          .update({ is_moderator: false })
          .eq('user_id', user.user_id)
      }
      
      toast({
        title: "Role removed",
        description: `${role} role has been removed from the user.`,
      })
      
      onRolesUpdated()
    } catch (error: any) {
      toast({
        title: "Error removing role",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1">
        {user.roles?.map((role) => {
          const IconComponent = roleIcons[role as keyof typeof roleIcons] || Users
          const colorClass = roleColors[role as keyof typeof roleColors] || 'bg-gray-100 text-gray-800'
          
          return (
            <Badge
              key={role}
              variant="secondary"
              className={`${colorClass} flex items-center space-x-1`}
            >
              <IconComponent className="h-3 w-3" />
              <span className="capitalize">{role.replace('_', ' ')}</span>
              {role !== 'member' && (
                <button
                  onClick={() => removeRole(role as 'member' | 'billing_manager' | 'admin' | 'moderator' | 'group_owner' | 'accountability_partner')}
                  className="ml-1 text-xs hover:text-red-600"
                  disabled={loading}
                >
                  ×
                </button>
              )}
            </Badge>
          )
        })}
      </div>
      
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            <UserCog className="h-4 w-4 mr-2" />
            Manage Roles
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage User Roles</DialogTitle>
            <DialogDescription>
              Assign roles to {user.display_name || `${user.first_name} ${user.last_name}` || 'this user'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Role to Assign</label>
              <Select value={selectedRole} onValueChange={(value) => setSelectedRole(value as typeof selectedRole)}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a role..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">
                    <div className="flex items-center space-x-2">
                      <Users className="h-4 w-4" />
                      <span>Member</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="billing_manager">
                    <div className="flex items-center space-x-2">
                      <CreditCard className="h-4 w-4" />
                      <span>Billing Manager</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="admin">
                    <div className="flex items-center space-x-2">
                      <Shield className="h-4 w-4" />
                      <span>Admin</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="moderator">
                    <div className="flex items-center space-x-2">
                      <Settings className="h-4 w-4" />
                      <span>Moderator</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="group_owner">
                    <div className="flex items-center space-x-2">
                      <Crown className="h-4 w-4" />
                      <span>Group Owner</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="accountability_partner">
                    <div className="flex items-center space-x-2">
                      <UserCog className="h-4 w-4" />
                      <span>Accountability Partner</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {selectedRole && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">
                  {roleDescriptions[selectedRole as keyof typeof roleDescriptions]}
                </p>
              </div>
            )}
            
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={assignRole} disabled={!selectedRole || loading}>
                {loading ? 'Assigning...' : 'Assign Role'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}