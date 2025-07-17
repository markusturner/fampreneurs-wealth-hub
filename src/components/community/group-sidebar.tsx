import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/integrations/supabase/client'
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { useToast } from '@/hooks/use-toast'
import { useSubscription } from '@/hooks/useSubscription'
import { Hash, Lock, Plus, Users, Settings, Trash2, MoreVertical, Crown, Star, BookOpen } from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface Group {
  id: string
  name: string
  description: string | null
  is_private: boolean
  is_premium: boolean
  created_by: string
  created_at: string
  member_count?: number
  unread_count?: number
  user_role?: string
  courses?: string[]
}

interface GroupSidebarProps {
  selectedGroupId: string | null
  onGroupSelect: (groupId: string) => void
}

export function GroupSidebar({ selectedGroupId, onGroupSelect }: GroupSidebarProps) {
  const { user, profile } = useAuth()
  const { toast } = useToast()
  const { subscriptionStatus, createCheckout } = useSubscription()
  const [publicGroups, setPublicGroups] = useState<Group[]>([])
  const [privateGroups, setPrivateGroups] = useState<Group[]>([])
  const [availableCourses, setAvailableCourses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingGroup, setEditingGroup] = useState<Group | null>(null)
  const [newGroupName, setNewGroupName] = useState('')
  const [editGroupName, setEditGroupName] = useState('')
  const [editGroupDescription, setEditGroupDescription] = useState('')
  const [editGroupPrivate, setEditGroupPrivate] = useState(false)
  const [editGroupPremium, setEditGroupPremium] = useState(false)
  const [editGroupCourses, setEditGroupCourses] = useState<string[]>([])
  const [newGroupDescription, setNewGroupDescription] = useState('')
  const [newGroupPrivate, setNewGroupPrivate] = useState(false)
  const [newGroupPremium, setNewGroupPremium] = useState(false)
  const [newGroupCourses, setNewGroupCourses] = useState<string[]>([])
  const [creating, setCreating] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  useEffect(() => {
    fetchGroups()
    fetchCourses()
    // Auto-join public groups for new users
    autoJoinPublicGroups()
  }, [user])

  const fetchGroups = async () => {
    try {
      // Fetch public groups
      const { data: publicData, error: publicError } = await supabase
        .from('community_groups')
        .select(`
          *,
          group_memberships!inner(user_id, role)
        `)
        .eq('is_private', false)
        .eq('group_memberships.user_id', user?.id)

      if (publicError) throw publicError

      // Fetch private groups
      const { data: privateData, error: privateError } = await supabase
        .from('community_groups')
        .select(`
          *,
          group_memberships!inner(user_id, role)
        `)
        .eq('is_private', true)
        .eq('group_memberships.user_id', user?.id)

      if (privateError) throw privateError

      // Add user role to group data
      const publicGroupsWithRole = (publicData || []).map(group => ({
        ...group,
        user_role: group.group_memberships?.[0]?.role
      }))
      
      const privateGroupsWithRole = (privateData || []).map(group => ({
        ...group,
        user_role: group.group_memberships?.[0]?.role
      }))

      setPublicGroups(publicGroupsWithRole)
      setPrivateGroups(privateGroupsWithRole)

      // Auto-select first group if none selected
      if (!selectedGroupId && publicGroupsWithRole && publicGroupsWithRole.length > 0) {
        onGroupSelect(publicGroupsWithRole[0].id)
      }
    } catch (error) {
      console.error('Error fetching groups:', error)
      toast({
        title: "Error",
        description: "Failed to load groups",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchCourses = async () => {
    try {
      const { data, error } = await supabase
        .from('courses')
        .select('id, title')
        .order('title')

      if (error) throw error
      setAvailableCourses(data || [])
    } catch (error) {
      console.error('Error fetching courses:', error)
    }
  }

  const fetchGroupCourses = async (groupId: string) => {
    try {
      const { data, error } = await supabase
        .from('group_courses')
        .select('course_id')
        .eq('group_id', groupId)

      if (error) throw error
      return data?.map(gc => gc.course_id) || []
    } catch (error) {
      console.error('Error fetching group courses:', error)
      return []
    }
  }

  const autoJoinPublicGroups = async () => {
    if (!user) return

    try {
      // Get all public groups
      const { data: publicGroups, error: groupsError } = await supabase
        .from('community_groups')
        .select('id, is_premium')
        .eq('is_private', false)

      if (groupsError) throw groupsError

      // Check which groups user is not a member of
      const { data: memberships, error: membershipError } = await supabase
        .from('group_memberships')
        .select('group_id')
        .eq('user_id', user.id)

      if (membershipError) throw membershipError

      const memberGroupIds = memberships?.map(m => m.group_id) || []
      const groupsToJoin = publicGroups?.filter(g => 
        !memberGroupIds.includes(g.id) && 
        (!g.is_premium || subscriptionStatus.subscribed)
      ) || []

      // Auto-join public groups
      if (groupsToJoin.length > 0) {
        const membershipInserts = groupsToJoin.map(group => ({
          group_id: group.id,
          user_id: user.id,
          role: 'member'
        }))

        const { error: insertError } = await supabase
          .from('group_memberships')
          .insert(membershipInserts)

        if (insertError) throw insertError
      }
    } catch (error) {
      console.error('Error auto-joining groups:', error)
    }
  }

  const startEditGroup = async (group: Group) => {
    setEditingGroup(group)
    setEditGroupName(group.name)
    setEditGroupDescription(group.description || '')
    setEditGroupPrivate(group.is_private)
    setEditGroupPremium(group.is_premium)
    
    // Fetch current group courses
    const groupCourses = await fetchGroupCourses(group.id)
    setEditGroupCourses(groupCourses)
    
    setEditDialogOpen(true)
  }

  const updateGroup = async () => {
    if (!editingGroup || !editGroupName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a group name",
        variant: "destructive"
      })
      return
    }

    setUpdating(true)
    try {
      // Update group details
      const { error: groupError } = await supabase
        .from('community_groups')
        .update({ 
          name: editGroupName.trim(),
          description: editGroupDescription.trim() || null,
          is_private: editGroupPrivate,
          is_premium: editGroupPremium
        })
        .eq('id', editingGroup.id)

      if (groupError) throw groupError

      // Update group courses
      // First delete existing courses
      const { error: deleteError } = await supabase
        .from('group_courses')
        .delete()
        .eq('group_id', editingGroup.id)

      if (deleteError) throw deleteError

      // Then insert new courses
      if (editGroupCourses.length > 0) {
        const courseInserts = editGroupCourses.map(courseId => ({
          group_id: editingGroup.id,
          course_id: courseId
        }))

        const { error: insertError } = await supabase
          .from('group_courses')
          .insert(courseInserts)

        if (insertError) throw insertError

        // Auto-enroll existing group members in new courses
        const { data: members, error: membersError } = await supabase
          .from('group_memberships')
          .select('user_id')
          .eq('group_id', editingGroup.id)

        if (membersError) throw membersError

        if (members && members.length > 0) {
          const enrollmentInserts = members.flatMap(member => 
            editGroupCourses.map(courseId => ({
              user_id: member.user_id,
              course_id: courseId
            }))
          )

          // Use upsert to avoid conflicts with existing enrollments
          const { error: enrollError } = await supabase
            .from('course_enrollments')
            .upsert(enrollmentInserts, { 
              onConflict: 'user_id,course_id',
              ignoreDuplicates: true 
            })

          if (enrollError) console.warn('Some enrollments may have failed:', enrollError)
        }
      }

      toast({
        title: "Success",
        description: `Group "${editGroupName}" updated successfully!`
      })

      // Reset form
      setEditGroupName('')
      setEditGroupDescription('')
      setEditGroupPrivate(false)
      setEditGroupPremium(false)
      setEditGroupCourses([])
      setEditingGroup(null)
      setEditDialogOpen(false)

      // Refresh groups
      fetchGroups()
    } catch (error) {
      console.error('Error updating group:', error)
      toast({
        title: "Error",
        description: "Failed to update group",
        variant: "destructive"
      })
    } finally {
      setUpdating(false)
    }
  }
  const deleteGroup = async (groupId: string, groupName: string) => {
    setDeleting(groupId)
    try {
      // First delete all group memberships
      const { error: membershipError } = await supabase
        .from('group_memberships')
        .delete()
        .eq('group_id', groupId)

      if (membershipError) throw membershipError

      // Then delete all group messages
      const { error: messagesError } = await supabase
        .from('group_messages')
        .delete()
        .eq('group_id', groupId)

      if (messagesError) throw messagesError

      // Finally delete the group
      const { error: groupError } = await supabase
        .from('community_groups')
        .delete()
        .eq('id', groupId)

      if (groupError) throw groupError

      toast({
        title: "Success",
        description: `Group "${groupName}" deleted successfully!`
      })

      // If deleted group was selected, clear selection
      if (selectedGroupId === groupId) {
        const remainingGroups = [...publicGroups, ...privateGroups].filter(g => g.id !== groupId)
        if (remainingGroups.length > 0) {
          onGroupSelect(remainingGroups[0].id)
        } else {
          onGroupSelect('')
        }
      }

      // Refresh groups
      fetchGroups()
    } catch (error) {
      console.error('Error deleting group:', error)
      toast({
        title: "Error",
        description: "Failed to delete group",
        variant: "destructive"
      })
    } finally {
      setDeleting(null)
    }
  }

  const createGroup = async () => {
    if (!newGroupName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a group name",
        variant: "destructive"
      })
      return
    }

    setCreating(true)
    try {
      // Create group
      const { data: groupData, error: groupError } = await supabase
        .from('community_groups')
        .insert({
          name: newGroupName.trim(),
          description: newGroupDescription.trim() || null,
          is_private: newGroupPrivate,
          is_premium: newGroupPremium,
          created_by: user?.id
        })
        .select()
        .single()

      if (groupError) throw groupError

      // Join the group as admin
      const { error: membershipError } = await supabase
        .from('group_memberships')
        .insert({
          group_id: groupData.id,
          user_id: user?.id,
          role: 'admin'
        })

      if (membershipError) throw membershipError

      // Add courses to group if selected
      if (newGroupCourses.length > 0) {
        const courseInserts = newGroupCourses.map(courseId => ({
          group_id: groupData.id,
          course_id: courseId
        }))

        const { error: coursesError } = await supabase
          .from('group_courses')
          .insert(courseInserts)

        if (coursesError) throw coursesError

        // Auto-enroll the creator in the courses
        const enrollmentInserts = newGroupCourses.map(courseId => ({
          user_id: user?.id,
          course_id: courseId
        }))

        const { error: enrollError } = await supabase
          .from('course_enrollments')
          .upsert(enrollmentInserts, { 
            onConflict: 'user_id,course_id',
            ignoreDuplicates: true 
          })

        if (enrollError) console.warn('Creator enrollment may have failed:', enrollError)
      }

      toast({
        title: "Success",
        description: `Group "${newGroupName}" created successfully!`
      })

      // Reset form
      setNewGroupName('')
      setNewGroupDescription('')
      setNewGroupPrivate(false)
      setNewGroupPremium(false)
      setNewGroupCourses([])
      setCreateDialogOpen(false)

      // Refresh groups
      fetchGroups()
      onGroupSelect(groupData.id)
    } catch (error) {
      console.error('Error creating group:', error)
      toast({
        title: "Error",
        description: "Failed to create group",
        variant: "destructive"
      })
    } finally {
      setCreating(false)
    }
  }


  const canDeleteGroup = (group: Group) => {
    // Only group creators, admins, or users with admin role in that specific group can delete
    return group.created_by === user?.id || 
           profile?.is_admin || 
           group.user_role === 'admin'
  }

  const handleJoinPremiumGroup = (groupId: string) => {
    toast({
      title: "Premium Required",
      description: "You need a premium subscription to join this group.",
      variant: "destructive",
    })
    createCheckout()
  }

  const GroupItem = ({ group }: { group: Group }) => (
    <div className="flex items-center gap-1">
      <Button
        variant={selectedGroupId === group.id ? "secondary" : "ghost"}
        className="flex-1 justify-start gap-2 h-auto py-2 px-3"
        onClick={() => {
          if (group.is_premium && !subscriptionStatus.subscribed) {
            handleJoinPremiumGroup(group.id)
            return
          }
          onGroupSelect(group.id)
        }}
      >
        {group.is_private ? (
          <Lock className="h-4 w-4 text-muted-foreground" />
        ) : (
          <Hash className="h-4 w-4 text-muted-foreground" />
        )}
        <span className="truncate">{group.name}</span>
        {group.is_premium && <Crown className="h-3 w-3 text-secondary ml-1" />}
        {group.unread_count && group.unread_count > 0 && (
          <Badge variant="destructive" className="ml-auto text-xs h-5 w-5 p-0 flex items-center justify-center">
            {group.unread_count}
          </Badge>
        )}
      </Button>
      
      {canDeleteGroup(group) && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
              <MoreVertical className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => startEditGroup(group)}
              className="cursor-pointer"
            >
              <Settings className="h-4 w-4 mr-2" />
              Edit Group
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive cursor-pointer"
                  onSelect={(e) => e.preventDefault()}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Group
                </DropdownMenuItem>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Group</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete "{group.name}"? This action cannot be undone.
                    All messages in this group will be permanently lost.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => deleteGroup(group.id, group.name)}
                    disabled={deleting === group.id}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {deleting === group.id ? "Deleting..." : "Delete"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  )

  if (loading) {
    return (
      <div className="w-64 border-r bg-muted/20 p-4">
        <div className="animate-pulse space-y-2">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-8 bg-muted rounded"></div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="w-64 border-r bg-muted/20 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b">
        <h2 className="font-semibold text-lg">Family Community</h2>
        <p className="text-sm text-muted-foreground">Stay connected</p>
        {subscriptionStatus.subscribed && (
          <div className="flex items-center gap-1 mt-1">
            <Star className="h-3 w-3 text-secondary" />
            <span className="text-xs text-secondary font-medium">Premium Active</span>
          </div>
        )}
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-4">
          {/* Public Groups */}
          <div>
            <div className="flex items-center justify-between px-2 mb-2">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Public Groups
              </h3>
              <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                    <Plus className="h-3 w-3" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Group</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="group-name">Group Name</Label>
                      <Input
                        id="group-name"
                        value={newGroupName}
                        onChange={(e) => setNewGroupName(e.target.value)}
                        placeholder="Enter group name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="group-description">Description (Optional)</Label>
                      <Textarea
                        id="group-description"
                        value={newGroupDescription}
                        onChange={(e) => setNewGroupDescription(e.target.value)}
                        placeholder="Describe what this group is for"
                        rows={3}
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="private-group"
                        checked={newGroupPrivate}
                        onCheckedChange={setNewGroupPrivate}
                        style={{
                          backgroundColor: newGroupPrivate ? '#ffb500' : undefined,
                        }}
                        className={newGroupPrivate ? '[&>span]:bg-white' : ''}
                      />
                      <Label htmlFor="private-group">Private Group</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="premium-group"
                        checked={newGroupPremium}
                        onCheckedChange={setNewGroupPremium}
                        style={{
                          backgroundColor: newGroupPremium ? '#ffb500' : undefined,
                        }}
                        className={newGroupPremium ? '[&>span]:bg-white' : ''}
                      />
                      <Label htmlFor="premium-group" className="flex items-center gap-2">
                        <Crown className="h-4 w-4 text-secondary" />
                        Premium Group (Requires subscription)
                      </Label>
                    </div>
                    <div>
                      <Label htmlFor="group-courses">Courses (Optional)</Label>
                      <Select onValueChange={(value) => {
                        if (value && !newGroupCourses.includes(value)) {
                          setNewGroupCourses([...newGroupCourses, value])
                        }
                      }}>
                        <SelectTrigger>
                          <SelectValue placeholder="Add courses to group" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableCourses
                            .filter(course => !newGroupCourses.includes(course.id))
                            .map(course => (
                            <SelectItem key={course.id} value={course.id}>
                              {course.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {newGroupCourses.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {newGroupCourses.map(courseId => {
                            const course = availableCourses.find(c => c.id === courseId)
                            return (
                              <Badge key={courseId} variant="secondary" className="text-xs">
                                <BookOpen className="h-3 w-3 mr-1" />
                                {course?.title}
                                <button
                                  onClick={() => setNewGroupCourses(newGroupCourses.filter(id => id !== courseId))}
                                  className="ml-1 hover:bg-destructive hover:text-destructive-foreground rounded-full w-3 h-3 flex items-center justify-center text-xs"
                                >
                                  ×
                                </button>
                              </Badge>
                            )
                          })}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => setCreateDialogOpen(false)}
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={createGroup}
                        disabled={creating}
                        className="flex-1"
                      >
                        {creating ? "Creating..." : "Create Group"}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            
            {/* Edit Group Dialog */}
            <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Edit Group</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="edit-group-name">Group Name</Label>
                    <Input
                      id="edit-group-name"
                      value={editGroupName}
                      onChange={(e) => setEditGroupName(e.target.value)}
                      placeholder="Enter group name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-group-description">Description (Optional)</Label>
                    <Textarea
                      id="edit-group-description"
                      value={editGroupDescription}
                      onChange={(e) => setEditGroupDescription(e.target.value)}
                      placeholder="Describe what this group is for"
                      rows={3}
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="edit-private-group"
                      checked={editGroupPrivate}
                      onCheckedChange={setEditGroupPrivate}
                      style={{
                        backgroundColor: editGroupPrivate ? '#ffb500' : undefined,
                      }}
                      className={editGroupPrivate ? '[&>span]:bg-white' : ''}
                    />
                    <Label htmlFor="edit-private-group">Private Group</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="edit-premium-group"
                      checked={editGroupPremium}
                      onCheckedChange={setEditGroupPremium}
                      style={{
                        backgroundColor: editGroupPremium ? '#ffb500' : undefined,
                      }}
                      className={editGroupPremium ? '[&>span]:bg-white' : ''}
                    />
                    <Label htmlFor="edit-premium-group" className="flex items-center gap-2">
                      <Crown className="h-4 w-4 text-secondary" />
                      Premium Group (Requires subscription)
                    </Label>
                  </div>
                  <div>
                    <Label htmlFor="edit-group-courses">Courses (Optional)</Label>
                    <Select onValueChange={(value) => {
                      if (value && !editGroupCourses.includes(value)) {
                        setEditGroupCourses([...editGroupCourses, value])
                      }
                    }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Add courses to group" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableCourses
                          .filter(course => !editGroupCourses.includes(course.id))
                          .map(course => (
                          <SelectItem key={course.id} value={course.id}>
                            {course.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {editGroupCourses.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {editGroupCourses.map(courseId => {
                          const course = availableCourses.find(c => c.id === courseId)
                          return (
                            <Badge key={courseId} variant="secondary" className="text-xs">
                              <BookOpen className="h-3 w-3 mr-1" />
                              {course?.title}
                              <button
                                onClick={() => setEditGroupCourses(editGroupCourses.filter(id => id !== courseId))}
                                className="ml-1 hover:bg-destructive hover:text-destructive-foreground rounded-full w-3 h-3 flex items-center justify-center text-xs"
                              >
                                ×
                              </button>
                            </Badge>
                          )
                        })}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setEditDialogOpen(false)}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={updateGroup}
                      disabled={updating}
                      className="flex-1"
                    >
                      {updating ? "Updating..." : "Update Group"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            
            <div className="space-y-1">
              {publicGroups.map(group => (
                <div key={group.id} className="group">
                  <GroupItem group={group} />
                </div>
              ))}
            </div>
          </div>

          {/* Private Groups */}
          {privateGroups.length > 0 && (
            <div>
              <div className="flex items-center px-2 mb-2">
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                  Private Groups
                </h3>
              </div>
              <div className="space-y-1">
                {privateGroups.map(group => (
                  <div key={group.id} className="group">
                    <GroupItem group={group} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* User Info */}
      <div className="p-4 border-t">
        <div className="flex items-center gap-2">
          <Avatar className="h-8 w-8">
            <AvatarImage src={user?.user_metadata?.avatar_url} />
            <AvatarFallback className="text-xs">
              {user?.email?.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              {user?.user_metadata?.display_name || user?.email}
            </p>
            <p className="text-xs text-muted-foreground">Online</p>
          </div>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}