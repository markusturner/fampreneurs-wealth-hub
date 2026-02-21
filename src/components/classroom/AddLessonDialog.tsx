import { useState, useRef } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { Upload, Loader2 } from 'lucide-react'

interface Props {
  courseId: string
  moduleId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: () => void
}

export function AddLessonDialog({ courseId, moduleId, open, onOpenChange, onCreated }: Props) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [content, setContent] = useState('')
  const [videoUrl, setVideoUrl] = useState('')
  const [videoType, setVideoType] = useState('embed')
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('video/')) {
      toast({ title: 'Invalid file', description: 'Please select a video file', variant: 'destructive' })
      return
    }
    setUploading(true)
    const ext = file.name.split('.').pop()
    const filePath = `${user?.id}/${Date.now()}.${ext}`
    const { error: uploadError } = await supabase.storage.from('course-videos').upload(filePath, file)
    if (uploadError) {
      toast({ title: 'Upload failed', description: uploadError.message, variant: 'destructive' })
      setUploading(false)
      return
    }
    const { data: urlData } = supabase.storage.from('course-videos').getPublicUrl(filePath)
    setVideoUrl(urlData.publicUrl)
    setUploading(false)
    toast({ title: 'Video uploaded successfully' })
  }

  const handleSubmit = async () => {
    if (!title.trim()) return
    setLoading(true)

    // Get next order index
    const query = supabase
      .from('course_videos')
      .select('order_index')
      .eq('course_id', courseId)
    
    if (moduleId) query.eq('module_id', moduleId)
    
    const { data: existing } = await query.order('order_index', { ascending: false }).limit(1)
    const nextOrder = (existing?.[0]?.order_index ?? -1) + 1

    const { error } = await supabase.from('course_videos').insert({
      course_id: courseId,
      module_id: moduleId,
      title: title.trim(),
      description: description.trim() || null,
      content: content.trim() || null,
      video_url: videoUrl.trim() || null,
      video_type: videoType,
      order_index: nextOrder,
      created_by: user?.id,
    })

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    } else {
      toast({ title: 'Lesson added' })
      setTitle('')
      setDescription('')
      setContent('')
      setVideoUrl('')
      onOpenChange(false)
      onCreated()
    }
    setLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Lesson</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Title</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Lesson title" />
          </div>
          <div className="space-y-2">
            <Label>Goal / Description</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="What will students learn?" />
          </div>
          <div className="space-y-2">
            <Label>Lesson Content</Label>
            <Textarea value={content} onChange={e => setContent(e.target.value)} placeholder="Lesson summary, action steps, notes..." className="min-h-[120px]" />
          </div>
          <div className="space-y-2">
            <Label>Video Type</Label>
            <Select value={videoType} onValueChange={setVideoType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="embed">Embed (YouTube/Vimeo/Loom)</SelectItem>
                <SelectItem value="upload">Uploaded Video</SelectItem>
                <SelectItem value="external">External Link</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {videoType === 'upload' ? (
            <div className="space-y-2">
              <Label>Upload Video</Label>
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                onChange={handleVideoUpload}
                className="hidden"
              />
              {videoUrl ? (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground truncate">{videoUrl.split('/').pop()}</p>
                  <Button type="button" variant="outline" size="sm" onClick={() => { setVideoUrl(''); if (fileInputRef.current) fileInputRef.current.value = '' }}>
                    Replace Video
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-24 border-dashed flex flex-col gap-2"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? (
                    <><Loader2 className="h-6 w-6 animate-spin" /><span className="text-sm">Uploading...</span></>
                  ) : (
                    <><Upload className="h-6 w-6" /><span className="text-sm">Click to upload a video</span></>
                  )}
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Video URL (YouTube, Vimeo, Loom, or direct link)</Label>
              <Input value={videoUrl} onChange={e => setVideoUrl(e.target.value)} placeholder="https://youtube.com/watch?v=..." />
            </div>
          )}
          <Button onClick={handleSubmit} disabled={loading || !title.trim()} className="w-full">
            {loading ? 'Adding...' : 'Add Lesson'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
