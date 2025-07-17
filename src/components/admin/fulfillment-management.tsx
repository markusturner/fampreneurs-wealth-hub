import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
// Drag and drop functionality to be implemented later
import { Kanban, List, Plus, Edit, Trash2, GripVertical } from 'lucide-react'

interface FulfillmentStage {
  id: string
  name: string
  description: string | null
  color: string
  stage_order: number
}

interface UserProgress {
  id: string
  user_id: string
  stage_id: string
  moved_to_stage_at: string
  notes: string | null
  profiles?: {
    display_name: string | null
    first_name: string | null
    last_name: string | null
  }
}

interface FulfillmentManagementProps {
  viewMode: 'kanban' | 'list'
  onViewModeChange: (mode: 'kanban' | 'list') => void
}

function StageItem({ stage, onEdit, onDelete }: { stage: FulfillmentStage, onEdit: (stage: FulfillmentStage) => void, onDelete: (id: string) => void }) {
  return (
    <div className="flex items-center justify-between p-3 border rounded-lg bg-card">
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-3">
          <div
            className="w-4 h-4 rounded"
            style={{ backgroundColor: stage.color }}
          />
          <div>
            <p className="font-medium">{stage.name}</p>
            {stage.description && (
              <p className="text-sm text-muted-foreground">{stage.description}</p>
            )}
          </div>
        </div>
      </div>
      <div className="flex space-x-2">
        <Button variant="outline" size="sm" onClick={() => onEdit(stage)}>
          <Edit className="h-4 w-4" />
        </Button>
        <Button variant="destructive" size="sm" onClick={() => onDelete(stage.id)}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

export function FulfillmentManagement({ viewMode, onViewModeChange }: FulfillmentManagementProps) {
  const [stages, setStages] = useState<FulfillmentStage[]>([])
  const [userProgress, setUserProgress] = useState<UserProgress[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddStage, setShowAddStage] = useState(false)
  const [editingStage, setEditingStage] = useState<FulfillmentStage | null>(null)
  const [newStage, setNewStage] = useState({
    name: '',
    description: '',
    color: '#3b82f6'
  })
  const { toast } = useToast()
  const { user } = useAuth()

  useEffect(() => {
    loadFulfillmentData()
  }, [])

  const loadFulfillmentData = async () => {
    try {
      setLoading(true)
      
      // Load stages
      const { data: stagesData, error: stagesError } = await supabase
        .from('fulfillment_stages')
        .select('*')
        .order('stage_order')

      if (stagesError) throw stagesError
      setStages(stagesData || [])

      // Load user progress with profiles
      const { data: progressData, error: progressError } = await supabase
        .from('user_fulfillment_progress')
        .select('*')

      if (progressError) throw progressError

      // Load profiles for users
      const progressWithProfiles = await Promise.all(
        (progressData || []).map(async (progress) => {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('display_name, first_name, last_name')
            .eq('user_id', progress.user_id)
            .single()
          
          return {
            ...progress,
            profiles: profileData
          }
        })
      )

      setUserProgress(progressWithProfiles)

    } catch (error: any) {
      toast({
        title: "Error loading fulfillment data",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleAddStage = async () => {
    if (!user || !newStage.name.trim()) return

    try {
      const maxOrder = Math.max(...stages.map(s => s.stage_order), -1)
      
      const { error } = await supabase
        .from('fulfillment_stages')
        .insert({
          ...newStage,
          stage_order: maxOrder + 1,
          created_by: user.id
        })

      if (error) throw error

      toast({
        title: "Stage added",
        description: "New fulfillment stage has been created.",
      })

      setNewStage({ name: '', description: '', color: '#3b82f6' })
      setShowAddStage(false)
      loadFulfillmentData()
    } catch (error: any) {
      toast({
        title: "Error adding stage",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  const handleEditStage = async () => {
    if (!editingStage) return

    try {
      const { error } = await supabase
        .from('fulfillment_stages')
        .update({
          name: editingStage.name,
          description: editingStage.description,
          color: editingStage.color
        })
        .eq('id', editingStage.id)

      if (error) throw error

      toast({
        title: "Stage updated",
        description: "Fulfillment stage has been updated.",
      })

      setEditingStage(null)
      loadFulfillmentData()
    } catch (error: any) {
      toast({
        title: "Error updating stage",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  const handleDeleteStage = async (stageId: string) => {
    try {
      const { error } = await supabase
        .from('fulfillment_stages')
        .delete()
        .eq('id', stageId)

      if (error) throw error

      toast({
        title: "Stage deleted",
        description: "Fulfillment stage has been deleted.",
      })

      loadFulfillmentData()
    } catch (error: any) {
      toast({
        title: "Error deleting stage",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  const getUsersInStage = (stageId: string) => {
    return userProgress.filter(progress => progress.stage_id === stageId)
  }

  if (loading) {
    return <div>Loading fulfillment data...</div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Fulfillment Management</h3>
          <p className="text-sm text-muted-foreground">
            Track user progress through your program stages
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant={viewMode === 'kanban' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onViewModeChange('kanban')}
          >
            <Kanban className="h-4 w-4 mr-2" />
            Kanban
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onViewModeChange('list')}
          >
            <List className="h-4 w-4 mr-2" />
            List
          </Button>
          <Button onClick={() => setShowAddStage(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Stage
          </Button>
        </div>
      </div>

      {/* View Content */}
      {viewMode === 'kanban' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {stages.map(stage => (
            <Card key={stage.id} className="min-h-[300px]">
              <CardHeader className="pb-2">
                <div className="flex items-center space-x-2">
                  <div
                    className="w-3 h-3 rounded"
                    style={{ backgroundColor: stage.color }}
                  />
                  <CardTitle className="text-sm">{stage.name}</CardTitle>
                </div>
                {stage.description && (
                  <CardDescription className="text-xs">
                    {stage.description}
                  </CardDescription>
                )}
                <Badge variant="secondary" className="w-fit">
                  {getUsersInStage(stage.id).length} users
                </Badge>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {getUsersInStage(stage.id).map(progress => (
                    <div key={progress.id} className="p-2 bg-muted rounded text-xs">
                      {progress.profiles?.display_name ||
                       `${progress.profiles?.first_name} ${progress.profiles?.last_name}` ||
                       'Unknown User'}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Stage Management</CardTitle>
            <CardDescription>
              Reorder stages and manage the fulfillment pipeline
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stages.map(stage => (
                <StageItem
                  key={stage.id}
                  stage={stage}
                  onEdit={setEditingStage}
                  onDelete={handleDeleteStage}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add Stage Dialog */}
      {showAddStage && (
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="text-sm">Add New Stage</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Stage Name</Label>
                <Input
                  value={newStage.name}
                  onChange={(e) => setNewStage(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter stage name"
                />
              </div>
              <div className="space-y-2">
                <Label>Color</Label>
                <Input
                  type="color"
                  value={newStage.color}
                  onChange={(e) => setNewStage(prev => ({ ...prev, color: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={newStage.description}
                onChange={(e) => setNewStage(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe this stage..."
                rows={2}
              />
            </div>
            <div className="flex space-x-2">
              <Button onClick={handleAddStage}>Add Stage</Button>
              <Button variant="outline" onClick={() => setShowAddStage(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit Stage Dialog */}
      {editingStage && (
        <Card className="border-primary">
          <CardHeader>
            <CardTitle className="text-sm">Edit Stage</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Stage Name</Label>
                <Input
                  value={editingStage.name}
                  onChange={(e) => setEditingStage(prev => prev ? ({ ...prev, name: e.target.value }) : null)}
                />
              </div>
              <div className="space-y-2">
                <Label>Color</Label>
                <Input
                  type="color"
                  value={editingStage.color}
                  onChange={(e) => setEditingStage(prev => prev ? ({ ...prev, color: e.target.value }) : null)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={editingStage.description || ''}
                onChange={(e) => setEditingStage(prev => prev ? ({ ...prev, description: e.target.value }) : null)}
                rows={2}
              />
            </div>
            <div className="flex space-x-2">
              <Button onClick={handleEditStage}>Update Stage</Button>
              <Button variant="outline" onClick={() => setEditingStage(null)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}