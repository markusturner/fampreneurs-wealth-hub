import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/integrations/supabase/client'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useToast } from '@/hooks/use-toast'
import { Plus, Check, MoreVertical, Edit, Trash2 } from 'lucide-react'

interface Category {
  id: string
  name: string
}

interface CategorySelectorProps {
  value: string
  onValueChange: (value: string) => void
  type: 'course' | 'video'
  label?: string
  placeholder?: string
  required?: boolean
}

export function CategorySelector({ 
  value, 
  onValueChange, 
  type, 
  label = "Category",
  placeholder = "Select category",
  required = false 
}: CategorySelectorProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [categories, setCategories] = useState<Category[]>([])
  const [isCreating, setIsCreating] = useState(false)
  const [newCategory, setNewCategory] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [editCategoryName, setEditCategoryName] = useState('')

  useEffect(() => {
    fetchCategories()
  }, [type])

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name')
        .eq('type', type)
        .order('name')

      if (error) throw error

      setCategories(data || [])
    } catch (error) {
      console.error('Error fetching categories:', error)
    }
  }

  const createCategory = async () => {
    if (!newCategory.trim()) return

    setIsLoading(true)
    try {
      const { error } = await supabase
        .from('categories')
        .insert({
          name: newCategory.trim(),
          type,
          created_by: user?.id
        })

      if (error) {
        if (error.code === '23505') { // Unique constraint violation
          toast({
            title: "Category exists",
            description: "This category already exists.",
            variant: "destructive"
          })
          return
        }
        throw error
      }

      toast({
        title: "Success",
        description: "Category created successfully!"
      })

      // Update categories and select the new one
      await fetchCategories()
      onValueChange(newCategory.trim())
      setNewCategory('')
      setIsCreating(false)

    } catch (error) {
      console.error('Error creating category:', error)
      toast({
        title: "Error",
        description: "Failed to create category. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const updateCategory = async () => {
    if (!editCategoryName.trim() || !editingCategory) return

    setIsLoading(true)
    try {
      const { error } = await supabase
        .from('categories')
        .update({ name: editCategoryName.trim() })
        .eq('id', editingCategory.id)

      if (error) throw error

      toast({
        title: "Success",
        description: "Category updated successfully!"
      })

      // Update categories and select the updated one if it was selected
      await fetchCategories()
      if (value === editingCategory.name) {
        onValueChange(editCategoryName.trim())
      }
      setEditingCategory(null)
      setEditCategoryName('')

    } catch (error) {
      console.error('Error updating category:', error)
      toast({
        title: "Error",
        description: "Failed to update category. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const deleteCategory = async (category: Category) => {
    setIsLoading(true)
    try {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', category.id)

      if (error) throw error

      toast({
        title: "Success",
        description: "Category deleted successfully!"
      })

      // Update categories and clear selection if deleted category was selected
      await fetchCategories()
      if (value === category.name) {
        onValueChange('')
      }

    } catch (error) {
      console.error('Error deleting category:', error)
      toast({
        title: "Error",
        description: "Failed to delete category. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const startEdit = (category: Category) => {
    setEditingCategory(category)
    setEditCategoryName(category.name)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (editingCategory) {
        updateCategory()
      } else {
        createCategory()
      }
    }
    if (e.key === 'Escape') {
      setIsCreating(false)
      setNewCategory('')
      setEditingCategory(null)
      setEditCategoryName('')
    }
  }

  return (
    <div className="space-y-2">
      <Label htmlFor="category">{label} {required && '*'}</Label>
      
      {editingCategory ? (
        <div className="flex gap-2">
          <Input
            value={editCategoryName}
            onChange={(e) => setEditCategoryName(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter category name"
            className="flex-1"
            autoFocus
          />
          <Button
            type="button"
            size="sm"
            onClick={updateCategory}
            disabled={!editCategoryName.trim() || isLoading}
            className="shrink-0"
          >
            <Check className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setEditingCategory(null)
              setEditCategoryName('')
            }}
            className="shrink-0"
          >
            Cancel
          </Button>
        </div>
      ) : !isCreating ? (
        <div className="flex gap-2">
          <Select value={value} onValueChange={onValueChange} required={required}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
              {categories.map((cat) => (
                <div key={cat.id} className="flex items-center group">
                  <SelectItem 
                    value={cat.name}
                    className="flex-1 cursor-pointer"
                  >
                    {cat.name}
                  </SelectItem>
                  <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 hover:bg-muted"
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                          }}
                        >
                          <MoreVertical className="h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-32">
                        <DropdownMenuItem 
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            startEdit(cat)
                          }}
                        >
                          <Edit className="mr-2 h-3 w-3" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            deleteCategory(cat)
                          }}
                          className="text-destructive"
                        >
                          <Trash2 className="mr-2 h-3 w-3" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsCreating(true)}
            className="shrink-0"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div className="flex gap-2">
          <Input
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter new category name"
            className="flex-1"
            autoFocus
          />
          <Button
            type="button"
            size="sm"
            onClick={createCategory}
            disabled={!newCategory.trim() || isLoading}
            className="shrink-0"
          >
            <Check className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setIsCreating(false)
              setNewCategory('')
            }}
            className="shrink-0"
          >
            Cancel
          </Button>
        </div>
      )}
    </div>
  )
}