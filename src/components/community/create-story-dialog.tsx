import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/integrations/supabase/client'
import { Upload, X } from 'lucide-react'

interface CreateStoryDialogProps {
  children: React.ReactNode
  onStoryCreated?: () => void
}

export function CreateStoryDialog({ children, onStoryCreated }: CreateStoryDialogProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [caption, setCaption] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
      toast({
        title: "Invalid file type",
        description: "Please select an image or video file.",
        variant: "destructive"
      })
      return
    }

    // Validate file size (max 50MB)
    if (file.size > 50 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select a file smaller than 50MB.",
        variant: "destructive"
      })
      return
    }

    setSelectedFile(file)
    setPreviewUrl(URL.createObjectURL(file))
  }

  const removeFile = () => {
    setSelectedFile(null)
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
      setPreviewUrl(null)
    }
  }

  const uploadFile = async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop()
    const fileName = `${user!.id}/${Date.now()}.${fileExt}`

    const { error: uploadError } = await supabase.storage
      .from('stories')
      .upload(fileName, file)

    if (uploadError) throw uploadError

    const { data: { publicUrl } } = supabase.storage
      .from('stories')
      .getPublicUrl(fileName)

    return publicUrl
  }

  const handleSubmit = async () => {
    if (!user || !selectedFile) return

    setLoading(true)
    try {
      // Upload file
      const contentUrl = await uploadFile(selectedFile)

      // Create story
      const { error } = await supabase
        .from('stories')
        .insert({
          user_id: user.id,
          content_type: selectedFile.type.startsWith('image/') ? 'image' : 'video',
          content_url: contentUrl,
          caption: caption.trim() || null
        })

      if (error) throw error

      toast({
        title: "Story created!",
        description: "Your story has been shared successfully."
      })

      setOpen(false)
      setCaption('')
      removeFile()
      onStoryCreated?.()
    } catch (error) {
      console.error('Error creating story:', error)
      toast({
        title: "Error",
        description: "Failed to create story. Please try again.",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Story</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* File Upload */}
          <div>
            <Label>Photo or Video</Label>
            {!selectedFile ? (
              <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-sm text-muted-foreground mb-4">
                  Click to upload an image or video
                </p>
                <Input
                  type="file"
                  accept="image/*,video/*"
                  onChange={handleFileSelect}
                  className="cursor-pointer"
                />
              </div>
            ) : (
              <div className="relative">
                {selectedFile.type.startsWith('image/') ? (
                  <img
                    src={previewUrl!}
                    alt="Story preview"
                    className="w-full h-64 object-cover rounded-lg"
                  />
                ) : (
                  <video
                    src={previewUrl!}
                    controls
                    className="w-full h-64 object-cover rounded-lg"
                  />
                )}
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={removeFile}
                  className="absolute top-2 right-2"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          {/* Caption */}
          <div>
            <Label htmlFor="caption">Caption (optional)</Label>
            <Textarea
              id="caption"
              placeholder="Add a caption to your story..."
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              maxLength={200}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {caption.length}/200 characters
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={!selectedFile || loading}
            >
              {loading ? 'Sharing...' : 'Share Story'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}