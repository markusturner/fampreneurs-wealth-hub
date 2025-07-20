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
import { Plus, ChevronRight, ChevronLeft } from 'lucide-react'
import { CourseContentManager } from './course-content-manager'

interface TwoStepCourseCreatorProps {
  onCourseCreated: () => void
}

export function TwoStepCourseCreator({ onCourseCreated }: TwoStepCourseCreatorProps) {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<1 | 2>(1)
  const [loading, setLoading] = useState(false)
  const [createdCourseId, setCreatedCourseId] = useState<string | null>(null)
  
  const [imageTab, setImageTab] = useState<'upload' | 'url'>('url')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imageUrl, setImageUrl] = useState('')
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    instructor: '',
    category: '',
    level: 'Beginner',
    duration: '',
    price: 'Free',
    status: 'draft'
  })
  const { toast } = useToast()
  const { user } = useAuth()

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

  const handleStep1Submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

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
      
      const { data, error } = await supabase
        .from('courses')
        .insert({
          ...formData,
          image_url: finalImageUrl || null,
          created_by: user.id
        })
        .select('id')
        .single()
      
      if (error) throw error
      
      setCreatedCourseId(data.id)
      setStep(2)
      
      toast({
        title: "Course created",
        description: "Now let's add content to your course.",
      })
    } catch (error: any) {
      toast({
        title: "Error creating course",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleStep2Complete = () => {
    resetForm()
    setOpen(false)
    onCourseCreated()
    toast({
      title: "Course setup complete",
      description: "Your course has been created with all content.",
    })
  }

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      instructor: '',
      category: '',
      level: 'Beginner',
      duration: '',
      price: 'Free',
      status: 'draft'
    })
    setImageUrl('')
    setImageFile(null)
    setStep(1)
    setCreatedCourseId(null)
  }

  const handleDialogClose = (isOpen: boolean) => {
    if (!isOpen) {
      resetForm()
    }
    setOpen(isOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleDialogClose}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Course
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {step === 1 ? 'Step 1: Create Course' : 'Step 2: Add Content'}
          </DialogTitle>
          <DialogDescription>
            {step === 1 
              ? 'First, let\'s create the basic course information' 
              : 'Now add videos, modules, and resources to your course'
            }
          </DialogDescription>
        </DialogHeader>

        {step === 1 && (
          <form onSubmit={handleStep1Submit} className="space-y-4">
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
              <Label>Course Photo (Optional)</Label>
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
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Creating...' : (
                  <>
                    Next Step
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </>
                )}
              </Button>
            </div>
          </form>
        )}

        {step === 2 && createdCourseId && (
          <div className="space-y-4">
            <CourseContentManager 
              courseId={createdCourseId}
              onComplete={handleStep2Complete}
            />
            
            <div className="flex justify-between">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setStep(1)}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back to Course Info
              </Button>
              <Button onClick={handleStep2Complete}>
                Complete Course Setup
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}