import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Play, Clock, ExternalLink } from 'lucide-react'

interface Video {
  id: string
  title: string
  description: string | null
  video_url: string
  video_type: 'upload' | 'youtube' | 'vimeo' | 'loom'
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
      case 'loom': return 'Loom'
      case 'upload': return 'Uploaded Video'
      default: return 'Video'
    }
  }

  const getPlatformColor = (type: string) => {
    switch (type) {
      case 'youtube': return 'bg-red-500'
      case 'vimeo': return 'bg-blue-500'
      case 'loom': return 'bg-purple-500'
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
      />
    </div>
  )
}

interface CourseVideoListProps {
  courseId: string
}

export function CourseVideoList({ courseId }: CourseVideoListProps) {
  const [videos, setVideos] = useState<Video[]>([])
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null)
  const [loading, setLoading] = useState(true)

  const getPlatformName = (type: string) => {
    switch (type) {
      case 'youtube': return 'YouTube'
      case 'vimeo': return 'Vimeo'
      case 'loom': return 'Loom'
      case 'upload': return 'Uploaded Video'
      default: return 'Video'
    }
  }

  const getPlatformColor = (type: string) => {
    switch (type) {
      case 'youtube': return 'bg-red-500'
      case 'vimeo': return 'bg-blue-500'
      case 'loom': return 'bg-purple-500'
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
              {selectedVideo.video_type !== 'upload' && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2 gap-2"
                  onClick={() => window.open(selectedVideo.video_url, '_blank')}
                >
                  <ExternalLink className="h-4 w-4" />
                  Open in {getPlatformName(selectedVideo.video_type)}
                </Button>
              )}
            </div>
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
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}