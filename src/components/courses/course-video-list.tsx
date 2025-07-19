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
  onVideoCompleted: (videoId: string) => void
}

const VideoPlayer = ({ video, onVideoCompleted }: VideoPlayerProps) => {
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

  const handleVideoEnded = () => {
    onVideoCompleted(video.id)
  }

  if (video.video_type === 'upload') {
    return (
      <div className="aspect-video bg-black rounded-lg overflow-hidden">
        <video
          controls
          className="w-full h-full"
          poster="/placeholder.svg"
          controlsList="nodownload"
          onEnded={handleVideoEnded}
        >
          <source src={video.video_url} type="video/mp4" />
          Your browser does not support the video tag.
        </video>
      </div>
    )
  }

  // For iframe videos (YouTube, Vimeo), we'll implement a workaround
  // Note: Due to iframe restrictions, we can't detect completion for embedded videos
  // This would require integration with YouTube/Vimeo APIs for proper tracking
  return (
    <div className="aspect-video bg-black rounded-lg overflow-hidden relative">
      <iframe
        src={video.video_url}
        title={video.title}
        className="w-full h-full"
        allowFullScreen
        allow="autoplay; encrypted-media"
        sandbox="allow-scripts allow-same-origin allow-presentation"
      />
      {/* Temporary completion button for iframe videos */}
      <div className="absolute bottom-4 right-4 z-10">
        <Button
          size="sm"
          onClick={handleVideoEnded}
          className="bg-primary/80 hover:bg-primary"
        >
          Mark as Completed
        </Button>
      </div>
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
  const [watchedVideos, setWatchedVideos] = useState<Set<string>>(new Set())

  const getPlatformName = (type: string) => {
    switch (type) {
      case 'youtube': return 'YouTube'
      case 'vimeo': return 'Vimeo'
      case 'upload': return 'Uploaded Video'
      default: return 'Video'
    }
  }

  const getPlatformColor = (type: string) => {
    return '#2eb2ff'
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
        // First video starts unlocked but not watched
      }
    } catch (error) {
      console.error('Error fetching videos:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleVideoSelect = (video: Video) => {
    setSelectedVideo(video)
    // Don't mark as watched on select - only when completed
  }

  const handleVideoCompleted = (videoId: string) => {
    setWatchedVideos(prev => new Set([...prev, videoId]))
    toast({
      title: "Video Completed!",
      description: "Great job! The next video is now unlocked."
    })
  }

  const isVideoUnlocked = (video: Video, index: number) => {
    if (index === 0) return true // First video is always unlocked
    
    // Check if previous video has been watched
    const previousVideo = videos[index - 1]
    return watchedVideos.has(previousVideo.id)
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
    <div className="bg-background text-foreground min-h-screen">
      <div className="grid gap-6 lg:grid-cols-3 p-6">
        {/* Video Player - Your Brand Style */}
        <div className="lg:col-span-2 space-y-4">
          {selectedVideo && (
            <>
              <div className="aspect-video bg-card rounded-lg overflow-hidden relative group border-2" style={{ borderColor: '#ffb500' }}>
                <VideoPlayer video={selectedVideo} onVideoCompleted={handleVideoCompleted} />
              </div>
              <VideoDocuments videoId={selectedVideo.id} />
            </>
          )}
        </div>

        {/* Video List - Your Brand Style */}
        <div className="space-y-6">
          <h3 className="font-bold text-xl mb-8 text-foreground">Episodes ({videos.length})</h3>
          <div className="space-y-4">
            {videos.map((video, index) => {
              const isUnlocked = isVideoUnlocked(video, index)
              const isWatched = watchedVideos.has(video.id)
              
              return (
                <Card
                  key={video.id}
                  className={`transition-all duration-300 border-border ${
                    isUnlocked 
                      ? `cursor-pointer hover:bg-muted/50 ${selectedVideo?.id === video.id ? 'ring-2 ring-primary bg-muted/30' : 'bg-card'}` 
                      : 'cursor-not-allowed opacity-50 bg-card/50'
                  }`}
                  onClick={() => isUnlocked && handleVideoSelect(video)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className={`rounded-full w-10 h-10 flex items-center justify-center flex-shrink-0 font-bold text-sm ${
                        isWatched ? 'bg-primary text-primary-foreground' : isUnlocked ? 'bg-muted text-foreground' : 'bg-muted/50 text-muted-foreground'
                      }`}>
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className={`font-semibold text-base leading-relaxed ${
                          isUnlocked ? 'text-foreground' : 'text-muted-foreground'
                        }`}>
                          {video.title}
                        </h4>
                        <div className="flex items-center gap-3 mt-1">
                          {video.duration_seconds && (
                            <span className="text-sm text-muted-foreground">
                              {Math.floor(video.duration_seconds / 60)} min
                            </span>
                          )}
                          {isWatched && (
                            <Badge variant="outline" className="text-xs border-primary" style={{ backgroundColor: '#ffb500', color: '#290a52' }}>
                              Watched
                            </Badge>
                          )}
                          {!isUnlocked && (
                            <Badge variant="outline" className="text-xs bg-muted border-border text-muted-foreground">
                              Locked
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
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