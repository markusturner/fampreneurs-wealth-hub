import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/integrations/supabase/client'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CategorySelector } from "@/components/ui/category-selector"
import { useToast } from '@/hooks/use-toast'
import { Loader2 } from 'lucide-react'

interface EditCourseDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  course: {
    id: string
    title: string
    description: string | null
    instructor: string | null
    duration: string | null
    level: string | null
    price: string | null
    image_url: string | null
    category: string | null
  } | null
  onCourseUpdated: () => void
}

export function EditCourseDialog({ open, onOpenChange, course, onCourseUpdated }: EditCourseDialogProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [instructor, setInstructor] = useState('')
  const [duration, setDuration] = useState('')
  const [level, setLevel] = useState('Beginner')
  const [price, setPrice] = useState('Free')
  const [imageUrl, setImageUrl] = useState('')
  const [category, setCategory] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (course && open) {
      setTitle(course.title)
      setDescription(course.description || '')
      setInstructor(course.instructor || '')
      setDuration(course.duration || '')
      setLevel(course.level || 'Beginner')
      setPrice(course.price || 'Free')
      setImageUrl(course.image_url || '')
      setCategory(course.category || '')
    }
  }, [course, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!course || !title.trim()) {
      toast({
        title: "Error",
        description: "Please enter a course title",
        variant: "destructive"
      })
      return
    }

    setIsSubmitting(true)

    try {
      const { error } = await supabase
        .from('courses')
        .update({
          title: title.trim(),
          description: description.trim() || null,
          instructor: instructor.trim() || null,
          duration: duration.trim() || null,
          level,
          price,
          image_url: imageUrl.trim() || null,
          category: category.trim() || null,
        })
        .eq('id', course.id)

      if (error) {
        throw error
      }

      toast({
        title: "Success",
        description: "Course has been updated successfully!"
      })

      onCourseUpdated()
      onOpenChange(false)
      
    } catch (error) {
      console.error('Error updating course:', error)
      toast({
        title: "Error",
        description: "Failed to update course. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!course) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] mx-4 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Course</DialogTitle>
          <DialogDescription>
            Update course information and details
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Course Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter course title"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter course description"
              rows={4}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="instructor">Instructor</Label>
              <Input
                id="instructor"
                value={instructor}
                onChange={(e) => setInstructor(e.target.value)}
                placeholder="Enter instructor name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="duration">Duration</Label>
              <Input
                id="duration"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="e.g., 4 weeks, 12 hours"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="level">Level</Label>
              <Select value={level} onValueChange={setLevel}>
                <SelectTrigger>
                  <SelectValue placeholder="Select difficulty level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Beginner">Beginner</SelectItem>
                  <SelectItem value="Intermediate">Intermediate</SelectItem>
                  <SelectItem value="Advanced">Advanced</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="price">Price</Label>
              <Select value={price} onValueChange={setPrice}>
                <SelectTrigger>
                  <SelectValue placeholder="Select price" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Free">Free</SelectItem>
                  <SelectItem value="$29">$29</SelectItem>
                  <SelectItem value="$49">$49</SelectItem>
                  <SelectItem value="$99">$99</SelectItem>
                  <SelectItem value="$199">$199</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="image-url">Course Image URL</Label>
            <Input
              id="image-url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="Enter image URL (optional)"
            />
          </div>

          <CategorySelector
            value={category}
            onValueChange={setCategory}
            type="course"
            label="Category"
            placeholder="Select or create category"
            required={false}
          />

          <DialogFooter className="flex-col sm:flex-row gap-3 sm:gap-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting}
              className="w-full sm:w-auto gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Updating Course...
                </>
              ) : (
                'Update Course'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}