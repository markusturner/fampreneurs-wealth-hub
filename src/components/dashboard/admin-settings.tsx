import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/hooks/use-toast'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Shield, Users, UserCheck, Settings, Crown, Heart, Loader2 } from 'lucide-react'

interface UserRole {
  id: string
  user_id: string
  role: string
  assigned_at: string
  assigned_by: string
}

interface ProfileWithRoles {
  id: string
  user_id: string
  display_name: string | null
  first_name: string | null
  last_name: string | null
  avatar_url: string | null
  is_admin: boolean
  is_accountability_partner: boolean
  accountability_specialties: string[] | null
  admin_permissions: string[] | null
}

export function AdminSettings() {
  const { user, profile, refreshProfile } = useAuth()
  const { toast } = useToast()
  const [users, setUsers] = useState<ProfileWithRoles[]>([])
  const [loading, setLoading] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<ProfileWithRoles | null>(null)
  const [newSpecialty, setNewSpecialty] = useState('')
  const [specialties, setSpecialties] = useState<string[]>([])
  const [adminCode, setAdminCode] = useState('')
  const [isAdminLoading, setIsAdminLoading] = useState(false)

  // Don't render if user is not admin
  if (!profile?.is_admin) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">
            <Shield className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Admin access required to view this section.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('profiles')
        .select('id, user_id, display_name, first_name, last_name, avatar_url, is_admin, is_accountability_partner, accountability_specialties, admin_permissions')
        .order('display_name')

      if (error) throw error
      setUsers(data || [])
    } catch (error) {
      console.error('Error fetching users:', error)
      toast({
        title: "Error",
        description: "Failed to load users",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const assignAdminRole = async (targetUserId: string) => {
    try {
      const { error } = await supabase.rpc('assign_admin_role', {
        target_user_id: targetUserId,
        assigner_user_id: user?.id
      })

      if (error) throw error

      toast({
        title: "Success",
        description: "Admin role assigned successfully"
      })
      
      fetchUsers()
    } catch (error) {
      console.error('Error assigning admin role:', error)
      toast({
        title: "Error",
        description: "Failed to assign admin role",
        variant: "destructive"
      })
    }
  }

  const assignAccountabilityRole = async (targetUserId: string, specialties: string[]) => {
    try {
      const { error } = await supabase.rpc('assign_accountability_role', {
        target_user_id: targetUserId,
        assigner_user_id: user?.id,
        specialties: specialties.length > 0 ? specialties : ['general_support']
      })

      if (error) throw error

      toast({
        title: "Success",
        description: "Accountability partner role assigned successfully"
      })
      
      fetchUsers()
      setDialogOpen(false)
      setSpecialties([])
    } catch (error) {
      console.error('Error assigning accountability role:', error)
      toast({
        title: "Error",
        description: "Failed to assign accountability partner role",
        variant: "destructive"
      })
    }
  }

  const removeRole = async (targetUserId: string, role: 'admin' | 'accountability_partner') => {
    try {
      // Update profile
      const updateData = role === 'admin' 
        ? { is_admin: false, admin_permissions: null }
        : { is_accountability_partner: false, accountability_specialties: null }

      const { error: profileError } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('user_id', targetUserId)

      if (profileError) throw profileError

      // Remove from user_roles
      const { error: roleError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', targetUserId)
        .eq('role', role)

      if (roleError) throw roleError

      toast({
        title: "Success",
        description: `${role === 'admin' ? 'Admin' : 'Accountability partner'} role removed successfully`
      })
      
      fetchUsers()
    } catch (error) {
      console.error('Error removing role:', error)
      toast({
        title: "Error",
        description: "Failed to remove role",
        variant: "destructive"
      })
    }
  }

  const addSpecialty = () => {
    if (newSpecialty.trim() && !specialties.includes(newSpecialty.trim())) {
      setSpecialties([...specialties, newSpecialty.trim()])
      setNewSpecialty('')
    }
  }

  const removeSpecialty = (specialty: string) => {
    setSpecialties(specialties.filter(s => s !== specialty))
  }

  const openAccountabilityDialog = (user: ProfileWithRoles) => {
    setSelectedUser(user)
    setSpecialties(user.accountability_specialties || [])
    setDialogOpen(true)
  }

  const handleQuickAdminAccess = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsAdminLoading(true)

    try {
      // Check if the admin code is correct
      if (adminCode !== 'ADMIN2025') {
        toast({
          title: "Invalid admin code",
          description: "Please enter the correct admin access code.",
          variant: "destructive",
        })
        return
      }

      // Try to sign in with admin credentials first
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: 'admin@fampreneurs.com',
        password: 'Admin@2025!',
      })

      if (signInError && signInError.message.includes('Invalid login credentials')) {
        // If admin account doesn't exist, create it
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: 'admin@fampreneurs.com',
          password: 'Admin@2025!',
          options: {
            data: {
              first_name: 'Admin',
              last_name: 'User',
              display_name: 'Admin User',
              occupation: 'System Administrator',
            }
          }
        })

        if (signUpError) throw signUpError

        if (signUpData.user) {
          // Manually assign admin role via RPC
          await supabase.rpc('assign_admin_role', {
            target_user_id: signUpData.user.id,
            assigner_user_id: signUpData.user.id
          })

          toast({
            title: "Admin account created and activated",
            description: "Welcome to the admin panel!",
          })
          
          if (signUpData.session) {
            window.location.href = '/'
          }
        }
      } else if (signInError) {
        throw signInError
      } else if (signInData.user) {
        toast({
          title: "Admin access granted",
          description: "Welcome back, Administrator!",
        })
        window.location.href = '/'
      }
    } catch (error: any) {
      toast({
        title: "Admin access failed",
        description: error.message || "Please try again later.",
        variant: "destructive",
      })
    } finally {
      setIsAdminLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5" />
            Admin Panel
          </CardTitle>
          <CardDescription>
            Manage user roles and community permissions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Button onClick={fetchUsers} disabled={loading}>
              {loading ? "Loading..." : "Load Users"}
            </Button>

            {users.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-medium">Community Members</h3>
                {users.map((user) => (
                  <div key={user.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                        {user.display_name?.charAt(0) || user.first_name?.charAt(0) || '?'}
                      </div>
                      <div>
                        <p className="font-medium">
                          {user.display_name || `${user.first_name} ${user.last_name}`.trim() || 'Unknown User'}
                        </p>
                        <div className="flex gap-1 mt-1">
                          {user.is_admin && (
                            <Badge variant="destructive" className="text-xs">
                              <Crown className="h-3 w-3 mr-1" />
                              Admin
                            </Badge>
                          )}
                          {user.is_accountability_partner && (
                            <Badge variant="secondary" className="text-xs">
                              <Heart className="h-3 w-3 mr-1" />
                              Accountability Partner
                            </Badge>
                          )}
                          {!user.is_admin && !user.is_accountability_partner && (
                            <Badge variant="outline" className="text-xs">Member</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      {!user.is_admin && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              Make Admin
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Assign Admin Role</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to make {user.display_name || 'this user'} an admin? 
                                They will have full access to community management.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => assignAdminRole(user.user_id)}>
                                Assign Admin
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}

                      {!user.is_accountability_partner && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => openAccountabilityDialog(user)}
                        >
                          Make Accountability Partner
                        </Button>
                      )}

                      {user.is_admin && user.user_id !== profile?.user_id && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm">
                              Remove Admin
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Remove Admin Role</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to remove admin privileges from {user.display_name || 'this user'}?
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => removeRole(user.user_id, 'admin')}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Remove Admin
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}

                      {user.is_accountability_partner && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm">
                              Remove Accountability
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Remove Accountability Partner Role</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to remove accountability partner privileges from {user.display_name || 'this user'}?
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => removeRole(user.user_id, 'accountability_partner')}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Remove Role
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Quick Admin Access */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Quick Admin Access
          </CardTitle>
          <CardDescription>
            Create or access the default admin account using the admin code
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleQuickAdminAccess} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="admin-code">Admin Access Code</Label>
              <Input
                id="admin-code"
                type="password"
                placeholder="Enter admin access code"
                value={adminCode}
                onChange={(e) => setAdminCode(e.target.value)}
                required
                disabled={isAdminLoading}
              />
            </div>
            
            <Button 
              type="submit" 
              className="w-full"
              style={{ backgroundColor: '#ffb500', color: '#290a52' }}
              disabled={isAdminLoading}
            >
              {isAdminLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Quick Admin Access
            </Button>
          </form>
          
          <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mt-4">
            <div className="flex items-start space-x-3">
              <Shield className="h-5 w-5 text-red-500 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-red-800 dark:text-red-200">Security Notice</h4>
                <p className="text-xs text-red-700 dark:text-red-300 mt-1">
                  This will create or sign in to the default admin account. Only use this if you have the admin access code.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Accountability Partner Assignment Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Accountability Partner Role</DialogTitle>
            <DialogDescription>
              Set up {selectedUser?.display_name || 'this user'} as an accountability partner and define their specialties.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="specialty-input">Add Specialty</Label>
              <div className="flex gap-2">
                <Input
                  id="specialty-input"
                  value={newSpecialty}
                  onChange={(e) => setNewSpecialty(e.target.value)}
                  placeholder="e.g., Financial Planning, Fitness, Goals"
                  onKeyPress={(e) => e.key === 'Enter' && addSpecialty()}
                />
                <Button onClick={addSpecialty} variant="outline">
                  Add
                </Button>
              </div>
            </div>

            {specialties.length > 0 && (
              <div>
                <Label>Specialties</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {specialties.map((specialty) => (
                    <Badge key={specialty} variant="secondary" className="cursor-pointer" onClick={() => removeSpecialty(specialty)}>
                      {specialty} ×
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => setDialogOpen(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button 
                onClick={() => selectedUser && assignAccountabilityRole(selectedUser.user_id, specialties)}
                className="flex-1"
              >
                Assign Role
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}