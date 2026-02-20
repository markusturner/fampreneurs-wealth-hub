import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { Upload, X, ImageIcon } from 'lucide-react'

interface CommunityGroup {
  id: string
  name: string
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: () => void
}

export function AddCourseDialog({ open, onOpenChange, onCreated }: Props) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [communityId, setCommunityId] = useState<string>('none')
  const [isPrivate, setIsPrivate] = useState(false)
  const [loading, setLoading] = useState(false)
  const [communities, setCommunities] = useState<CommunityGroup[]>([])

  useEffect(() => {
    if (open) {
      supabase.from('community_groups').select('id, name').order('name').then(({ data }) => {
        if (data) setCommunities(data)
      })
    }
  }, [open])

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  const clearImage = () => {
    setImageFile(null)
    setImagePreview(null)
  }

  const reset = () => {
    setTitle('')
    setDescription('')
    setImageFile(null)
    setImagePreview(null)
    setCommunityId('none')
    setIsPrivate(false)
  }

  const handleSubmit = async () => {
    if (!title.trim()) return
    setLoading(true)

    let imageUrl: string | null = null

    // Upload image if provided
    if (imageFile) {
      const filePath = `course-covers/${Date.now()}_${imageFile.name}`
      const { error: uploadError } = await supabase.storage
        .from('cover-photos')
        .upload(filePath, imageFile)

      if (uploadError) {
        toast({ title: 'Image upload failed', description: uploadError.message, variant: 'destructive' })
        setLoading(false)
        return
      }

      const { data: publicUrlData } = supabase.storage.from('cover-photos').getPublicUrl(filePath)
      imageUrl = publicUrlData.publicUrl
    }

    const { error } = await supabase.from('courses').insert({
      title: title.trim(),
      description: description.trim() || null,
      image_url: imageUrl,
      status: 'published',
      created_by: user?.id,
      community_id: communityId === 'none' ? null : communityId,
      is_private: isPrivate,
    } as any)

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    } else {
      toast({ title: 'Course created' })
      reset()
      onOpenChange(false)
      onCreated()
    }
    setLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v) }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Course</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Title */}
          <div className="space-y-2">
            <Label>Course Title</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Legacy Launchpad Course" />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="What will students learn?" />
          </div>

          {/* Cover Image Upload */}
          <div className="space-y-2">
            <Label>Cover Image</Label>
            {imagePreview ? (
              <div className="relative w-full h-36 rounded-md overflow-hidden border border-border">
                <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                <button
                  onClick={clearImage}
                  className="absolute top-2 right-2 bg-background/80 backdrop-blur-sm rounded-full p-1 hover:bg-background transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed border-border rounded-md cursor-pointer hover:border-primary/50 transition-colors bg-muted/30">
                <ImageIcon className="h-8 w-8 text-muted-foreground mb-2" />
                <span className="text-sm text-muted-foreground">Click to upload cover photo</span>
                <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
              </label>
            )}
          </div>

          {/* Community Assignment */}
          <div className="space-y-2">
            <Label>Assign to Community (optional)</Label>
            <Select value={communityId} onValueChange={setCommunityId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a community..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No community</SelectItem>
                {communities.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Privacy Toggle */}
          <div className="flex items-center justify-between rounded-md border border-border px-4 py-3">
            <div>
              <p className="text-sm font-medium">Private Course</p>
              <p className="text-xs text-muted-foreground">
                {isPrivate ? 'Only invited members can access this course' : 'Visible to all members'}
              </p>
            </div>
            <Switch checked={isPrivate} onCheckedChange={setIsPrivate} />
          </div>

          <Button onClick={handleSubmit} disabled={loading || !title.trim()} className="w-full">
            {loading ? 'Creating...' : 'Create Course'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
