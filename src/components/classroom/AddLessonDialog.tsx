import { useState, useRef, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { Upload, Loader2, Plus, X } from 'lucide-react'

interface CommunityGroup {
  id: string
  name: string
}

const WORKSPACE_COMMUNITY_NAMES = [
  'Family Business University',
  'The Family Vault',
  'The Family Business Accelerator',
  'The Family Fortune Mastermind',
]

interface ResourceEntry {
  title: string
  resource_type: string
  url: string
  file: File | null
}

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
  const [videoUrl, setVideoUrl] = useState('')
  const [videoType, setVideoType] = useState('embed')
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [communities, setCommunities] = useState<CommunityGroup[]>([])
  const [selectedCommunityIds, setSelectedCommunityIds] = useState<string[]>([])
  const [resources, setResources] = useState<ResourceEntry[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      supabase.from('community_groups').select('id, name').order('name').then(({ data }) => {
        if (data) setCommunities(data.filter(c => WORKSPACE_COMMUNITY_NAMES.includes(c.name)))
      })
    }
  }, [open])

  const toggleCommunity = (id: string) => {
    setSelectedCommunityIds(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    )
  }

  const addResource = () => {
    setResources(prev => [...prev, { title: '', resource_type: 'link', url: '', file: null }])
  }

  const updateResource = (index: number, field: keyof ResourceEntry, value: any) => {
    setResources(prev => prev.map((r, i) => i === index ? { ...r, [field]: value } : r))
  }

  const removeResource = (index: number) => {
    setResources(prev => prev.filter((_, i) => i !== index))
  }

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('video/')) {
      toast({ title: 'Invalid file', description: 'Please select a video file', variant: 'destructive' })
      return
    }
    const maxSize = 50 * 1024 * 1024
    if (file.size > maxSize) {
      const fileSizeMB = (file.size / (1024 * 1024)).toFixed(1)
      toast({ 
        title: 'File too large', 
        description: `Video must be under 50MB (yours is ${fileSizeMB}MB). Try using "Embed" type with a YouTube or Vimeo link instead, or compress the video before uploading.`, 
        variant: 'destructive',
        duration: 8000,
      })
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }
    setUploading(true)
    try {
      const ext = file.name.split('.').pop()
      const filePath = `${user?.id}/${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('course-videos')
        .upload(filePath, file, {
          contentType: file.type,
          cacheControl: '3600',
        })
      if (uploadError) {
        toast({ title: 'Upload failed', description: uploadError.message, variant: 'destructive' })
        return
      }
      const { data: urlData } = supabase.storage.from('course-videos').getPublicUrl(filePath)
      setVideoUrl(urlData.publicUrl)
      toast({ title: 'Video uploaded successfully' })
    } catch (err: any) {
      toast({ title: 'Upload failed', description: err?.message || 'Unknown error', variant: 'destructive' })
    } finally {
      setUploading(false)
    }
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

    // Use description for both fields to keep them in sync
    const lessonContent = description.trim() || null

    const { data: lessonData, error } = await supabase.from('course_videos').insert({
      course_id: courseId,
      module_id: moduleId,
      title: title.trim(),
      description: lessonContent,
      content: lessonContent,
      video_url: videoUrl.trim() || null,
      video_type: videoType,
      order_index: nextOrder,
      created_by: user?.id,
      community_ids: selectedCommunityIds,
    } as any).select().single()

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
      setLoading(false)
      return
    }

    // Create resources if any
    const validResources = resources.filter(r => r.title.trim())
    if (validResources.length > 0 && lessonData) {
      for (const res of validResources) {
        let fileUrl = res.url.trim() || null

        // Upload file if resource type is file and a file was selected
        if (res.file && res.resource_type === 'file') {
          const filePath = `course-resources/${courseId}/${Date.now()}_${res.file.name}`
          const { error: uploadError } = await supabase.storage
            .from('documents')
            .upload(filePath, res.file)
          if (!uploadError) {
            const { data: publicUrl } = supabase.storage.from('documents').getPublicUrl(filePath)
            fileUrl = publicUrl.publicUrl
          }
        }

        await supabase.from('course_resources').insert({
          course_id: courseId,
          lesson_id: lessonData.id,
          title: res.title.trim(),
          resource_type: res.resource_type,
          url: fileUrl,
          created_by: user?.id,
        })
      }
    }

    toast({ title: 'Lesson added' })
    setTitle('')
    setDescription('')
    setContent('')
    setVideoUrl('')
    setSelectedCommunityIds([])
    setResources([])
    onOpenChange(false)
    onCreated()
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

          {/* Resources Section */}
          <div className="space-y-3 pt-2 border-t border-border">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">Resources</Label>
              <Button type="button" variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={addResource}>
                <Plus className="h-3 w-3" /> Add Resource
              </Button>
            </div>
            {resources.map((res, index) => (
              <div key={index} className="space-y-2 p-3 rounded-lg border border-border bg-muted/30 relative">
                <button
                  type="button"
                  onClick={() => removeResource(index)}
                  className="absolute top-2 right-2 text-muted-foreground hover:text-destructive transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
                <Input
                  value={res.title}
                  onChange={e => updateResource(index, 'title', e.target.value)}
                  placeholder="Resource title"
                  className="text-sm"
                />
                <div className="flex gap-2">
                  <Select value={res.resource_type} onValueChange={v => updateResource(index, 'resource_type', v)}>
                    <SelectTrigger className="w-28 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="link">Link</SelectItem>
                      <SelectItem value="pdf">PDF</SelectItem>
                      <SelectItem value="file">File</SelectItem>
                    </SelectContent>
                  </Select>
                  {res.resource_type === 'file' ? (
                    <Input
                      type="file"
                      onChange={e => updateResource(index, 'file', e.target.files?.[0] || null)}
                      className="flex-1 text-xs"
                    />
                  ) : (
                    <Input
                      value={res.url}
                      onChange={e => updateResource(index, 'url', e.target.value)}
                      placeholder="https://..."
                      className="flex-1 text-xs"
                    />
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Community Assignment */}
          <div className="space-y-2">
            <Label>Assign to Communities <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <p className="text-xs text-muted-foreground">Only selected communities will see this lesson. Leave all unchecked to show to everyone.</p>
            <div className="rounded-md border border-border divide-y divide-border">
              {communities.map(c => (
                <label
                  key={c.id}
                  className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/40 transition-colors"
                >
                  <Checkbox
                    checked={selectedCommunityIds.includes(c.id)}
                    onCheckedChange={() => toggleCommunity(c.id)}
                  />
                  <span className="text-sm">{c.name}</span>
                </label>
              ))}
            </div>
            {selectedCommunityIds.length > 0 && (
              <p className="text-xs text-primary font-medium">
                {selectedCommunityIds.length} {selectedCommunityIds.length === 1 ? 'community' : 'communities'} selected
              </p>
            )}
          </div>

          <Button onClick={handleSubmit} disabled={loading || !title.trim()} className="w-full">
            {loading ? 'Adding...' : 'Add Lesson'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
