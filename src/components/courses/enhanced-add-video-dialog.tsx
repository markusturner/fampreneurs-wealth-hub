import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Upload, Link, FileText, Plus, Trash2, FolderPlus } from 'lucide-react'

interface AddVideoDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  courseId: string
  onVideoAdded: () => void
}

type VideoType = 'upload' | 'youtube' | 'vimeo' | 'loom'

interface Document {
  file: File
  name: string
  type: 'pdf' | 'link'
  url?: string
}

// Extract video ID from URLs
const extractVideoId = (url: string, type: VideoType): string | null => {
  try {
    if (type === 'youtube') {
      const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/)
      return match ? match[1] : null
    } else if (type === 'vimeo') {
      const match = url.match(/vimeo\.com\/(\d+)/)
      return match ? match[1] : null
    } else if (type === 'loom') {
      const match = url.match(/loom\.com\/share\/([a-zA-Z0-9]+)/)
      return match ? match[1] : null
    }
    return null
  } catch {
    return null
  }
}

// Generate embed URL
const getEmbedUrl = (url: string, type: VideoType): string => {
  const videoId = extractVideoId(url, type)
  if (!videoId) return url

  switch (type) {
    case 'youtube':
      return `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1&controls=1&showinfo=0`
    case 'vimeo':
      return `https://player.vimeo.com/video/${videoId}?title=0&byline=0&portrait=0`
    case 'loom':
      return `https://www.loom.com/embed/${videoId}`
    default:
      return url
  }
}

