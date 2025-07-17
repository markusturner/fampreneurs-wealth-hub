import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/integrations/supabase/client'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CategorySelector } from "@/components/ui/category-selector"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from '@/hooks/use-toast'
import { Upload, Link, Loader2, FileText, X } from 'lucide-react'

interface AddVideoDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  courseId: string
  onVideoAdded: () => void
}

type VideoType = 'upload' | 'youtube' | 'vimeo' | 'loom'

const extractVideoId = (url: string, type: VideoType): string | null => {
  switch (type) {
    case 'youtube':
      const youtubeMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/)
      return youtubeMatch ? youtubeMatch[1] : null
    case 'vimeo':
      const vimeoMatch = url.match(/vimeo\.com\/(?:.*\/)?(\d+)/)
      return vimeoMatch ? vimeoMatch[1] : null
    case 'loom':
      const loomMatch = url.match(/loom\.com\/share\/([a-zA-Z0-9]+)/)
      return loomMatch ? loomMatch[1] : null
    default:
      return null
  }
}

const getEmbedUrl = (url: string, type: VideoType): string => {
  const videoId = extractVideoId(url, type)
  if (!videoId) return url

  switch (type) {
    case 'youtube':
      return `https://www.youtube.com/embed/${videoId}`
    case 'vimeo':
      return `https://player.vimeo.com/video/${videoId}`
    case 'loom':
      return `https://www.loom.com/embed/${videoId}`
    default:
      return url
  }
}

