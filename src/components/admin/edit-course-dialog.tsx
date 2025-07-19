import React, { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { Edit, Upload, Link } from 'lucide-react'

interface Course {
  id: string
  title: string
  description: string | null
  instructor: string | null
  category: string | null
  level: string | null
  duration: string | null
  price: string | null
  image_url: string | null
  status?: string
}

interface EditCourseDialogProps {
  course: Course
  onCourseUpdated: () => void
}

export function EditCourseDialog({ course, onCourseUpdated }: EditCourseDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [imageTab, setImageTab] = useState<'upload' | 'url'>('url')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imageUrl, setImageUrl] = useState(course.image_url || '')
  const [formData, setFormData] = useState({
    title: course.title,
    description: course.description || '',
    instructor: course.instructor || '',
    category: course.category || '',
    level: course.level || 'Beginner',
    duration: course.duration || '',
    price: course.price || 'Free',
    status: (course as any).status || 'published'
  })
  const { toast } = useToast()

  const uploadImage = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}.${fileExt}`
      const filePath = `course-images/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('course-videos')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('course-videos')
        .getPublicUrl(filePath)

      return publicUrl
    } catch (error) {
      console.error('Error uploading image:', error)
      return null
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      setLoading(true)
      
      let finalImageUrl = imageUrl

      // Handle image upload
      if (imageTab === 'upload' && imageFile) {
        const uploadedUrl = await uploadImage(imageFile)
        if (!uploadedUrl) {
          throw new Error('Failed to upload image file')
        }
        finalImageUrl = uploadedUrl
      }
      
      const { error } = await supabase
        .from('courses')
        .update({
          ...formData,
          image_url: finalImageUrl || null
        })
        .eq('id', course.id)
      
      if (error) throw error
      
      toast({
        title: "Course updated",
        description: "The course has been successfully updated.",
      })
      
      setOpen(false)
      onCourseUpdated()
    } catch (error: any) {
      toast({
        title: "Error updating course",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Edit className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Course</DialogTitle>
          <DialogDescription>
            Update course information
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Course Title</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
            />
          </div>
          
          {/* Course Photo Upload */}
          <div className="space-y-2">
            <Label>Course Photo</Label>
            <Tabs value={imageTab} onValueChange={(value: 'upload' | 'url') => setImageTab(value)}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="url">Image URL</TabsTrigger>
                <TabsTrigger value="upload">Upload File</TabsTrigger>
              </TabsList>
              
              <TabsContent value="url" className="space-y-2">
                <Input
                  placeholder="https://example.com/image.jpg"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                />
                {course.image_url && imageUrl === course.image_url && (
                  <p className="text-sm text-muted-foreground">
                    Current: {course.image_url}
                  </p>
                )}
              </TabsContent>
              
              <TabsContent value="upload" className="space-y-2">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                />
                {imageFile && (
                  <p className="text-sm text-muted-foreground">
                    Selected: {imageFile.name}
                  </p>
                )}
                {course.image_url && !imageFile && (
                  <p className="text-sm text-muted-foreground">
                    Current: {course.image_url}
                  </p>
                )}
              </TabsContent>
            </Tabs>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="instructor">Instructor</Label>
              <Input
                id="instructor"
                value={formData.instructor}
                onChange={(e) => setFormData(prev => ({ ...prev, instructor: e.target.value }))}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Input
                id="category"
                value={formData.category}
                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="level">Level</Label>
              <Select value={formData.level} onValueChange={(value) => setFormData(prev => ({ ...prev, level: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Beginner">Beginner</SelectItem>
                  <SelectItem value="Intermediate">Intermediate</SelectItem>
                  <SelectItem value="Advanced">Advanced</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="duration">Duration</Label>
              <Input
                id="duration"
                value={formData.duration}
                onChange={(e) => setFormData(prev => ({ ...prev, duration: e.target.value }))}
                placeholder="e.g., 4 weeks"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price">Price</Label>
              <Select value={formData.price} onValueChange={(value) => setFormData(prev => ({ ...prev, price: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Free">Free</SelectItem>
                  <SelectItem value="$19">$19</SelectItem>
                  <SelectItem value="$49">$49</SelectItem>
                  <SelectItem value="$99">$99</SelectItem>
                  <SelectItem value="$199">$199</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={formData.status} onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="featured">Featured</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="flex justify-between">
            <Button 
              type="button" 
              variant="secondary"
              onClick={async () => {
                try {
                  // Add this course as a featured course by updating course status
                  const { error } = await supabase
                    .from('courses')
                    .update({
                      status: 'featured'
                    })
                    .eq('id', course.id)
                  
                  if (error) throw error
                  
                  toast({
                    title: "Course featured",
                    description: "This course has been marked as featured in the main program.",
                  })
                  
                  onCourseUpdated()
                } catch (error: any) {
                  toast({
                    title: "Error featuring course",
                    description: error.message,
                    variant: "destructive",
                  })
                }
              }}
            >
              Add as Feature
            </Button>
            <div className="flex space-x-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Updating...' : 'Update Course'}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}