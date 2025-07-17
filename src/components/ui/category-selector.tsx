import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/integrations/supabase/client'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { useToast } from '@/hooks/use-toast'
import { Plus, Check } from 'lucide-react'

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
  const [categories, setCategories] = useState<string[]>([])
  const [isCreating, setIsCreating] = useState(false)
  const [newCategory, setNewCategory] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    fetchCategories()
  }, [type])

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('name')
        .eq('type', type)
        .order('name')

      if (error) throw error

      setCategories(data?.map(cat => cat.name) || [])
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      createCategory()
    }
    if (e.key === 'Escape') {
      setIsCreating(false)
      setNewCategory('')
    }
  }

  return (
    <div className="space-y-2">
      <Label htmlFor="category">{label} {required && '*'}</Label>
      
      {!isCreating ? (
        <div className="flex gap-2">
          <Select value={value} onValueChange={onValueChange} required={required}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
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