export function AddVideoDialog({ open, onOpenChange, courseId, onVideoAdded }: AddVideoDialogProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [videoUrl, setVideoUrl] = useState('')
  const [videoType, setVideoType] = useState<VideoType>('youtube')
  const [duration, setDuration] = useState('')
  const [category, setCategory] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [activeTab, setActiveTab] = useState<'upload' | 'url'>('url')
  const [documents, setDocuments] = useState<File[]>([])
  const [createdVideoId, setCreatedVideoId] = useState<string | null>(null)
  const [showDocumentUpload, setShowDocumentUpload] = useState(false)

  const handleVideoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setVideoFile(file)
    }
  }

  const uploadVideoFile = async (file: File): Promise<string | null> => {
    const fileExt = file.name.split('.').pop()
    const fileName = `${user?.id}/${Date.now()}.${fileExt}`
    
    const { error: uploadError } = await supabase.storage
      .from('course-videos')
      .upload(fileName, file)
    
    if (uploadError) {
      console.error('Error uploading video:', uploadError)
      return null
    }
    
    const { data: { publicUrl } } = supabase.storage
      .from('course-videos')
      .getPublicUrl(fileName)
    
    return publicUrl
  }

  const handleDocumentFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setDocuments(prev => [...prev, ...files])
  }

  const removeDocument = (index: number) => {
    setDocuments(prev => prev.filter((_, i) => i !== index))
  }

  const uploadDocument = async (file: File, videoId: string): Promise<boolean> => {
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${user?.id}/${videoId}/${Date.now()}.${fileExt}`
      
      const { error: uploadError } = await supabase.storage
        .from('video-documents')
        .upload(fileName, file)
      
      if (uploadError) {
        console.error('Error uploading document:', uploadError)
        return false
      }
      
      const { data: { publicUrl } } = supabase.storage
        .from('video-documents')
        .getPublicUrl(fileName)
      
      const { error: dbError } = await supabase
        .from('video_documents')
        .insert({
          video_id: videoId,
          document_name: file.name,
          file_url: publicUrl,
          file_size: file.size,
          mime_type: file.type,
          uploaded_by: user?.id
        })
      
      if (dbError) {
        console.error('Error saving document to database:', dbError)
        return false
      }
      
      return true
    } catch (error) {
      console.error('Error uploading document:', error)
      return false
    }
  }

  const uploadAllDocuments = async (videoId: string) => {
    if (documents.length === 0) return true
    
    const uploadPromises = documents.map(doc => uploadDocument(doc, videoId))
    const results = await Promise.all(uploadPromises)
    
    return results.every(result => result)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!title.trim()) {
      toast({
        title: "Error",
        description: "Please enter a video title",
        variant: "destructive"
      })
      return
    }

    if (activeTab === 'upload' && !videoFile) {
      toast({
        title: "Error", 
        description: "Please select a video file to upload",
        variant: "destructive"
      })
      return
    }

    if (activeTab === 'url' && !videoUrl.trim()) {
      toast({
        title: "Error",
        description: "Please enter a video URL",
        variant: "destructive"
      })
      return
    }

    setIsSubmitting(true)

    try {
      let finalVideoUrl = ''
      let finalVideoType: VideoType = 'upload'

      if (activeTab === 'upload' && videoFile) {
        const uploadedUrl = await uploadVideoFile(videoFile)
        if (!uploadedUrl) {
          toast({
            title: "Error",
            description: "Failed to upload video file. Please try again.",
            variant: "destructive"
          })
          return
        }
        finalVideoUrl = uploadedUrl
        finalVideoType = 'upload'
      } else {
        finalVideoUrl = getEmbedUrl(videoUrl, videoType)
        finalVideoType = videoType
      }

      const { data: videoData, error } = await supabase
        .from('course_videos')
        .insert({
          course_id: courseId,
          title: title.trim(),
          description: description.trim() || null,
          video_url: finalVideoUrl,
          video_type: finalVideoType,
          duration_seconds: duration ? parseInt(duration) * 60 : null,
          created_by: user?.id
        })
        .select()

      if (error) {
        throw error
      }

      const newVideoId = videoData[0].id
      setCreatedVideoId(newVideoId)

      // Upload documents if any
      if (documents.length > 0) {
        const documentsUploaded = await uploadAllDocuments(newVideoId)
        if (!documentsUploaded) {
          toast({
            title: "Warning",
            description: "Video created successfully, but some documents failed to upload.",
            variant: "destructive"
          })
        }
      }

      toast({
        title: "Success",
        description: documents.length > 0 
          ? "Video and documents have been added to the course!"
          : "Video has been added to the course!"
      })

      // Show document upload option
      if (documents.length === 0) {
        setShowDocumentUpload(true)
        return
      }

      // Reset form
      setTitle('')
      setDescription('')
      setVideoFile(null)
      setVideoUrl('')
      setDuration('')
      setCategory('')
      setDocuments([])
      setCreatedVideoId(null)
      setShowDocumentUpload(false)
      
      onVideoAdded()
      onOpenChange(false)
      
    } catch (error) {
      console.error('Error adding video:', error)
      toast({
        title: "Error",
        description: "Failed to add video. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCompleteVideo = () => {
    // Reset form
    setTitle('')
    setDescription('')
    setVideoFile(null)
    setVideoUrl('')
    setDuration('')
    setCategory('')
    setDocuments([])
    setCreatedVideoId(null)
    setShowDocumentUpload(false)
    
    onVideoAdded()
    onOpenChange(false)
  }

  const handleAddDocumentsLater = async () => {
    if (!createdVideoId || documents.length === 0) {
      handleCompleteVideo()
      return
    }

    setIsSubmitting(true)
    const documentsUploaded = await uploadAllDocuments(createdVideoId)
    setIsSubmitting(false)

    if (documentsUploaded) {
      toast({
        title: "Success",
        description: "Documents have been added to the video!"
      })
    } else {
      toast({
        title: "Error",
        description: "Some documents failed to upload.",
        variant: "destructive"
      })
    }

    handleCompleteVideo()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] mx-4 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Video to Course</DialogTitle>
          <DialogDescription>
            Upload a video file or add a video from YouTube, Vimeo, or Loom
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Video Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter video title"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter video description (optional)"
              rows={3}
            />
          </div>

          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'upload' | 'url')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="url" className="gap-2">
                <Link className="h-4 w-4" />
                Video URL
              </TabsTrigger>
              <TabsTrigger value="upload" className="gap-2">
                <Upload className="h-4 w-4" />
                Upload File
              </TabsTrigger>
            </TabsList>

            <TabsContent value="url" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="video-type">Video Platform</Label>
                <Select value={videoType} onValueChange={(value) => setVideoType(value as VideoType)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select video platform" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="youtube">YouTube</SelectItem>
                    <SelectItem value="vimeo">Vimeo</SelectItem>
                    <SelectItem value="loom">Loom</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="video-url">Video URL *</Label>
                <Input
                  id="video-url"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder={`Enter ${videoType} URL`}
                  required={activeTab === 'url'}
                />
              </div>
            </TabsContent>

            <TabsContent value="upload" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="video-file">Video File *</Label>
                <Input
                  id="video-file"
                  type="file"
                  accept="video/*"
                  onChange={handleVideoFileChange}
                  required={activeTab === 'upload'}
                />
                {videoFile && (
                  <p className="text-sm text-muted-foreground">
                    Selected: {videoFile.name} ({(videoFile.size / 1024 / 1024).toFixed(2)} MB)
                  </p>
                )}
              </div>
            </TabsContent>
          </Tabs>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="duration">Duration (minutes)</Label>
              <Input
                id="duration"
                type="number"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="Enter video duration in minutes"
                min="1"
              />
            </div>
            
            <CategorySelector
              value={category}
              onValueChange={setCategory}
              type="video"
              label="Category"
              placeholder="Select or create category"
              required={false}
            />
          </div>

          {/* Document Upload Section */}
          <div className="space-y-4 border-t pt-4">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <Label className="text-sm font-medium">Supporting Documents (Optional)</Label>
            </div>
            <div className="space-y-2">
              <Input
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.txt,.ppt,.pptx,.xls,.xlsx"
                onChange={handleDocumentFileChange}
                className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
              />
              <p className="text-xs text-muted-foreground">
                Upload PDFs, documents, presentations, or spreadsheets related to this video
              </p>
            </div>
            {documents.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Selected Documents:</p>
                {documents.map((doc, index) => (
                  <div key={index} className="flex items-center justify-between bg-muted p-2 rounded">
                    <span className="text-sm truncate">{doc.name}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeDocument(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {!showDocumentUpload && (
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
                    Adding Video...
                  </>
                ) : (
                  'Add Video'
                )}
              </Button>
            </DialogFooter>
          )}

          {showDocumentUpload && (
            <div className="space-y-4 border-t pt-4">
              <div className="text-center">
                <h3 className="text-lg font-semibold text-green-600">Video Created Successfully!</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Would you like to add supporting documents to this video?
                </p>
              </div>
              
              <div className="space-y-2">
                <Input
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.txt,.ppt,.pptx,.xls,.xlsx"
                  onChange={handleDocumentFileChange}
                  className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                />
                {documents.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Selected Documents:</p>
                    {documents.map((doc, index) => (
                      <div key={index} className="flex items-center justify-between bg-muted p-2 rounded">
                        <span className="text-sm truncate">{doc.name}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeDocument(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <DialogFooter className="flex-col sm:flex-row gap-3 sm:gap-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={handleCompleteVideo}
                  className="w-full sm:w-auto"
                >
                  Skip Documents
                </Button>
                <Button 
                  type="button"
                  onClick={handleAddDocumentsLater}
                  disabled={isSubmitting || documents.length === 0}
                  className="w-full sm:w-auto gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Uploading Documents...
                    </>
                  ) : (
                    `Add ${documents.length} Document${documents.length !== 1 ? 's' : ''}`
                  )}
                </Button>
              </DialogFooter>
            </div>
          )}
        </form>
      </DialogContent>
    </Dialog>
  )
}