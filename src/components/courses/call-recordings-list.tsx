import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Play, Calendar, Clock, Video, Eye, User } from 'lucide-react'
import { format } from 'date-fns'

interface CoachingRecording {
  id: string
  title: string
  description: string | null
  recording_url: string
  recording_type: string
  platform: string | null
  duration_minutes: number | null
  recorded_at: string
  created_at: string
  category: string | null
  created_by: string
}

export function CallRecordingsList() {
  const [recordings, setRecordings] = useState<CoachingRecording[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedRecording, setSelectedRecording] = useState<CoachingRecording | null>(null)
  const [videoDialogOpen, setVideoDialogOpen] = useState(false)

  const fetchRecordings = async () => {
    try {
      const { data, error } = await supabase
        .from('coaching_call_recordings')
        .select('*')
        .order('recorded_at', { ascending: false })

      if (error) {
        console.error('Error fetching recordings:', error)
        return
      }

      setRecordings(data || [])
    } catch (error) {
      console.error('Error fetching recordings:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRecordings()

    // Set up real-time subscription for new recordings
    const channel = supabase
      .channel('coaching-recordings-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'coaching_call_recordings'
        },
        (payload) => {
          setRecordings(prev => [payload.new as CoachingRecording, ...prev])
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'coaching_call_recordings'
        },
        (payload) => {
          setRecordings(prev => 
            prev.map(recording => 
              recording.id === payload.new.id ? payload.new as CoachingRecording : recording
            )
          )
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'coaching_call_recordings'
        },
        (payload) => {
          setRecordings(prev => prev.filter(recording => recording.id !== payload.old.id))
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const handleWatchRecording = (recording: CoachingRecording) => {
    setSelectedRecording(recording)
    setVideoDialogOpen(true)
  }

  const getVideoEmbedUrl = (url: string, type: string) => {
    if (type === 'url') {
      // Try to detect platform and convert to embed URL
      if (url.includes('youtube.com') || url.includes('youtu.be')) {
        const videoId = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/)?.[1]
        return videoId ? `https://www.youtube.com/embed/${videoId}` : url
      } else if (url.includes('vimeo.com')) {
        const videoId = url.match(/vimeo\.com\/(\d+)/)?.[1]
        return videoId ? `https://player.vimeo.com/video/${videoId}` : url
      } else if (url.includes('loom.com')) {
        const videoId = url.match(/loom\.com\/share\/([a-zA-Z0-9]+)/)?.[1]
        return videoId ? `https://www.loom.com/embed/${videoId}` : url
      } else if (url.includes('fathom.video')) {
        // Fathom recordings - convert to embed format
        const recordingId = url.match(/fathom\.video\/conversations\/([a-zA-Z0-9-]+)/)?.[1]
        return recordingId ? `https://fathom.video/conversations/${recordingId}/embed` : url
      } else if (url.includes('app.fathom.video')) {
        // Alternative Fathom URL format
        const recordingId = url.match(/app\.fathom\.video\/calls\/([a-zA-Z0-9-]+)/)?.[1]
        return recordingId ? `https://app.fathom.video/calls/${recordingId}/embed` : url
      }
    }
    return url
  }

  const isFathomRecording = (url: string) => {
    return url.includes('fathom.video') || url.includes('app.fathom.video')
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-muted rounded-lg"></div>
          ))}
        </div>
      </div>
    )
  }

  if (recordings.length === 0) {
    return (
      <div className="text-center py-12">
        <Video className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
        <h3 className="text-lg font-semibold text-muted-foreground mb-2">No Call Recordings Yet</h3>
        <p className="text-sm text-muted-foreground">
          Call recordings will appear here once they are uploaded by administrators.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {recordings.map((recording) => (
          <Card key={recording.id} className="shadow-soft hover:shadow-medium transition-smooth overflow-hidden">
            <CardHeader className="p-4">
              <div className="flex items-start justify-between mb-2">
                <Badge variant="secondary" className="text-xs">
                  {recording.platform || 'Recording'}
                </Badge>
                <div className="text-xs text-muted-foreground">
                  {format(new Date(recording.recorded_at), 'MMM d, yyyy')}
                </div>
              </div>
              <CardTitle className="text-base leading-tight">{recording.title}</CardTitle>
              <CardDescription className="text-sm line-clamp-2">
                {recording.description || 'No description provided'}
              </CardDescription>
            </CardHeader>
            
            <CardContent className="p-4 space-y-3">
              <div className="text-sm text-muted-foreground space-y-1">
                <div className="flex items-center gap-2">
                  <Calendar className="h-3 w-3" />
                  <span>{format(new Date(recording.recorded_at), 'MMMM d, yyyy')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-3 w-3" />
                  <span>{format(new Date(recording.recorded_at), 'h:mm a')}</span>
                </div>
                {recording.duration_minutes && (
                  <div className="flex items-center gap-2">
                    <Video className="h-3 w-3" />
                    <span>{recording.duration_minutes} minutes</span>
                  </div>
                )}
                {recording.category && (
                  <div className="flex items-center gap-2">
                    <User className="h-3 w-3" />
                    <span>{recording.category}</span>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <Button 
                  className="flex-1 gap-2" 
                  onClick={() => handleWatchRecording(recording)}
                >
                  <Play className="h-4 w-4" />
                  Watch Recording
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleWatchRecording(recording)}
                >
                  <Eye className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Video Dialog */}
      {selectedRecording && (
        <Dialog open={videoDialogOpen} onOpenChange={setVideoDialogOpen}>
          <DialogContent className="w-[95vw] max-w-[1000px] max-h-[90vh]">
            <DialogHeader>
              <DialogTitle className="text-lg">{selectedRecording.title}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="aspect-video bg-black rounded-lg overflow-hidden">
                {selectedRecording.recording_type === 'upload' ? (
                  <video 
                    controls 
                    className="w-full h-full"
                    src={selectedRecording.recording_url}
                  >
                    Your browser does not support the video tag.
                  </video>
                ) : (
                  <div className="w-full h-full flex flex-col">
                    {isFathomRecording(selectedRecording.recording_url) ? (
                      <div className="w-full h-full">
                        <iframe
                          src={getVideoEmbedUrl(selectedRecording.recording_url, selectedRecording.recording_type)}
                          className="w-full h-full"
                          frameBorder="0"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                          title={selectedRecording.title}
                        />
                        <div className="mt-2 p-2 bg-muted rounded text-sm">
                          <p>📹 Fathom Recording</p>
                          <p className="text-xs text-muted-foreground">
                            Use the controls in the player above or{' '}
                            <button 
                              className="text-primary underline text-xs"
                              onClick={() => window.open(selectedRecording.recording_url.replace('/embed', ''), '_blank')}
                            >
                              open in Fathom
                            </button>
                          </p>
                        </div>
                      </div>
                    ) : (
                      <iframe
                        src={getVideoEmbedUrl(selectedRecording.recording_url, selectedRecording.recording_type)}
                        className="w-full h-full"
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        title={selectedRecording.title}
                      />
                    )}
                  </div>
                )}
              </div>
              
              <div className="space-y-2">
                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {format(new Date(selectedRecording.recorded_at), 'MMMM d, yyyy')}
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {format(new Date(selectedRecording.recorded_at), 'h:mm a')}
                  </div>
                  {selectedRecording.duration_minutes && (
                    <div className="flex items-center gap-1">
                      <Video className="h-4 w-4" />
                      {selectedRecording.duration_minutes} minutes
                    </div>
                  )}
                  {selectedRecording.platform && (
                    <Badge variant="outline">{selectedRecording.platform}</Badge>
                  )}
                </div>
                
                {selectedRecording.description && (
                  <div>
                    <h4 className="font-medium mb-1">Description</h4>
                    <p className="text-sm text-muted-foreground">{selectedRecording.description}</p>
                  </div>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}