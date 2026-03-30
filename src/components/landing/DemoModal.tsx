import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Play, Upload, Link, Save } from 'lucide-react'
import { useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'

interface DemoModalProps {
  isOpen: boolean
  onClose: () => void
}

export const DemoModal = ({ isOpen, onClose }: DemoModalProps) => {
  const [videoUrl, setVideoUrl] = useState('')
  const [uploadedVideo, setUploadedVideo] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [currentVideoUrl, setCurrentVideoUrl] = useState('')
  const { toast } = useToast()

  const getEmbedUrl = (url: string) => {
    // Convert various video URLs to embed format
    if (url.includes('loom.com')) {
      const match = url.match(/loom\.com\/share\/([a-zA-Z0-9]+)/)
      return match ? `https://www.loom.com/embed/${match[1]}` : url
    }
    if (url.includes('vimeo.com')) {
      const match = url.match(/vimeo\.com\/(\d+)/)
      return match ? `https://player.vimeo.com/video/${match[1]}` : url
    }
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/)
      return match ? `https://www.youtube.com/embed/${match[1]}` : url
    }
    // Tella.tv
    if (url.includes('tella.tv')) {
      if (url.includes('/embed')) return url
      const match = url.match(/tella\.tv\/(?:video|share)\/([a-zA-Z0-9_-]+)/)
      return match ? `https://www.tella.tv/video/${match[1]}/embed` : url
    }
    return url
  }

  const handleUrlSave = () => {
    const embedUrl = getEmbedUrl(videoUrl)
    setCurrentVideoUrl(embedUrl)
    toast({
      title: "Video URL saved",
      description: "Your demo video has been updated."
    })
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('video/')) {
      toast({
        title: "Invalid file type",
        description: "Please select a video file.",
        variant: "destructive"
      })
      return
    }

    setIsUploading(true)
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `demo-video-${Date.now()}.${fileExt}`
      
      const { data, error } = await supabase.storage
        .from('demo-videos')
        .upload(fileName, file)

      if (error) throw error

      const { data: { publicUrl } } = supabase.storage
        .from('demo-videos')
        .getPublicUrl(fileName)

      setUploadedVideo(publicUrl)
      setCurrentVideoUrl(publicUrl)
      
      toast({
        title: "Video uploaded successfully",
        description: "Your demo video has been uploaded and saved."
      })
    } catch (error) {
      console.error('Upload error:', error)
      toast({
        title: "Upload failed",
        description: "There was an error uploading your video. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl w-full h-[85vh] p-0">
        {!currentVideoUrl && (
          <DialogHeader className="px-6 py-2">
            <DialogTitle className="text-lg font-bold text-foreground">
              TruHeirs Platform Demo
            </DialogTitle>
          </DialogHeader>
        )}
        <div className={`flex-1 ${currentVideoUrl ? 'p-0' : 'px-6 pb-6 pt-2'}`}>
          {currentVideoUrl ? (
            <div className="relative w-full h-full bg-muted rounded-lg overflow-hidden">
              {uploadedVideo ? (
                <video 
                  src={currentVideoUrl}
                  className="w-full h-full object-cover"
                  controls
                  title="TruHeirs Platform Demo"
                />
              ) : (
                <iframe 
                  src={currentVideoUrl}
                  className="w-full h-full"
                  allowFullScreen
                  title="TruHeirs Platform Demo"
                />
              )}
              <Button
                variant="secondary"
                size="sm"
                className="absolute top-4 right-4"
                onClick={() => setCurrentVideoUrl('')}
              >
                Change Video
              </Button>
            </div>
          ) : (
            <div className="w-full h-full space-y-6">
              <Tabs defaultValue="url" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="url" className="flex items-center gap-2">
                    <Link className="w-4 h-4" />
                    Video URL
                  </TabsTrigger>
                  <TabsTrigger value="upload" className="flex items-center gap-2">
                    <Upload className="w-4 h-4" />
                    Upload Video
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="url" className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="video-url">Video URL (Loom, Vimeo, YouTube)</Label>
                    <Input
                      id="video-url"
                      placeholder="https://www.loom.com/share/your-video-id"
                      value={videoUrl}
                      onChange={(e) => setVideoUrl(e.target.value)}
                    />
                  </div>
                  <Button 
                    onClick={handleUrlSave}
                    disabled={!videoUrl}
                    className="flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    Save Video URL
                  </Button>
                </TabsContent>

                <TabsContent value="upload" className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="video-file">Upload Video File</Label>
                    <Input
                      id="video-file"
                      type="file"
                      accept="video/*"
                      onChange={handleFileUpload}
                      disabled={isUploading}
                    />
                  </div>
                  {isUploading && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                      Uploading video...
                    </div>
                  )}
                </TabsContent>
              </Tabs>

              {/* Fallback placeholder */}
              <div className="flex-1 bg-gradient-to-br from-primary/10 to-secondary/10 rounded-lg flex items-center justify-center min-h-[300px]">
                <div className="text-center space-y-4">
                  <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center mx-auto">
                    <Play className="w-8 h-8 text-primary-foreground" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-semibold text-foreground">
                      Add Your Demo Video
                    </h3>
                    <p className="text-muted-foreground max-w-md">
                      Upload a video file or paste a URL from Loom, Vimeo, or YouTube to showcase your TruHeirs platform.
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
                    <Button 
                      className="bg-primary hover:bg-primary/90"
                      onClick={() => {
                        onClose()
                        document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })
                      }}
                    >
                      Start Free Trial
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => {
                        onClose()
                        window.open('mailto:demo@truheirs.com?subject=Schedule Personal Demo', '_blank')
                      }}
                    >
                      Schedule Personal Demo
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
