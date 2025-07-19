import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/integrations/supabase/client'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import { Plus, Hash, Lock, Users, Edit, GripVertical, Trash2 } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import {
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

interface CommunityGroup {
  id: string
  name: string
  description: string | null
  is_private: boolean
  created_by: string
  member_count?: number
}

interface GroupChannelsSidebarProps {
  selectedGroupId: string | null
  onGroupSelect: (groupId: string | null) => void
}

export const GroupChannelsSidebar = ({ selectedGroupId, onGroupSelect }: GroupChannelsSidebarProps) => {
  const { user, profile } = useAuth()
  const { toast } = useToast()
  const [communityGroups, setCommunityGroups] = useState<CommunityGroup[]>([])
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [editingGroup, setEditingGroup] = useState<CommunityGroup | null>(null)
  const [newGroupName, setNewGroupName] = useState('')
  const [newGroupDescription, setNewGroupDescription] = useState('')
  const [isPrivateGroup, setIsPrivateGroup] = useState(false)
  const [isCreating, setIsCreating] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const fetchCommunityGroups = async () => {
    try {
      const { data: groupsData, error } = await supabase
        .from('community_groups')
        .select(`
          *,
          group_memberships!inner (
            user_id,
            role
          )
        `)
        .eq('group_memberships.user_id', user?.id)
        .order('created_at', { ascending: true })

      if (error) throw error

      // Get member counts for each group
      const groupsWithCounts = await Promise.all(
        (groupsData || []).map(async (group) => {
          const { count } = await supabase
            .from('group_memberships')
            .select('*', { count: 'exact' })
            .eq('group_id', group.id)

          return {
            ...group,
            member_count: count || 0
          }
        })
      )

      setCommunityGroups(groupsWithCounts)
    } catch (error) {
      console.error('Error fetching community groups:', error)
    }
  }

  const resetForm = () => {
    setNewGroupName('')
    setNewGroupDescription('')
    setIsPrivateGroup(false)
  }

  const handleEditGroup = (group: CommunityGroup) => {
    setEditingGroup(group)
    setNewGroupName(group.name)
    setNewGroupDescription(group.description || '')
    setIsPrivateGroup(group.is_private)
    setShowEditDialog(true)
  }

  const handleCreateGroup = async () => {
    if (!newGroupName.trim() || !user || !profile?.is_admin) {
      toast({
        title: "Error",
        description: "Only administrators can create community groups",
        variant: "destructive"
      })
      return
    }

    setIsCreating(true)
    try {
      const { data: groupData, error } = await supabase
        .from('community_groups')
        .insert({
          name: newGroupName.trim(),
          description: newGroupDescription.trim() || null,
          created_by: user.id,
          is_private: isPrivateGroup
        })
        .select()
        .single()

      if (error) throw error

      // Auto-join the creator to the group
      if (groupData) {
        await supabase
          .from('group_memberships')
          .insert({
            group_id: groupData.id,
            user_id: user.id,
            role: 'admin'
          })
      }

      resetForm()
      setShowCreateDialog(false)
      fetchCommunityGroups()
      
      // Set the new group as selected
      if (groupData) {
        onGroupSelect(groupData.id)
      }
      
      toast({
        title: "Success",
        description: "Community group created successfully!"
      })
    } catch (error) {
      console.error('Error creating group:', error)
      toast({
        title: "Error",
        description: "Failed to create community group",
        variant: "destructive"
      })
    } finally {
      setIsCreating(false)
    }
  }

  const handleJoinGroup = async (groupId: string) => {
    if (!user) return

    try {
      await supabase
        .from('group_memberships')
        .insert({
          group_id: groupId,
          user_id: user.id
        })

      toast({
        title: "Success",
        description: "Joined group successfully!"
      })

      fetchCommunityGroups()
    } catch (error) {
      console.error('Error joining group:', error)
      toast({
        title: "Error",
        description: "Failed to join group",
        variant: "destructive"
      })
    }
  }

  const handleDeleteGroup = async () => {
    if (!editingGroup || !user || !profile?.is_admin) {
      toast({
        title: "Error",
        description: "Only administrators can delete groups",
        variant: "destructive"
      })
      return
    }

    if (!confirm(`Are you sure you want to delete the group "${editingGroup.name}"? This action cannot be undone.`)) {
      return
    }

    setIsCreating(true)
    try {
      // First delete all group members
      await supabase
        .from('group_memberships')
        .delete()
        .eq('group_id', editingGroup.id)

      // Then delete the group
      await supabase
        .from('community_groups')
        .delete()
        .eq('id', editingGroup.id)

      resetForm()
      setShowEditDialog(false)
      setEditingGroup(null)
      fetchCommunityGroups()
      
      // If the deleted group was selected, switch to All Posts
      if (selectedGroupId === editingGroup.id) {
        onGroupSelect(null)
      }
      
      toast({
        title: "Success",
        description: `Group "${editingGroup.name}" has been deleted successfully!`
      })
    } catch (error) {
      console.error('Error deleting group:', error)
      toast({
        title: "Error",
        description: `Failed to delete group: ${error.message || 'Unknown error'}`,
        variant: "destructive"
      })
    } finally {
      setIsCreating(false)
    }
  }

  const handleUpdateGroup = async () => {
    if (!editingGroup || !newGroupName.trim() || !user || !profile?.is_admin) {
      toast({
        title: "Error", 
        description: "Only administrators can edit groups",
        variant: "destructive"
      })
      return
    }

    setIsCreating(true)
    try {
      const { error } = await supabase
        .from('community_groups')
        .update({
          name: newGroupName.trim(),
          description: newGroupDescription.trim() || null,
          is_private: isPrivateGroup
        })
        .eq('id', editingGroup.id)

      if (error) throw error

      resetForm()
      setShowEditDialog(false)
      setEditingGroup(null)
      fetchCommunityGroups()
      
      toast({
        title: "Success",
        description: "Group updated successfully!"
      })
    } catch (error) {
      console.error('Error updating group:', error)
      toast({
        title: "Error",
        description: "Failed to update group",
        variant: "destructive"
      })
    } finally {
      setIsCreating(false)
    }
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    if (!over || active.id === over.id || !profile?.is_admin) {
      return
    }

    const oldIndex = communityGroups.findIndex((group) => group.id === active.id)
    const newIndex = communityGroups.findIndex((group) => group.id === over.id)

    if (oldIndex !== -1 && newIndex !== -1) {
      const newGroups = arrayMove(communityGroups, oldIndex, newIndex)
      setCommunityGroups(newGroups)

      // Update order in database - we'll need to add an order_index field
      try {
        const updates = newGroups.map((group, index) => ({
          id: group.id,
          order_index: index
        }))

        for (const update of updates) {
          await supabase
            .from('community_groups')
            .update({ order_index: update.order_index } as any)
            .eq('id', update.id)
        }
      } catch (error) {
        console.error('Error updating group order:', error)
        // Revert optimistic update
        fetchCommunityGroups()
      }
    }
  }

  function SortableGroupItem({ group, selectedGroupId, onGroupSelect, onEditGroup, canEdit }: {
    group: CommunityGroup
    selectedGroupId: string | null
    onGroupSelect: (groupId: string) => void
    onEditGroup: (group: CommunityGroup) => void
    canEdit: boolean
  }) {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ id: group.id })

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
    }

    return (
      <div
        ref={setNodeRef}
        style={style}
        className={`
          flex items-center px-2 py-1.5 rounded cursor-pointer transition-colors text-sm
          ${selectedGroupId === group.id 
            ? 'bg-primary text-primary-foreground' 
            : 'hover:bg-muted/50'
          }
          ${isDragging ? 'opacity-50 z-50' : ''}
        `}
        onClick={() => onGroupSelect(group.id)}
      >
        {canEdit && (
          <div 
            {...attributes} 
            {...listeners}
            className="cursor-grab hover:cursor-grabbing mr-2 touch-manipulation"
            style={{ touchAction: 'manipulation' }}
          >
            <GripVertical className="h-3 w-3 text-muted-foreground" />
          </div>
        )}
        
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          {group.is_private ? (
            <Lock className="h-3 w-3 flex-shrink-0" />
          ) : (
            <Hash className="h-3 w-3 flex-shrink-0" />
          )}
          <span className="truncate font-medium">{group.name}</span>
          <span className="text-xs opacity-70 flex-shrink-0">
            ({group.member_count || 0})
          </span>
        </div>
        
        {canEdit && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
            onClick={(e) => {
              e.stopPropagation()
              onEditGroup(group)
            }}
          >
            <Edit className="h-3 w-3" />
          </Button>
        )}
      </div>
    )
  }

  useEffect(() => {
    fetchCommunityGroups()
  }, [user?.id])

  return (
    <Card className="w-full h-fit">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm">Community Groups</h3>
          {profile?.is_admin && (
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                  <Plus className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Community Group</DialogTitle>
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
                      placeholder="Enter group description"
                      rows={3}
                    />
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="private-group"
                      checked={isPrivateGroup}
                      onCheckedChange={setIsPrivateGroup}
                    />
                    <Label htmlFor="private-group" className="text-sm">
                      Private Group
                    </Label>
                  </div>
                  
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        resetForm()
                        setShowCreateDialog(false)
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleCreateGroup}
                      disabled={isCreating || !newGroupName.trim()}
                    >
                      {isCreating ? 'Creating...' : 'Create Group'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="space-y-1">
          {/* All Posts option */}
          <div
            className={`
              flex items-center px-2 py-1.5 rounded cursor-pointer transition-colors text-sm
              ${selectedGroupId === null 
                ? 'bg-primary text-primary-foreground' 
                : 'hover:bg-muted/50'
              }
            `}
            onClick={() => onGroupSelect(null)}
          >
            <Hash className="h-3 w-3 mr-1.5 flex-shrink-0" />
            <span className="truncate font-medium">All Posts</span>
          </div>

          {/* Community Groups */}
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={communityGroups} strategy={verticalListSortingStrategy}>
              <div className="space-y-1">
                {communityGroups.map((group) => (
                  <SortableGroupItem
                    key={group.id}
                    group={group}
                    selectedGroupId={selectedGroupId}
                    onGroupSelect={onGroupSelect}
                    onEditGroup={handleEditGroup}
                    canEdit={profile?.is_admin || false}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
          
          {communityGroups.length === 0 && (
            <div className="text-center py-4 text-muted-foreground text-sm">
              <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No community groups yet</p>
              {profile?.is_admin && (
                <p className="text-xs mt-1">Create one to get started!</p>
              )}
            </div>
          )}
        </div>
      </CardContent>

      {/* Edit Group Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Community Group</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-group-name">Group Name</Label>
              <Input
                id="edit-group-name"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="Enter group name"
              />
            </div>
            <div>
              <Label htmlFor="edit-group-description">Description (Optional)</Label>
              <Textarea
                id="edit-group-description"
                value={newGroupDescription}
                onChange={(e) => setNewGroupDescription(e.target.value)}
                placeholder="Enter group description"
                rows={3}
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                id="edit-private-group"
                checked={isPrivateGroup}
                onCheckedChange={setIsPrivateGroup}
              />
              <Label htmlFor="edit-private-group" className="text-sm">
                Private Group
              </Label>
            </div>
            
            <div className="flex justify-between">
              <Button
                variant="destructive"
                onClick={handleDeleteGroup}
                disabled={isCreating}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Group
              </Button>
              
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    resetForm()
                    setShowEditDialog(false)
                    setEditingGroup(null)
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleUpdateGroup}
                  disabled={isCreating || !newGroupName.trim()}
                >
                  {isCreating ? 'Updating...' : 'Update Group'}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  )
}