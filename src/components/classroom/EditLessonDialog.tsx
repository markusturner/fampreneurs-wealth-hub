import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { Trash2 } from 'lucide-react'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { LessonRichTextEditor } from './LessonRichTextEditor'

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

interface Lesson {
  id: string
  title: string
  description: string | null
  content: string | null
  video_url: string | null
  video_type: string
  duration_seconds: number | null
  community_ids: string[]
}

interface Props {
  lesson: Lesson | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdated: () => void
}

export function EditLessonDialog({ lesson, open, onOpenChange, onUpdated }: Props) {
  const { toast } = useToast()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [videoUrl, setVideoUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [communities, setCommunities] = useState<CommunityGroup[]>([])
  const [selectedCommunityIds, setSelectedCommunityIds] = useState<string[]>([])

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

  useEffect(() => {
    if (lesson) {
      setTitle(lesson.title)
      setDescription(lesson.content || lesson.description || '')
      setVideoUrl(lesson.video_url || '')
      setSelectedCommunityIds(lesson.community_ids || [])
    }
  }, [lesson])

  const handleSave = async () => {
    if (!lesson || !title.trim()) return
    setLoading(true)
    const { error } = await supabase.from('course_videos').update({
      title: title.trim(),
      description: description.trim() || null,
      content: description.trim() || null,
      video_url: videoUrl.trim() || null,
      community_ids: selectedCommunityIds,
    } as any).eq('id', lesson.id)

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    } else {
      toast({ title: 'Lesson updated' })
      onOpenChange(false)
      onUpdated()
    }
    setLoading(false)
  }

  const handleDelete = async () => {
    if (!lesson) return
    setDeleting(true)
    const { error } = await supabase.from('course_videos').delete().eq('id', lesson.id)
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    } else {
      toast({ title: 'Lesson deleted' })
      onOpenChange(false)
      onUpdated()
    }
    setDeleting(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Lesson</DialogTitle>
        </DialogHeader>
        <div className="space-y-5">
          <div className="space-y-2">
            <Label>Lesson Title</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Lesson title" />
          </div>
          <div className="space-y-2">
            <Label>Video URL (YouTube, Vimeo, Loom, or direct link)</Label>
            <Input value={videoUrl} onChange={e => setVideoUrl(e.target.value)} placeholder="https://youtube.com/watch?v=..." />
          </div>
          <div className="space-y-2">
            <Label>Lesson Description / Content</Label>
            <LessonRichTextEditor content={description} onChange={setDescription} />
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
          <div className="flex gap-3">
            <Button onClick={handleSave} disabled={loading || !title.trim()} className="flex-1">
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={deleting} className="gap-2">
                  <Trash2 className="h-4 w-4" />
                  {deleting ? 'Deleting...' : 'Delete'}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this lesson?</AlertDialogTitle>
                  <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
