import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/integrations/supabase/client'
import { Loader2, Users, Search, Pencil, Trash2, Eye, UserCog } from 'lucide-react'
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
}

export function AdminAllUsersManagement() {
  const [users, setUsers] = useState<UserProfile[]>([])
  const [filteredUsers, setFilteredUsers] = useState<UserProfile[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null)
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null)
  const [previewUser, setPreviewUser] = useState<UserProfile | null>(null)
  const { toast } = useToast()

  const fetchUsers = async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setUsers(data || [])
      setFilteredUsers(data || [])
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

    try {
      // Update profile fields
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          first_name: editingUser.first_name,
          last_name: editingUser.last_name,
          display_name: editingUser.display_name,
          phone: editingUser.phone,
          program_name: editingUser.program_name,
          membership_type: editingUser.membership_type,
        })
        .eq('user_id', editingUser.user_id)

      if (profileError) throw profileError

      // Update admin role
      if (editingUser.is_admin) {
        const { error: adminError } = await supabase.rpc('assign_admin_role', {
          target_user_id: editingUser.user_id,
          assigner_user_id: (await supabase.auth.getUser()).data.user?.id
        })
        if (adminError) console.error('Admin role error:', adminError)
      }

      // Update moderator role
      if (editingUser.is_moderator) {
        const { error: modError } = await supabase.rpc('assign_moderator_role', {
          target_user_id: editingUser.user_id,
          assigner_user_id: (await supabase.auth.getUser()).data.user?.id
        })
        if (modError) console.error('Moderator role error:', modError)
      }

      toast({
        title: "Success",
        description: "User updated successfully"
      })
      
      setEditingUser(null)
      fetchUsers()
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

  const getRoleBadges = (user: UserProfile) => {
    const badges = []
    if (user.is_admin) badges.push(<Badge key="admin" variant="destructive">Admin</Badge>)
    if (user.is_moderator) badges.push(<Badge key="mod" variant="secondary">Moderator</Badge>)
    if (user.membership_type === 'trustee') badges.push(<Badge key="trustee" variant="default">Trustee</Badge>)
    if (user.membership_type === 'family_member') badges.push(<Badge key="family" variant="outline">Family Member</Badge>)
    if (badges.length === 0) badges.push(<Badge key="user" variant="outline">Trustee</Badge>)
    return badges
  }

  const getUserViewDescription = (user: UserProfile) => {
    if (user.is_admin) {
      return "Full admin access: Can see all users, manage settings, send notifications, and access all features."
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
                      <TableHead>Program</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          No users found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredUsers.map((user) => (
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
                      ))
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
                  <div className="space-y-0.5">
                    <Label htmlFor="is-admin">Admin Access</Label>
                    <p className="text-sm text-muted-foreground">Full system access and user management</p>
                  </div>
                  <Switch
                    id="is-admin"
                    checked={editingUser.is_admin}
                    onCheckedChange={(checked) => setEditingUser({...editingUser, is_admin: checked})}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="is-moderator">Moderator Access</Label>
                    <p className="text-sm text-muted-foreground">Content moderation and community management</p>
                  </div>
                  <Switch
                    id="is-moderator"
                    checked={editingUser.is_moderator}
                    onCheckedChange={(checked) => setEditingUser({...editingUser, is_moderator: checked})}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-program">Program Name</Label>
                <Input
                  id="edit-program"
                  value={editingUser.program_name || ''}
                  onChange={(e) => setEditingUser({...editingUser, program_name: e.target.value})}
                  placeholder="e.g., The Family Business University"
                />
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
                    <div>
                      <p className="text-sm font-medium mb-2">⚙️ Admin Features</p>
                      <div className="flex flex-wrap gap-1 ml-4">
                        <Badge className="opacity-50 text-xs">✗ No Access</Badge>
                      </div>
                    </div>
                  </div>
                ) : previewUser.membership_type === 'family_member' ? (
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-medium mb-2">🏠 Dashboard</p>
                      <div className="flex flex-wrap gap-1 ml-4">
                        <Badge variant="outline" className="text-xs">✓ Announcements</Badge>
                        <Badge variant="outline" className="text-xs">✓ Quick Actions</Badge>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium mb-2">🏛️ Family Office</p>
                      <div className="flex flex-wrap gap-1 ml-4">
                        <Badge variant="outline" className="text-xs">✓ Document Requests</Badge>
                        <Badge variant="outline" className="text-xs">✓ Team Contacts</Badge>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium mb-2">📜 Family Constitution</p>
                      <div className="flex flex-wrap gap-1 ml-4">
                        <Badge className="opacity-50 text-xs">✗ Limited View</Badge>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium mb-2">📅 Calendar</p>
                      <div className="flex flex-wrap gap-1 ml-4">
                        <Badge className="opacity-50 text-xs">✗ Limited Access</Badge>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium mb-2">👥 Members</p>
                      <div className="flex flex-wrap gap-1 ml-4">
                        <Badge className="opacity-50 text-xs">✗ No Access</Badge>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium mb-2">⚙️ Admin Features</p>
                      <div className="flex flex-wrap gap-1 ml-4">
                        <Badge className="opacity-50 text-xs">✗ No Access</Badge>
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
                    <div>
                      <p className="text-sm font-medium mb-2">⚙️ Admin Features</p>
                      <div className="flex flex-wrap gap-1 ml-4">
                        <Badge className="opacity-50 text-xs">✗ No Access</Badge>
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
    </>
  )
}