export const EnhancedAddVideoDialog = ({ open, onOpenChange, courseId, onVideoAdded }: AddVideoDialogProps) => {
  const { user } = useAuth()
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState<'upload' | 'url'>('url')
  
  // Video form state
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [videoUrl, setVideoUrl] = useState('')
  const [videoType, setVideoType] = useState<VideoType>('youtube')
  const [duration, setDuration] = useState('')
  const [category, setCategory] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Module state
  const [modules, setModules] = useState<Array<{ id: string; title: string }>>([])
  const [selectedModuleId, setSelectedModuleId] = useState('')
  const [newModuleTitle, setNewModuleTitle] = useState('')
  const [newModuleDescription, setNewModuleDescription] = useState('')
  const [showCreateModule, setShowCreateModule] = useState(false)
  
  // Documents state
  const [documents, setDocuments] = useState<Document[]>([])
  const [showDocumentSection, setShowDocumentSection] = useState(false)

  // Load modules when dialog opens
  useEffect(() => {
    if (open && courseId) {
      loadModules()
    }
  }, [open, courseId])

  const loadModules = async () => {
    try {
      const { data, error } = await supabase
        .from('course_modules')
        .select('id, title')
        .eq('course_id', courseId)
        .order('order_index', { ascending: true })

      if (error) throw error
      setModules(data || [])
    } catch (error) {
      console.error('Error loading modules:', error)
    }
  }

  const createModule = async () => {
    if (!newModuleTitle.trim() || !user) return

    try {
      const { data, error } = await supabase
        .from('course_modules')
        .insert({
          course_id: courseId,
          title: newModuleTitle.trim(),
          description: newModuleDescription.trim() || null,
          order_index: modules.length,
          created_by: user.id
        })
        .select('id, title')
        .single()

      if (error) throw error

      setModules(prev => [...prev, data])
      setSelectedModuleId(data.id)
      setNewModuleTitle('')
      setNewModuleDescription('')
      setShowCreateModule(false)

      toast({
        title: "Module created",
        description: "The module has been created successfully."
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create module",
        variant: "destructive"
      })
    }
  }

  const handleVideoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setVideoFile(file)
    }
  }

  const uploadVideoFile = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}.${fileExt}`
      const filePath = `videos/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('course-videos')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('course-videos')
        .getPublicUrl(filePath)

      return publicUrl
    } catch (error) {
      console.error('Error uploading video:', error)
      return null
    }
  }

  const handleDocumentFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setDocuments(prev => [...prev, {
        file,
        name: file.name,
        type: 'pdf'
      }])
    }
  }

  const addLinkDocument = () => {
    const url = prompt('Enter document URL:')
    const name = prompt('Enter document name:')
    if (url && name) {
      setDocuments(prev => [...prev, {
        file: null as any,
        name,
        type: 'link',
        url
      }])
    }
  }

  const removeDocument = (index: number) => {
    setDocuments(prev => prev.filter((_, i) => i !== index))
  }

  const uploadDocument = async (doc: Document, videoId: string): Promise<boolean> => {
    try {
      if (doc.type === 'pdf' && doc.file) {
        const fileExt = doc.file.name.split('.').pop()
        const fileName = `${Date.now()}.${fileExt}`
        const filePath = `documents/${fileName}`

        const { error: uploadError } = await supabase.storage
          .from('video-documents')
          .upload(filePath, doc.file)

        if (uploadError) throw uploadError

        const { data: { publicUrl } } = supabase.storage
          .from('video-documents')
          .getPublicUrl(filePath)

        // Save document metadata to database
        const { error: dbError } = await supabase
          .from('video_documents')
          .insert({
            video_id: videoId,
            document_name: doc.name,
            file_url: publicUrl,
            uploaded_by: user?.id
          })

        if (dbError) throw dbError
      } else if (doc.type === 'link') {
        // Save link document to database
        const { error: dbError } = await supabase
          .from('video_documents')
          .insert({
            video_id: videoId,
            document_name: doc.name,
            file_url: doc.url,
            uploaded_by: user?.id
          })

        if (dbError) throw dbError
      }
      return true
    } catch (error) {
      console.error('Error uploading document:', error)
      return false
    }
  }

  const uploadAllDocuments = async (videoId: string) => {
    for (const doc of documents) {
      await uploadDocument(doc, videoId)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !title.trim()) return

    setIsSubmitting(true)
    try {
      let finalVideoUrl = videoUrl

      // Handle video upload
      if (activeTab === 'upload' && videoFile) {
        const uploadedUrl = await uploadVideoFile(videoFile)
        if (!uploadedUrl) {
          throw new Error('Failed to upload video file')
        }
        finalVideoUrl = uploadedUrl
      } else if (activeTab === 'url' && videoUrl) {
        finalVideoUrl = getEmbedUrl(videoUrl, videoType)
      }

      if (!finalVideoUrl) {
        throw new Error('Please provide a video file or URL')
      }

      // Create video entry
      const { data: videoData, error } = await supabase
        .from('course_videos')
        .insert({
          course_id: courseId,
          title: title.trim(),
          description: description.trim() || null,
          video_url: finalVideoUrl,
          video_type: activeTab === 'upload' ? 'upload' : videoType,
          duration_seconds: duration ? parseInt(duration) * 60 : null,
          module_id: selectedModuleId || null,
          created_by: user.id,
          order_index: 0 // Will be updated by admin if needed
        })
        .select()
        .single()

      if (error) throw error

      // Upload documents if any
      if (documents.length > 0 && videoData) {
        await uploadAllDocuments(videoData.id)
      }

      resetForm()
      onVideoAdded()
      onOpenChange(false)
      
      toast({
        title: "Success",
        description: "Video added successfully!"
      })
    } catch (error: any) {
      console.error('Error adding video:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to add video",
        variant: "destructive"
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetForm = () => {
    setTitle('')
    setDescription('')
    setVideoFile(null)
    setVideoUrl('')
    setVideoType('youtube')
    setDuration('')
    setCategory('')
    setSelectedModuleId('')
    setNewModuleTitle('')
    setNewModuleDescription('')
    setShowCreateModule(false)
    setDocuments([])
    setShowDocumentSection(false)
    setActiveTab('url')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Video to Course</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Video title"
                required
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Video description"
                rows={3}
              />
            </div>
          </div>

          {/* Video Source */}
          <div>
            <Label>Video Source</Label>
            <Tabs value={activeTab} onValueChange={(value: 'upload' | 'url') => setActiveTab(value)} className="mt-2">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="url">URL (YouTube/Vimeo/Loom)</TabsTrigger>
                <TabsTrigger value="upload">Upload File</TabsTrigger>
              </TabsList>
              
              <TabsContent value="url" className="space-y-4">
                <div>
                  <Label htmlFor="videoType">Platform</Label>
                  <Select value={videoType} onValueChange={(value: VideoType) => setVideoType(value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select platform" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="youtube">YouTube</SelectItem>
                      <SelectItem value="vimeo">Vimeo</SelectItem>
                      <SelectItem value="loom">Loom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="videoUrl">Video URL *</Label>
                  <Input
                    id="videoUrl"
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    placeholder="https://..."
                    required={activeTab === 'url'}
                  />
                </div>
              </TabsContent>
              
              <TabsContent value="upload" className="space-y-4">
                <div>
                  <Label htmlFor="videoFile">Video File *</Label>
                  <Input
                    id="videoFile"
                    type="file"
                    accept="video/*"
                    onChange={handleVideoFileChange}
                    required={activeTab === 'upload'}
                  />
                  {videoFile && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Selected: {videoFile.name}
                    </p>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Module Selection */}
          <div className="space-y-4">
            <Label>Module (Optional)</Label>
            <div className="space-y-3">
              <Select value={selectedModuleId} onValueChange={setSelectedModuleId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a module" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No Module</SelectItem>
                  {modules.map((module) => (
                    <SelectItem key={module.id} value={module.id}>
                      {module.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowCreateModule(!showCreateModule)}
                className="flex items-center gap-2"
              >
                <FolderPlus className="h-4 w-4" />
                {showCreateModule ? 'Cancel' : 'Create New Module'}
              </Button>

              {showCreateModule && (
                <div className="space-y-3 p-4 border rounded-lg bg-muted/20">
                  <div>
                    <Label htmlFor="newModuleTitle">Module Title *</Label>
                    <Input
                      id="newModuleTitle"
                      value={newModuleTitle}
                      onChange={(e) => setNewModuleTitle(e.target.value)}
                      placeholder="Module title"
                    />
                  </div>
                  <div>
                    <Label htmlFor="newModuleDescription">Module Description</Label>
                    <Textarea
                      id="newModuleDescription"
                      value={newModuleDescription}
                      onChange={(e) => setNewModuleDescription(e.target.value)}
                      placeholder="Module description"
                      rows={2}
                    />
                  </div>
                  <Button
                    type="button"
                    onClick={createModule}
                    disabled={!newModuleTitle.trim()}
                    size="sm"
                  >
                    Create Module
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Additional Details */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="duration">Duration (minutes)</Label>
              <Input
                id="duration"
                type="number"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="60"
              />
            </div>
            <div>
              <Label htmlFor="category">Category</Label>
              <Input
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Lesson, Workshop, etc."
              />
            </div>
          </div>

          {/* Documents Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Supporting Documents (Optional)</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowDocumentSection(!showDocumentSection)}
              >
                {showDocumentSection ? 'Hide' : 'Add Documents'}
              </Button>
            </div>

            {showDocumentSection && (
              <div className="space-y-4 p-4 border rounded-lg">
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => document.getElementById('documentFile')?.click()}
                    className="flex items-center gap-1"
                  >
                    <Upload className="h-4 w-4" />
                    Upload PDF
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addLinkDocument}
                    className="flex items-center gap-1"
                  >
                    <Link className="h-4 w-4" />
                    Add Link
                  </Button>
                  <input
                    id="documentFile"
                    type="file"
                    accept=".pdf"
                    onChange={handleDocumentFileChange}
                    className="hidden"
                  />
                </div>

                {documents.length > 0 && (
                  <div className="space-y-2">
                    <Label>Documents to upload:</Label>
                    {documents.map((doc, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                        <div className="flex items-center gap-2">
                          {doc.type === 'pdf' ? (
                            <FileText className="h-4 w-4" />
                          ) : (
                            <Link className="h-4 w-4" />
                          )}
                          <span className="text-sm">{doc.name}</span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeDocument(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Submit Buttons */}
          <div className="flex gap-2 pt-4">
            <Button
              type="submit"
              disabled={isSubmitting || !title.trim()}
              className="flex-1"
            >
              {isSubmitting ? 'Adding...' : 'Add Video'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}