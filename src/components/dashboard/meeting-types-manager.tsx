import { useState, useEffect } from "react"
import { Plus, Edit, Trash2, Settings, Save, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/integrations/supabase/client"

interface MeetingType {
  id: string
  name: string
  color: string
  description: string | null
  is_active: boolean
  created_by: string
  created_at: string
  updated_at: string
}

interface MeetingTypesManagerProps {
  onMeetingTypesChange?: () => void
}

export function MeetingTypesManager({ onMeetingTypesChange }: MeetingTypesManagerProps) {
  const { toast } = useToast()
  const [meetingTypes, setMeetingTypes] = useState<MeetingType[]>([])
  const [loading, setLoading] = useState(true)
  const [isManageDialogOpen, setIsManageDialogOpen] = useState(false)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [editingType, setEditingType] = useState<MeetingType | null>(null)
  const [newType, setNewType] = useState({
    name: '',
    color: '#3b82f6',
    description: ''
  })

  useEffect(() => {
    fetchMeetingTypes()
  }, [])

  const fetchMeetingTypes = async () => {
    try {
      const { data, error } = await supabase
        .from('meeting_types')
        .select('*')
        .order('name', { ascending: true })

      if (error) throw error
      setMeetingTypes(data || [])
    } catch (error) {
      console.error('Error fetching meeting types:', error)
      toast({
        title: "Error",
        description: "Failed to fetch meeting types",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCreateType = async () => {
    if (!newType.name.trim()) {
      toast({
        title: "Error",
        description: "Please enter a meeting type name",
        variant: "destructive"
      })
      return
    }

    try {
      const { error } = await supabase
        .from('meeting_types')
        .insert({
          name: newType.name.trim(),
          color: newType.color,
          description: newType.description.trim() || null
        })

      if (error) throw error

      toast({
        title: "Success",
        description: "Meeting type created successfully"
      })

      setNewType({ name: '', color: '#3b82f6', description: '' })
      setIsCreateDialogOpen(false)
      fetchMeetingTypes()
      onMeetingTypesChange?.()
    } catch (error: any) {
      console.error('Error creating meeting type:', error)
      toast({
        title: "Error",
        description: error.message?.includes('unique') 
          ? "A meeting type with this name already exists"
          : "Failed to create meeting type",
        variant: "destructive"
      })
    }
  }

  const handleUpdateType = async (id: string, updates: Partial<MeetingType>) => {
    try {
      const { error } = await supabase
        .from('meeting_types')
        .update(updates)
        .eq('id', id)

      if (error) throw error

      toast({
        title: "Success",
        description: "Meeting type updated successfully"
      })

      setEditingType(null)
      fetchMeetingTypes()
      onMeetingTypesChange?.()
    } catch (error: any) {
      console.error('Error updating meeting type:', error)
      toast({
        title: "Error",
        description: error.message?.includes('unique') 
          ? "A meeting type with this name already exists"
          : "Failed to update meeting type",
        variant: "destructive"
      })
    }
  }

  const handleToggleActive = async (id: string, isActive: boolean) => {
    await handleUpdateType(id, { is_active: !isActive })
  }

  const handleDeleteType = async (id: string) => {
    if (!confirm("Are you sure you want to delete this meeting type? This action cannot be undone.")) {
      return
    }

    try {
      const { error } = await supabase
        .from('meeting_types')
        .delete()
        .eq('id', id)

      if (error) throw error

      toast({
        title: "Success",
        description: "Meeting type deleted successfully"
      })

      fetchMeetingTypes()
      onMeetingTypesChange?.()
    } catch (error) {
      console.error('Error deleting meeting type:', error)
      toast({
        title: "Error",
        description: "Failed to delete meeting type",
        variant: "destructive"
      })
    }
  }

  const colorOptions = [
    '#3b82f6', '#8b5cf6', '#ef4444', '#22c55e', '#f97316',
    '#6366f1', '#eab308', '#ec4899', '#6b7280', '#10b981',
    '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#84cc16'
  ]

  return (
    <Dialog open={isManageDialogOpen} onOpenChange={setIsManageDialogOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center gap-2">
          <Settings className="h-4 w-4" />
          Manage Types
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Manage Meeting Types</DialogTitle>
          <DialogDescription>
            Add, edit, or remove meeting types for your calendar
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Add New Type Button */}
          <div className="flex justify-end">
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Add New Type
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[400px]">
                <DialogHeader>
                  <DialogTitle>Create Meeting Type</DialogTitle>
                  <DialogDescription>
                    Add a new meeting type for your calendar
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  <div className="grid gap-2">
                    <Label htmlFor="new-name">Name *</Label>
                    <Input
                      id="new-name"
                      value={newType.name}
                      onChange={(e) => setNewType(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Enter meeting type name"
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="new-color">Color</Label>
                    <div className="flex flex-wrap gap-2">
                      {colorOptions.map(color => (
                        <button
                          key={color}
                          type="button"
                          className={`w-8 h-8 rounded border-2 ${
                            newType.color === color ? 'border-foreground' : 'border-border'
                          }`}
                          style={{ backgroundColor: color }}
                          onClick={() => setNewType(prev => ({ ...prev, color }))}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="new-description">Description</Label>
                    <Textarea
                      id="new-description"
                      value={newType.description}
                      onChange={(e) => setNewType(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Optional description"
                      rows={2}
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateType}>
                    Create Type
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Meeting Types List */}
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {loading ? (
              <div className="text-center text-muted-foreground">Loading...</div>
            ) : meetingTypes.length === 0 ? (
              <div className="text-center text-muted-foreground">No meeting types found</div>
            ) : (
              meetingTypes.map((type) => (
                <div
                  key={type.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div
                      className="w-4 h-4 rounded"
                      style={{ backgroundColor: type.color }}
                    />
                    <div className="flex-1 min-w-0">
                      {editingType?.id === type.id ? (
                        <div className="space-y-2">
                          <Input
                            value={editingType.name}
                            onChange={(e) => setEditingType(prev => 
                              prev ? { ...prev, name: e.target.value } : null
                            )}
                            className="h-8"
                          />
                          <div className="flex flex-wrap gap-1">
                            {colorOptions.map(color => (
                              <button
                                key={color}
                                type="button"
                                className={`w-6 h-6 rounded border ${
                                  editingType.color === color ? 'border-foreground border-2' : 'border-border'
                                }`}
                                style={{ backgroundColor: color }}
                                onClick={() => setEditingType(prev => 
                                  prev ? { ...prev, color } : null
                                )}
                              />
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div className="font-medium">{type.name}</div>
                          {type.description && (
                            <div className="text-sm text-muted-foreground">{type.description}</div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {editingType?.id === type.id ? (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleUpdateType(type.id, {
                            name: editingType.name.trim(),
                            color: editingType.color,
                            description: editingType.description?.trim() || null
                          })}
                        >
                          <Save className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingType(null)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingType({ ...type })}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleActive(type.id, type.is_active)}
                          className={type.is_active ? "text-green-600" : "text-red-600"}
                        >
                          {type.is_active ? "Active" : "Inactive"}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteType(type.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="flex justify-end">
          <Button variant="outline" onClick={() => setIsManageDialogOpen(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}