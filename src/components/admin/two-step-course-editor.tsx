import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/integrations/supabase/client'
import { Edit, ArrowLeft, ArrowRight } from 'lucide-react'
import { CourseContentManager } from './course-content-manager'
import { CategorySelector } from '@/components/ui/category-selector'

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

interface TwoStepCourseEditorProps {
  course: Course
  onCourseUpdated: () => void
}

export function TwoStepCourseEditor({ course, onCourseUpdated }: TwoStepCourseEditorProps) {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [coaches, setCoaches] = useState<Array<{id: string, full_name: string}>>([])
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

  // Fetch coaches when component mounts
  useEffect(() => {
    const fetchCoaches = async () => {
      try {
        const { data, error } = await supabase
          .from('coaches')
          .select('id, full_name')
          .eq('is_active', true)
          .order('full_name')

        if (error) throw error
        setCoaches(data || [])
      } catch (error) {
        console.error('Error fetching coaches:', error)
      }
    }

    if (open) {
      fetchCoaches()
    }
  }, [open])

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

  const handleStep1Submit = async () => {
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
        description: "Basic course information has been updated. Now manage content.",
      })
      
      setStep(2)
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

  const handleClose = () => {
    setOpen(false)
    setStep(1)
    onCourseUpdated()
  }

  const resetForm = () => {
    setFormData({
      title: course.title,
      description: course.description || '',
      instructor: course.instructor || '',
      category: course.category || '',
      level: course.level || 'Beginner',
      duration: course.duration || '',
      price: course.price || 'Free',
      status: (course as any).status || 'published'
    })
    setImageUrl(course.image_url || '')
    setImageFile(null)
    setStep(1)
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen)
      if (!isOpen) {
        resetForm()
      }
    }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Edit className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[900px]">
        <DialogHeader>
          <DialogTitle>
            Edit Course - Step {step} of 2
          </DialogTitle>
          <DialogDescription>
            {step === 1 ? 'Update basic course information' : 'Manage course content, videos, and modules'}
          </DialogDescription>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-4">
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
                <Select 
                  value={formData.instructor || 'none'} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, instructor: value === 'none' ? '' : value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select instructor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No instructor</SelectItem>
                    {coaches.map((coach) => (
                      <SelectItem key={coach.id} value={coach.full_name}>
                        {coach.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <CategorySelector
                  type="course"
                  label="Category"
                  value={formData.category}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                  placeholder="Select or create category"
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
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="flex justify-between pt-4">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleStep1Submit} disabled={loading}>
                {loading ? 'Updating...' : 'Next: Manage Content'}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Button 
                variant="outline" 
                onClick={() => setStep(1)}
                className="flex items-center"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Basic Info
              </Button>
              <Button onClick={handleClose}>
                Finish Editing
              </Button>
            </div>
            
            <CourseContentManager 
              courseId={course.id} 
              onComplete={handleClose}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}