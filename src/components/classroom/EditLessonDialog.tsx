import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { Trash2 } from 'lucide-react'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { LessonRichTextEditor } from './LessonRichTextEditor'

interface Lesson {
  id: string
  title: string
  description: string | null
  content: string | null
  video_url: string | null
  video_type: string
  duration_seconds: number | null
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
  const [videoUrl, setVideoUrl] = useState('')
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (lesson) {
      setTitle(lesson.title)
      setVideoUrl(lesson.video_url || '')
      setContent(lesson.content || '')
    }
  }, [lesson])

  const handleSave = async () => {
    if (!lesson || !title.trim()) return
    setLoading(true)
    const { error } = await supabase.from('course_videos').update({
      title: title.trim(),
      video_url: videoUrl.trim() || null,
      content: content || null,
    }).eq('id', lesson.id)

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
            <Label>Lesson Content</Label>
            <LessonRichTextEditor content={content} onChange={setContent} />
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
