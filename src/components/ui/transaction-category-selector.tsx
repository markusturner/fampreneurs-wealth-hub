import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/integrations/supabase/client'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import { useToast } from '@/hooks/use-toast'
import { Plus, Check, MoreVertical, Edit, Trash2, Tag, DollarSign, TrendingUp, TrendingDown, ArrowUpRight } from 'lucide-react'

interface TransactionCategory {
  id: string
  name: string
  category_type: 'expense' | 'income' | 'transfer' | 'investment'
  created_by: string | null
  created_at: string
  updated_at: string
}

interface TransactionCategorySelectorProps {
  value: string
  onValueChange: (value: string) => void
  label?: string
  placeholder?: string
  required?: boolean
  showTypeFilter?: boolean
}

const getCategoryIcon = (type: 'expense' | 'income' | 'transfer' | 'investment') => {
  switch (type) {
    case 'expense': return TrendingDown
    case 'income': return TrendingUp
    case 'transfer': return ArrowUpRight
    case 'investment': return DollarSign
  }
}

const getCategoryColor = (type: 'expense' | 'income' | 'transfer' | 'investment') => {
  switch (type) {
    case 'expense': return 'text-red-600'
    case 'income': return 'text-green-600'
    case 'transfer': return 'text-blue-600'
    case 'investment': return 'text-purple-600'
  }
}

const getCategoryBadgeVariant = (type: 'expense' | 'income' | 'transfer' | 'investment') => {
  switch (type) {
    case 'expense': return 'destructive'
    case 'income': return 'secondary'
    case 'transfer': return 'outline'
    case 'investment': return 'default'
  }
}

