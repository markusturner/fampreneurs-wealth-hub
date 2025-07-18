import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Plus, Edit, Trash2, GripVertical, List, Kanban } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/integrations/supabase/client'
import { DndContext, DragEndEvent, closestCenter, useSensor, useSensors, MouseSensor, TouchSensor } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable'

interface FulfillmentStage {
  id: string
  name: string
  description: string | null
  stage_order: number
  color: string | null
  created_by: string
  created_at: string
}

interface StageManagementProps {
  stages: FulfillmentStage[]
  onStagesUpdated: () => void
  viewMode: 'kanban' | 'list'
  onViewModeChange: (mode: 'kanban' | 'list') => void
}

function SortableStage({ stage, onEdit, onDelete }: { 
  stage: FulfillmentStage
  onEdit: (stage: FulfillmentStage) => void
  onDelete: (id: string) => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: stage.id })

  const style = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`p-4 bg-card border rounded-lg ${isDragging ? 'opacity-50' : ''}`}
      {...attributes}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div {...listeners} className="cursor-grab hover:cursor-grabbing">
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </div>
          <div 
            className="w-4 h-4 rounded-full" 
            style={{ backgroundColor: stage.color || '#3b82f6' }}
          />
          <div>
            <div className="font-medium">{stage.name}</div>
            <div className="text-sm text-muted-foreground">
              {stage.description || 'No description'}
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline">Order: {stage.stage_order}</Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEdit(stage)}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => onDelete(stage.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}

export function StageManagement({ stages, onStagesUpdated, viewMode, onViewModeChange }: StageManagementProps) {
  const { toast } = useToast()
  const [editingStage, setEditingStage] = useState<FulfillmentStage | null>(null)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [newStage, setNewStage] = useState({
    name: '',
    description: '',
    color: '#3b82f6'
  })

  const sensors = useSensors(
    useSensor(MouseSensor),
    useSensor(TouchSensor)
  )

  const handleCreateStage = async () => {
    try {
      const { error } = await supabase
        .from('fulfillment_stages')
        .insert({
          name: newStage.name,
          description: newStage.description,
          color: newStage.color,
          stage_order: stages.length,
          created_by: (await supabase.auth.getUser()).data.user?.id
        })

      if (error) throw error

      toast({
        title: "Stage created",
        description: "New fulfillment stage has been created successfully.",
      })

      setNewStage({ name: '', description: '', color: '#3b82f6' })
      setCreateDialogOpen(false)
      onStagesUpdated()
    } catch (error: any) {
      toast({
        title: "Error creating stage",
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
        description: "Fulfillment stage has been updated successfully.",
      })

      setEditDialogOpen(false)
      setEditingStage(null)
      onStagesUpdated()
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
        description: "Fulfillment stage has been deleted successfully.",
      })

      onStagesUpdated()
    } catch (error: any) {
      toast({
        title: "Error deleting stage",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    if (!over || active.id === over.id) return

    const activeStage = stages.find(s => s.id === active.id)
    const overStage = stages.find(s => s.id === over.id)

    if (!activeStage || !overStage) return

    try {
      // Update stage orders
      const updates = stages.map((stage, index) => {
        if (stage.id === activeStage.id) {
          return { id: stage.id, stage_order: overStage.stage_order }
        }
        if (stage.id === overStage.id) {
          return { id: stage.id, stage_order: activeStage.stage_order }
        }
        return { id: stage.id, stage_order: stage.stage_order }
      })

      for (const update of updates) {
        await supabase
          .from('fulfillment_stages')
          .update({ stage_order: update.stage_order })
          .eq('id', update.id)
      }

      toast({
        title: "Stages reordered",
        description: "Stage order has been updated successfully.",
      })

      onStagesUpdated()
    } catch (error: any) {
      toast({
        title: "Error reordering stages",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Fulfillment Stages Management</CardTitle>
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
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Stage
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Stage</DialogTitle>
                  <DialogDescription>
                    Add a new fulfillment stage to your pipeline.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="stage-name">Stage Name</Label>
                    <Input
                      id="stage-name"
                      value={newStage.name}
                      onChange={(e) => setNewStage({ ...newStage, name: e.target.value })}
                      placeholder="Enter stage name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="stage-description">Description</Label>
                    <Textarea
                      id="stage-description"
                      value={newStage.description}
                      onChange={(e) => setNewStage({ ...newStage, description: e.target.value })}
                      placeholder="Enter stage description"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="stage-color">Color</Label>
                    <Input
                      id="stage-color"
                      type="color"
                      value={newStage.color}
                      onChange={(e) => setNewStage({ ...newStage, color: e.target.value })}
                    />
                  </div>
                  <Button onClick={handleCreateStage} className="w-full">
                    Create Stage
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={stages.map(s => s.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-3">
              {stages.map((stage) => (
                <SortableStage
                  key={stage.id}
                  stage={stage}
                  onEdit={(stage) => {
                    setEditingStage(stage)
                    setEditDialogOpen(true)
                  }}
                  onDelete={handleDeleteStage}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>

        {/* Edit Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Stage</DialogTitle>
              <DialogDescription>
                Update the fulfillment stage details.
              </DialogDescription>
            </DialogHeader>
            {editingStage && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-stage-name">Stage Name</Label>
                  <Input
                    id="edit-stage-name"
                    value={editingStage.name}
                    onChange={(e) => setEditingStage({ ...editingStage, name: e.target.value })}
                    placeholder="Enter stage name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-stage-description">Description</Label>
                  <Textarea
                    id="edit-stage-description"
                    value={editingStage.description || ''}
                    onChange={(e) => setEditingStage({ ...editingStage, description: e.target.value })}
                    placeholder="Enter stage description"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-stage-color">Color</Label>
                  <Input
                    id="edit-stage-color"
                    type="color"
                    value={editingStage.color || '#3b82f6'}
                    onChange={(e) => setEditingStage({ ...editingStage, color: e.target.value })}
                  />
                </div>
                <Button onClick={handleEditStage} className="w-full">
                  Update Stage
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}