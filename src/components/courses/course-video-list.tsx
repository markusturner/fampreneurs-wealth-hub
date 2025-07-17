import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/integrations/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Play, Clock, Edit, Trash2 } from 'lucide-react'
import { VideoDocuments } from './video-documents'
import { EditVideoDialog } from './edit-video-dialog'
import { useToast } from '@/hooks/use-toast'

interface Video {
  id: string
  title: string
  description: string | null
  video_url: string
  video_type: 'upload' | 'youtube' | 'vimeo'
  duration_seconds: number | null
  order_index: number
}

interface VideoPlayerProps {
  video: Video
}

const VideoPlayer = ({ video }: VideoPlayerProps) => {
  const getPlatformName = (type: string) => {
    switch (type) {
      case 'youtube': return 'YouTube'
      case 'vimeo': return 'Vimeo'
      case 'upload': return 'Uploaded Video'
      default: return 'Video'
    }
  }

  const getPlatformColor = (type: string) => {
    switch (type) {
      case 'youtube': return 'bg-red-500'
      case 'vimeo': return 'bg-blue-500'
      case 'upload': return 'bg-green-500'
      default: return 'bg-gray-500'
    }
  }

  if (video.video_type === 'upload') {
    return (
      <div className="aspect-video bg-black rounded-lg overflow-hidden">
        <video
          controls
          className="w-full h-full"
          poster="/placeholder.svg"
          controlsList="nodownload"
        >
          <source src={video.video_url} type="video/mp4" />
          Your browser does not support the video tag.
        </video>
      </div>
    )
  }

  return (
    <div className="aspect-video bg-black rounded-lg overflow-hidden">
      <iframe
        src={video.video_url}
        title={video.title}
        className="w-full h-full"
        allowFullScreen
        allow="autoplay; encrypted-media"
        sandbox="allow-scripts allow-same-origin allow-presentation"
      />
    </div>
  )
}

interface CourseVideoListProps {
  courseId: string
  isCreator?: boolean
}

export function CourseVideoList({ courseId, isCreator = false }: CourseVideoListProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [videos, setVideos] = useState<Video[]>([])
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null)
  const [loading, setLoading] = useState(true)
  const [editVideoOpen, setEditVideoOpen] = useState(false)
  const [videoToEdit, setVideoToEdit] = useState<Video | null>(null)

  const getPlatformName = (type: string) => {
    switch (type) {
      case 'youtube': return 'YouTube'
      case 'vimeo': return 'Vimeo'
      case 'upload': return 'Uploaded Video'
      default: return 'Video'
    }
  }

  const getPlatformColor = (type: string) => {
    switch (type) {
      case 'youtube': return 'bg-red-500'
      case 'vimeo': return 'bg-blue-500'
      case 'upload': return 'bg-green-500'
      default: return 'bg-gray-500'
    }
  }

  const fetchVideos = async () => {
    try {
      const { data, error } = await supabase
        .from('course_videos')
        .select('*')
        .eq('course_id', courseId)
        .order('order_index', { ascending: true })

      if (error) throw error
      
      // Type assertion to ensure the data matches our Video interface
      const typedData = (data || []) as Video[]
      setVideos(typedData)
      if (typedData && typedData.length > 0 && !selectedVideo) {
        setSelectedVideo(typedData[0])
      }
    } catch (error) {
      console.error('Error fetching videos:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleEditVideo = (video: Video, e: React.MouseEvent) => {
    e.stopPropagation()
    setVideoToEdit(video)
    setEditVideoOpen(true)
  }

  const handleDeleteVideo = async (videoId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    
    if (!confirm('Are you sure you want to delete this video? This action cannot be undone.')) {
      return
    }

    try {
      const { error } = await supabase
        .from('course_videos')
        .delete()
        .eq('id', videoId)

      if (error) throw error

      toast({
        title: "Success",
        description: "Video has been deleted successfully!"
      })

      // Refresh videos and reset selected if it was deleted
      await fetchVideos()
      if (selectedVideo?.id === videoId) {
        setSelectedVideo(videos.length > 1 ? videos[0] : null)
      }
    } catch (error) {
      console.error('Error deleting video:', error)
      toast({
        title: "Error",
        description: "Failed to delete video. Please try again.",
        variant: "destructive"
      })
    }
  }

  const handleVideoUpdated = () => {
    fetchVideos()
  }

  useEffect(() => {
    fetchVideos()
  }, [courseId])

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse bg-muted rounded-lg h-64"></div>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse bg-muted rounded h-16"></div>
          ))}
        </div>
      </div>
    )
  }

  if (videos.length === 0) {
    return (
      <Card className="text-center py-8">
        <CardContent>
          <Play className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">No videos available for this course yet.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Video Player */}
      <div className="lg:col-span-2 space-y-4">
        {selectedVideo && (
          <>
            <VideoPlayer video={selectedVideo} />
            <div>
              <div className="flex items-center gap-2 mb-2">
                <h2 className="text-xl font-semibold">{selectedVideo.title}</h2>
                <Badge className={`text-white ${getPlatformColor(selectedVideo.video_type)}`}>
                  {getPlatformName(selectedVideo.video_type)}
                </Badge>
                {selectedVideo.duration_seconds && (
                  <Badge variant="outline" className="gap-1">
                    <Clock className="h-3 w-3" />
                    {Math.floor(selectedVideo.duration_seconds / 60)} min
                  </Badge>
                )}
              </div>
              {selectedVideo.description && (
                <p className="text-muted-foreground">{selectedVideo.description}</p>
              )}
            </div>
            <VideoDocuments videoId={selectedVideo.id} />
          </>
        )}
      </div>

      {/* Video List */}
      <div className="space-y-2">
        <h3 className="font-semibold mb-4">Course Videos ({videos.length})</h3>
        {videos.map((video, index) => (
          <Card
            key={video.id}
            className={`cursor-pointer transition-all hover:shadow-md ${
              selectedVideo?.id === video.id ? 'ring-2 ring-primary' : ''
            }`}
            onClick={() => setSelectedVideo(video)}
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="bg-primary/10 rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-medium">{index + 1}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-sm leading-tight truncate">{video.title}</h4>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge 
                      variant="secondary" 
                      className={`text-xs ${getPlatformColor(video.video_type)} text-white`}
                    >
                      {getPlatformName(video.video_type)}
                    </Badge>
                    {video.duration_seconds && (
                      <span className="text-xs text-muted-foreground">
                        {Math.floor(video.duration_seconds / 60)} min
                      </span>
                    )}
                  </div>
                </div>
                {isCreator && (
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => handleEditVideo(video, e)}
                      className="h-6 w-6 p-0"
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => handleDeleteVideo(video.id, e)}
                      className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Edit Video Dialog */}
      <EditVideoDialog
        open={editVideoOpen}
        onOpenChange={setEditVideoOpen}
        video={videoToEdit}
        onVideoUpdated={handleVideoUpdated}
      />
    </div>
  )
}