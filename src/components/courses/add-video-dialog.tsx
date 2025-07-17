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
import { Upload, Link, Loader2 } from 'lucide-react'

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

      const { error } = await supabase
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

      if (error) {
        throw error
      }

      toast({
        title: "Success",
        description: "Video has been added to the course!"
      })

      // Reset form
      setTitle('')
      setDescription('')
      setVideoFile(null)
      setVideoUrl('')
      setDuration('')
      setCategory('')
      
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
        </form>
      </DialogContent>
    </Dialog>
  )
}