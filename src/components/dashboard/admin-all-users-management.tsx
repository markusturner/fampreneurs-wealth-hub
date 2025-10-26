import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/integrations/supabase/client'
import { Loader2, Users, Search, Pencil, Trash2, Eye, UserCog, Mail, Plus, X, Crown } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ScrollArea } from '@/components/ui/scroll-area'

interface UserProfile {
  user_id: string
  email: string
  first_name: string | null
  last_name: string | null
  display_name: string | null
  phone: string | null
  program_name: string | null
  membership_type: string | null
  is_admin: boolean
  is_moderator: boolean
  created_at: string
  subscription_tier?: string | null
  subscribed?: boolean
}

export function AdminAllUsersManagement() {
  const [users, setUsers] = useState<UserProfile[]>([])
  const [filteredUsers, setFilteredUsers] = useState<UserProfile[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null)
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null)
  const [previewUser, setPreviewUser] = useState<UserProfile | null>(null)
  const [resendingCredentialsId, setResendingCredentialsId] = useState<string | null>(null)
  const [programOptions, setProgramOptions] = useState<string[]>([
    'The Family Business University',
    'The Family Vault',
    'The Family Business Accelerator',
    'The Family Legacy: VIP Weekend',
    'The Family Fortune Mastermind'
  ])
  const [managingPrograms, setManagingPrograms] = useState(false)
  const [newProgramName, setNewProgramName] = useState('')
  const [editingProgramIndex, setEditingProgramIndex] = useState<number | null>(null)
  const [editingProgramValue, setEditingProgramValue] = useState('')
  const { toast } = useToast()

  const fetchUsers = async () => {
    setIsLoading(true)
    try {
      const { data: profilesData, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      // Fetch subscription data for all users
      const { data: subscribersData } = await supabase
        .from('subscribers')
        .select('user_id, subscription_tier, subscribed')

      // Merge subscription data with profiles
      const usersWithSubscriptions = (profilesData || []).map(profile => {
        const subscription = subscribersData?.find(sub => sub.user_id === profile.user_id)
        return {
          ...profile,
          subscription_tier: subscription?.subscription_tier,
          subscribed: subscription?.subscribed
        }
      })

      setUsers(usersWithSubscriptions)
      setFilteredUsers(usersWithSubscriptions)
    } catch (error: any) {
      console.error('Error fetching users:', error)
      toast({
        title: "Error",
        description: "Failed to load users",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
    
    // Set up realtime subscription for profiles changes
    const channel = supabase
      .channel('profiles_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles'
        },
        () => {
          fetchUsers()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  useEffect(() => {
    const filtered = users.filter(user => {
      const searchLower = searchQuery.toLowerCase()
      return (
        user.email?.toLowerCase().includes(searchLower) ||
        user.first_name?.toLowerCase().includes(searchLower) ||
        user.last_name?.toLowerCase().includes(searchLower) ||
        user.display_name?.toLowerCase().includes(searchLower) ||
        user.program_name?.toLowerCase().includes(searchLower)
      )
    })
    setFilteredUsers(filtered)
  }, [searchQuery, users])

  const handleUpdateUser = async () => {
    if (!editingUser) return

    console.log('Updating user with membership_type:', editingUser.membership_type)

    try {
      // Update profile fields
      const { data: updatedData, error: profileError } = await supabase
        .from('profiles')
        .update({
          first_name: editingUser.first_name,
          last_name: editingUser.last_name,
          display_name: editingUser.display_name,
          phone: editingUser.phone,
          program_name: editingUser.program_name,
          membership_type: editingUser.membership_type,
          is_admin: editingUser.is_admin,
          is_moderator: editingUser.is_moderator,
        })
        .eq('user_id', editingUser.user_id)
        .select()

      if (profileError) {
        console.error('Profile update error:', profileError)
        throw profileError
      }

      console.log('Profile updated successfully:', updatedData)

      // Update admin role
      if (editingUser.is_admin) {
        const { error: adminError } = await supabase.rpc('assign_admin_role', {
          target_user_id: editingUser.user_id,
          assigner_user_id: (await supabase.auth.getUser()).data.user?.id
        })
        if (adminError) console.error('Admin role error:', adminError)
      }

      // Update owner role
      if (editingUser.is_moderator) {
        // Add owner role
        const { error: ownerError } = await supabase
          .from('user_roles')
          .upsert({
            user_id: editingUser.user_id,
            role: 'owner',
            assigned_by: (await supabase.auth.getUser()).data.user?.id
          }, {
            onConflict: 'user_id,role'
          })
        if (ownerError) console.error('Owner role error:', ownerError)
      } else {
        // Remove owner role
        const { error: removeOwnerError } = await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', editingUser.user_id)
          .eq('role', 'owner')
        if (removeOwnerError) console.error('Remove owner role error:', removeOwnerError)
      }

      toast({
        title: "Success",
        description: "User updated successfully"
      })
      
      setEditingUser(null)
      
      // Refresh the user list
      await fetchUsers()
      console.log('Users refreshed after update')
    } catch (error: any) {
      console.error('Error updating user:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to update user",
        variant: "destructive"
      })
    }
  }

  const handleDeleteUser = async () => {
    if (!deletingUserId) return

    try {
      const { data, error } = await supabase.functions.invoke('delete-user', {
        body: { userId: deletingUserId }
      })

      if (error) throw error
      if (data?.error) throw new Error(data.error)

      toast({
        title: "Success",
        description: "User deleted successfully"
      })
      
      setDeletingUserId(null)
      fetchUsers()
    } catch (error: any) {
      console.error('Error deleting user:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to delete user",
        variant: "destructive"
      })
    }
  }

  const handleResendCredentials = async (user: UserProfile) => {
    setResendingCredentialsId(user.user_id)
    try {
      const { data, error } = await supabase.functions.invoke('create-user-with-credentials', {
        body: {
          email: user.email,
          firstName: user.first_name || '',
          lastName: user.last_name || '',
          role: user.membership_type || 'trustee'
        }
      })

      if (error) throw error
      if (data?.error) throw new Error(data.error)

      toast({
        title: "Success",
        description: `Login credentials sent to ${user.email}`
      })
    } catch (error: any) {
      console.error('Error resending credentials:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to resend credentials",
        variant: "destructive"
      })
    } finally {
      setResendingCredentialsId(null)
    }
  }

  const handleAddProgram = () => {
    if (newProgramName.trim() && !programOptions.includes(newProgramName.trim())) {
      setProgramOptions([...programOptions, newProgramName.trim()])
      setNewProgramName('')
      toast({
        title: "Success",
        description: "Program added successfully"
      })
    }
  }

  const handleEditProgram = (index: number) => {
    setEditingProgramIndex(index)
    setEditingProgramValue(programOptions[index])
  }

  const handleSaveEditProgram = () => {
    if (editingProgramIndex !== null && editingProgramValue.trim()) {
      const updatedOptions = [...programOptions]
      updatedOptions[editingProgramIndex] = editingProgramValue.trim()
      setProgramOptions(updatedOptions)
      setEditingProgramIndex(null)
      setEditingProgramValue('')
      toast({
        title: "Success",
        description: "Program updated successfully"
      })
    }
  }

  const handleDeleteProgram = (index: number) => {
    const updatedOptions = programOptions.filter((_, i) => i !== index)
    setProgramOptions(updatedOptions)
    toast({
      title: "Success",
      description: "Program deleted successfully"
    })
  }

  const getRoleBadges = (user: UserProfile) => {
    const badges = []
    if (user.is_moderator) badges.push(
      <Badge key="owner" style={{ backgroundColor: '#ffb500', color: '#290a52', border: 'none' }}>
        <Crown className="h-3 w-3 mr-1" />
        Owner
      </Badge>
    )
    if (user.is_admin) badges.push(<Badge key="admin" variant="destructive">Admin</Badge>)
    if (user.membership_type === 'trustee') badges.push(
      <Badge key="trustee" style={{ backgroundColor: '#2eb2ff', color: '#290a52', border: 'none' }}>
        Trustee
      </Badge>
    )
    if (user.membership_type === 'family_member') badges.push(
      <Badge key="family" style={{ backgroundColor: '#ffb500', color: '#290a52', border: 'none' }}>
        Family Member
      </Badge>
    )
    if (badges.length === 0) badges.push(
      <Badge key="user" style={{ backgroundColor: '#2eb2ff', color: '#290a52', border: 'none' }}>
        Trustee
      </Badge>
    )
    return badges
  }

  const getPackageInfo = (user: UserProfile) => {
    if (!user.subscribed || !user.subscription_tier) {
      return { package: 'Free', amount: '$0' }
    }

    const tierMap: Record<string, { package: string; amount: string }> = {
      'basic': { package: 'Basic', amount: '$50/mo' },
      'premium': { package: 'Premium', amount: '$100/mo' },
      'enterprise': { package: 'Enterprise', amount: '$200/mo' }
    }

    return tierMap[user.subscription_tier] || { package: user.subscription_tier, amount: 'N/A' }
  }

  const getUserViewDescription = (user: UserProfile) => {
    if (user.is_moderator) {
      return "Owner access: Complete control over all platform features including admin management, system settings, and ownership activities. Can manage admins and access Zapier integration."
    }
    if (user.is_admin) {
      return "Full admin access: Can see all users, manage settings, send notifications, and access all features (excluding ownership activities)."
    }
    if (user.membership_type === 'trustee') {
      return "Trustee view: Access to family governance, documents, calendar, investment management, and family constitution features."
    }
    if (user.membership_type === 'family_member') {
      return "Family member view: Limited access to announcements, contacts, document requests, and basic family information."
    }
    return "Standard trustee view: Access to community features, courses, messages, and basic platform functionality."
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5" style={{ color: '#ffb500' }} />
            <CardTitle>All Users Management</CardTitle>
          </div>
          <CardDescription>
            View, edit, and manage all trustees and family members in the system
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, or program..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-md"
            />
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <div className="border rounded-lg">
              <ScrollArea className="h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Payment</TableHead>
                      <TableHead>Program</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                          No users found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredUsers.map((user) => {
                        const packageInfo = getPackageInfo(user)
                        return (
                        <TableRow key={user.user_id}>
                          <TableCell className="font-medium">
                            {user.display_name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'N/A'}
                          </TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>
                            <div className="flex gap-1 flex-wrap">
                              {getRoleBadges(user)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium">{packageInfo.package}</span>
                              <span className="text-xs text-muted-foreground">{packageInfo.amount}</span>
                            </div>
                          </TableCell>
                          <TableCell>{user.program_name || 'None'}</TableCell>
                          <TableCell>
                            {new Date(user.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setPreviewUser(user)}
                                title="Preview user view"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleResendCredentials(user)}
                                title="Resend login credentials"
                                disabled={resendingCredentialsId === user.user_id}
                              >
                                {resendingCredentialsId === user.user_id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Mail className="h-4 w-4" />
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setEditingUser(user)}
                                title="Edit user"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setDeletingUserId(user.user_id)}
                                title="Delete user"
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                        )
                      })
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>
          )}

          <div className="text-sm text-muted-foreground">
            Total users: {filteredUsers.length}
          </div>
        </CardContent>
      </Card>

      {/* Edit User Dialog */}
      <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user information and settings
            </DialogDescription>
          </DialogHeader>
          {editingUser && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-first-name">First Name</Label>
                  <Input
                    id="edit-first-name"
                    value={editingUser.first_name || ''}
                    onChange={(e) => setEditingUser({...editingUser, first_name: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-last-name">Last Name</Label>
                  <Input
                    id="edit-last-name"
                    value={editingUser.last_name || ''}
                    onChange={(e) => setEditingUser({...editingUser, last_name: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-display-name">Display Name</Label>
                <Input
                  id="edit-display-name"
                  value={editingUser.display_name || ''}
                  onChange={(e) => setEditingUser({...editingUser, display_name: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-email">Email (Read-only)</Label>
                <Input
                  id="edit-email"
                  value={editingUser.email}
                  disabled
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-phone">Phone</Label>
                <Input
                  id="edit-phone"
                  value={editingUser.phone || ''}
                  onChange={(e) => setEditingUser({...editingUser, phone: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-membership">Membership Type</Label>
                <Select
                  value={editingUser.membership_type || ''}
                  onValueChange={(value) => setEditingUser({...editingUser, membership_type: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select membership type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="trustee">Trustee</SelectItem>
                    <SelectItem value="family_member">Family Member</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-4 pt-4 border-t">
                <Label>User Roles</Label>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5 flex items-center gap-2">
                    <Crown className="h-4 w-4" style={{ color: '#ffb500' }} />
                    <div>
                      <Label htmlFor="is-owner">Owner Access</Label>
                      <p className="text-sm text-muted-foreground">Complete ownership control including admin management</p>
                    </div>
                  </div>
                  <Switch
                    id="is-owner"
                    checked={editingUser.is_moderator}
                    onCheckedChange={(checked) => setEditingUser({...editingUser, is_moderator: checked})}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="is-admin">Admin Access</Label>
                    <p className="text-sm text-muted-foreground">Full system access and user management (excluding ownership activities)</p>
                  </div>
                  <Switch
                    id="is-admin"
                    checked={editingUser.is_admin}
                    onCheckedChange={(checked) => setEditingUser({...editingUser, is_admin: checked})}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="edit-program">Program Name</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setManagingPrograms(true)}
                  >
                    Manage Programs
                  </Button>
                </div>
                <Select
                  value={editingUser.program_name || ''}
                  onValueChange={(value) => setEditingUser({...editingUser, program_name: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a program" />
                  </SelectTrigger>
                  <SelectContent>
                    {programOptions.map((program) => (
                      <SelectItem key={program} value={program}>
                        {program}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingUser(null)}>Cancel</Button>
            <Button onClick={handleUpdateUser}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview User View Dialog */}
      <Dialog open={!!previewUser} onOpenChange={(open) => !open && setPreviewUser(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCog className="h-5 w-5" />
              User View Preview
            </DialogTitle>
            <DialogDescription>
              What {previewUser?.display_name || previewUser?.first_name || 'this user'} sees
            </DialogDescription>
          </DialogHeader>
          {previewUser && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg space-y-3">
                <div>
                  <p className="text-sm font-medium">User Details:</p>
                  <p className="text-sm text-muted-foreground">
                    {previewUser.display_name || `${previewUser.first_name} ${previewUser.last_name}`}
                  </p>
                  <p className="text-sm text-muted-foreground">{previewUser.email}</p>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {getRoleBadges(previewUser)}
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-medium">Access Level:</h4>
                <p className="text-sm text-muted-foreground">
                  {getUserViewDescription(previewUser)}
                </p>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium">Available Features by Tab:</h4>
                
                {previewUser.is_admin ? (
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-medium mb-2">🏠 Dashboard</p>
                      <div className="flex flex-wrap gap-1 ml-4">
                        <Badge variant="secondary" className="text-xs">✓ Full Access</Badge>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium mb-2">🏛️ Family Office</p>
                      <div className="flex flex-wrap gap-1 ml-4">
                        <Badge variant="secondary" className="text-xs">✓ Full Access</Badge>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium mb-2">📜 Family Constitution</p>
                      <div className="flex flex-wrap gap-1 ml-4">
                        <Badge variant="secondary" className="text-xs">✓ Full Access</Badge>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium mb-2">📅 Calendar</p>
                      <div className="flex flex-wrap gap-1 ml-4">
                        <Badge variant="secondary" className="text-xs">✓ Full Access</Badge>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium mb-2">👥 Members</p>
                      <div className="flex flex-wrap gap-1 ml-4">
                        <Badge variant="secondary" className="text-xs">✓ Full Access</Badge>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium mb-2">⚙️ Admin Features</p>
                      <div className="flex flex-wrap gap-1 ml-4">
                        <Badge variant="secondary" className="text-xs">✓ User Management</Badge>
                        <Badge variant="secondary" className="text-xs">✓ Mass Notifications</Badge>
                        <Badge variant="secondary" className="text-xs">✓ System Settings</Badge>
                      </div>
                    </div>
                  </div>
                ) : previewUser.membership_type === 'trustee' ? (
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-medium mb-2">🏠 Dashboard</p>
                      <div className="flex flex-wrap gap-1 ml-4">
                        <Badge variant="secondary" className="text-xs">✓ Overview</Badge>
                        <Badge variant="secondary" className="text-xs">✓ Analytics</Badge>
                        <Badge variant="secondary" className="text-xs">✓ Quick Actions</Badge>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium mb-2">🏛️ Family Office</p>
                      <div className="flex flex-wrap gap-1 ml-4">
                        <Badge variant="secondary" className="text-xs">✓ Governance</Badge>
                        <Badge variant="secondary" className="text-xs">✓ Documents</Badge>
                        <Badge variant="secondary" className="text-xs">✓ Investments</Badge>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium mb-2">📜 Family Constitution</p>
                      <div className="flex flex-wrap gap-1 ml-4">
                        <Badge variant="secondary" className="text-xs">✓ Setup & Edit</Badge>
                        <Badge variant="secondary" className="text-xs">✓ View & Review</Badge>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium mb-2">📅 Calendar</p>
                      <div className="flex flex-wrap gap-1 ml-4">
                        <Badge variant="secondary" className="text-xs">✓ Meetings</Badge>
                        <Badge variant="secondary" className="text-xs">✓ Events</Badge>
                        <Badge variant="secondary" className="text-xs">✓ Scheduling</Badge>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium mb-2">👥 Members</p>
                      <div className="flex flex-wrap gap-1 ml-4">
                        <Badge variant="secondary" className="text-xs">✓ Family Directory</Badge>
                        <Badge variant="secondary" className="text-xs">✓ Scoreboard</Badge>
                      </div>
                    </div>
                  </div>
                ) : previewUser.membership_type === 'family_member' ? (
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-medium mb-2">🏠 Dashboard</p>
                      <div className="flex flex-wrap gap-1 ml-4">
                        <Badge variant="outline" className="text-xs">✓ View Only</Badge>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium mb-2">🏛️ Family Office</p>
                      <div className="flex flex-wrap gap-1 ml-4">
                        <Badge variant="outline" className="text-xs">✓ View Only</Badge>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium mb-2">📜 Family Constitution</p>
                      <div className="flex flex-wrap gap-1 ml-4">
                        <Badge variant="outline" className="text-xs">✓ View Only</Badge>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium mb-2">📅 Calendar</p>
                      <div className="flex flex-wrap gap-1 ml-4">
                        <Badge variant="outline" className="text-xs">✓ View Only</Badge>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium mb-2">👥 Members</p>
                      <div className="flex flex-wrap gap-1 ml-4">
                        <Badge variant="outline" className="text-xs">✓ View Only</Badge>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-medium mb-2">🏠 Dashboard</p>
                      <div className="flex flex-wrap gap-1 ml-4">
                        <Badge variant="secondary" className="text-xs">✓ Overview</Badge>
                        <Badge variant="secondary" className="text-xs">✓ Analytics</Badge>
                        <Badge variant="secondary" className="text-xs">✓ Quick Actions</Badge>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium mb-2">🏛️ Family Office</p>
                      <div className="flex flex-wrap gap-1 ml-4">
                        <Badge variant="secondary" className="text-xs">✓ Governance</Badge>
                        <Badge variant="secondary" className="text-xs">✓ Documents</Badge>
                        <Badge variant="secondary" className="text-xs">✓ Investments</Badge>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium mb-2">📜 Family Constitution</p>
                      <div className="flex flex-wrap gap-1 ml-4">
                        <Badge variant="secondary" className="text-xs">✓ Setup & Edit</Badge>
                        <Badge variant="secondary" className="text-xs">✓ View & Review</Badge>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium mb-2">📅 Calendar</p>
                      <div className="flex flex-wrap gap-1 ml-4">
                        <Badge variant="secondary" className="text-xs">✓ Meetings</Badge>
                        <Badge variant="secondary" className="text-xs">✓ Events</Badge>
                        <Badge variant="secondary" className="text-xs">✓ Scheduling</Badge>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium mb-2">👥 Members</p>
                      <div className="flex flex-wrap gap-1 ml-4">
                        <Badge variant="secondary" className="text-xs">✓ Family Directory</Badge>
                        <Badge variant="secondary" className="text-xs">✓ Scoreboard</Badge>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setPreviewUser(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingUserId} onOpenChange={(open) => !open && setDeletingUserId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this user and all their associated data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteUser} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Manage Programs Dialog */}
      <Dialog open={managingPrograms} onOpenChange={setManagingPrograms}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Manage Program Options</DialogTitle>
            <DialogDescription>
              Add, edit, or delete program options for the dropdown menu
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Add New Program */}
            <div className="flex gap-2">
              <Input
                placeholder="Enter new program name"
                value={newProgramName}
                onChange={(e) => setNewProgramName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddProgram()}
              />
              <Button onClick={handleAddProgram} size="sm">
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {/* Program List */}
            <ScrollArea className="h-[300px] border rounded-lg p-2">
              <div className="space-y-2">
                {programOptions.map((program, index) => (
                  <div key={index} className="flex items-center gap-2 p-2 rounded hover:bg-accent">
                    {editingProgramIndex === index ? (
                      <>
                        <Input
                          value={editingProgramValue}
                          onChange={(e) => setEditingProgramValue(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleSaveEditProgram()}
                          className="flex-1"
                        />
                        <Button onClick={handleSaveEditProgram} size="sm" variant="ghost">
                          Save
                        </Button>
                        <Button onClick={() => setEditingProgramIndex(null)} size="sm" variant="ghost">
                          <X className="h-4 w-4" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <span className="flex-1 text-sm">{program}</span>
                        <Button onClick={() => handleEditProgram(index)} size="sm" variant="ghost">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button 
                          onClick={() => handleDeleteProgram(index)} 
                          size="sm" 
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          <DialogFooter>
            <Button onClick={() => setManagingPrograms(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