export function TransactionCategorySelector({ 
  value, 
  onValueChange, 
  label = "Category",
  placeholder = "Select category",
  required = false,
  showTypeFilter = true
}: TransactionCategorySelectorProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [categories, setCategories] = useState<TransactionCategory[]>([])
  const [filteredCategories, setFilteredCategories] = useState<TransactionCategory[]>([])
  const [selectedType, setSelectedType] = useState<string>('all')
  const [isCreating, setIsCreating] = useState(false)
  const [newCategory, setNewCategory] = useState('')
  const [newCategoryType, setNewCategoryType] = useState<'expense' | 'income' | 'transfer' | 'investment'>('expense')
  const [isLoading, setIsLoading] = useState(false)
  const [editingCategory, setEditingCategory] = useState<TransactionCategory | null>(null)
  const [editCategoryName, setEditCategoryName] = useState('')
  const [editCategoryType, setEditCategoryType] = useState<'expense' | 'income' | 'transfer' | 'investment'>('expense')

  useEffect(() => {
    fetchCategories()
  }, [])

  useEffect(() => {
    applyTypeFilter()
  }, [categories, selectedType])

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('transaction_categories')
        .select('*')
        .order('category_type', { ascending: true })
        .order('name', { ascending: true })

      if (error) throw error

      setCategories((data || []) as TransactionCategory[])
    } catch (error) {
      console.error('Error fetching categories:', error)
    }
  }

  const applyTypeFilter = () => {
    if (selectedType === 'all') {
      setFilteredCategories(categories)
    } else {
      setFilteredCategories(categories.filter(cat => cat.category_type === selectedType))
    }
  }

  const createCategory = async () => {
    if (!newCategory.trim() || !user) return

    setIsLoading(true)
    try {
      const { error } = await supabase
        .from('transaction_categories')
        .insert({
          name: newCategory.trim(),
          category_type: newCategoryType,
          created_by: user.id
        })

      if (error) {
        if (error.code === '23505') { // Unique constraint violation
          toast({
            title: "Category exists",
            description: "This category already exists for you.",
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
        .from('transaction_categories')
        .update({ 
          name: editCategoryName.trim(),
          category_type: editCategoryType
        })
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

  const deleteCategory = async (category: TransactionCategory) => {
    if (!category.created_by) {
      toast({
        title: "Cannot delete",
        description: "Default categories cannot be deleted.",
        variant: "destructive"
      })
      return
    }

    setIsLoading(true)
    try {
      const { error } = await supabase
        .from('transaction_categories')
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

  const startEdit = (category: TransactionCategory) => {
    setEditingCategory(category)
    setEditCategoryName(category.name)
    setEditCategoryType(category.category_type)
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

  const selectedCategory = categories.find(cat => cat.name === value)

  return (
    <div className="space-y-2">
      <Label htmlFor="category">{label} {required && '*'}</Label>
      
      {editingCategory ? (
        <div className="space-y-2">
          <Input
            value={editCategoryName}
            onChange={(e) => setEditCategoryName(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter category name"
            autoFocus
          />
          <Select value={editCategoryType} onValueChange={(value: any) => setEditCategoryType(value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-background border shadow-md z-50">
              <SelectItem value="expense">🔴 Expense</SelectItem>
              <SelectItem value="income">🟢 Income</SelectItem>
              <SelectItem value="transfer">🔵 Transfer</SelectItem>
              <SelectItem value="investment">🟡 Investment</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              onClick={updateCategory}
              disabled={!editCategoryName.trim() || isLoading}
              className="flex-1"
            >
              <Check className="h-4 w-4 mr-2" />
              Update
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setEditingCategory(null)
                setEditCategoryName('')
              }}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : !isCreating ? (
        <div className="space-y-2">
          {showTypeFilter && (
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
            <SelectContent className="bg-background border shadow-md z-50 max-h-[200px] overflow-y-auto">
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="expense">🔴 Expenses Only</SelectItem>
              <SelectItem value="income">🟢 Income Only</SelectItem>
              <SelectItem value="transfer">🔵 Transfers Only</SelectItem>
              <SelectItem value="investment">🟡 Investments Only</SelectItem>
            </SelectContent>
            </Select>
          )}
          <div className="flex gap-2">
            <Select value={value} onValueChange={onValueChange} required={required}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder={placeholder} />
              </SelectTrigger>
              <SelectContent className="bg-background border shadow-md z-50 max-h-[300px] overflow-y-auto">
                {filteredCategories.map((cat) => {
                  const Icon = getCategoryIcon(cat.category_type)
                  return (
                    <SelectItem key={cat.id} value={cat.name}>
                      <div className="flex items-center gap-2">
                        <Icon className={`h-3 w-3 ${getCategoryColor(cat.category_type)}`} />
                        <span>{cat.name}</span>
                        <Badge variant={getCategoryBadgeVariant(cat.category_type)} className="ml-auto text-xs">
                          {cat.category_type}
                        </Badge>
                      </div>
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 bg-background border shadow-md z-50 max-h-[300px] overflow-y-auto">
                <DropdownMenuItem onClick={() => setIsCreating(true)}>
                  <Plus className="mr-2 h-3 w-3" />
                  Add Category
                </DropdownMenuItem>
                {categories.length > 0 && (
                  <>
                    <DropdownMenuSeparator />
                    <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                      Manage Categories
                    </div>
                    {categories.map((cat) => {
                      const Icon = getCategoryIcon(cat.category_type)
                      return (
                        <div key={cat.id} className="group">
                           <div className="flex items-center justify-between px-2 py-1 text-sm hover:bg-muted rounded-sm mx-1">
                             <div className="flex items-center gap-2 flex-1 min-w-0">
                               <Icon className={`h-3 w-3 flex-shrink-0 ${getCategoryColor(cat.category_type)}`} />
                               <span className="flex-1">{cat.name}</span>
                               <Badge variant={getCategoryBadgeVariant(cat.category_type)} className="text-xs flex-shrink-0">
                                 {cat.category_type}
                               </Badge>
                             </div>
                             <div className="flex gap-1 opacity-100 transition-opacity">
                               <Button
                                 variant="ghost"
                                 size="sm"
                                 className="h-6 w-6 p-0"
                                 onClick={(e) => {
                                   e.stopPropagation()
                                   startEdit(cat)
                                 }}
                               >
                                 <Edit className="h-3 w-3" />
                               </Button>
                               {cat.created_by && (
                                 <Button
                                   variant="ghost"
                                   size="sm"
                                   className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                                   onClick={(e) => {
                                     e.stopPropagation()
                                     if (confirm("Are you sure you want to delete this category?")) {
                                       deleteCategory(cat)
                                     }
                                   }}
                                 >
                                   <Trash2 className="h-3 w-3" />
                                 </Button>
                               )}
                             </div>
                          </div>
                        </div>
                      )
                    })}
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          {selectedCategory && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {(() => {
                const Icon = getCategoryIcon(selectedCategory.category_type)
                return (
                  <>
                    <Icon className={`h-3 w-3 ${getCategoryColor(selectedCategory.category_type)}`} />
                    <span>This is an {selectedCategory.category_type} category</span>
                  </>
                )
              })()}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <Input
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter new category name"
            autoFocus
          />
          <Select value={newCategoryType} onValueChange={(value: any) => setNewCategoryType(value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-background border shadow-md z-50">
              <SelectItem value="expense">🔴 Expense</SelectItem>
              <SelectItem value="income">🟢 Income</SelectItem>
              <SelectItem value="transfer">🔵 Transfer</SelectItem>
              <SelectItem value="investment">🟡 Investment</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              onClick={createCategory}
              disabled={!newCategory.trim() || isLoading}
              className="flex-1"
            >
              <Check className="h-4 w-4 mr-2" />
              Create
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setIsCreating(false)
                setNewCategory('')
              }}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}