import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'

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
  const [imageUrl, setImageUrl] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!title.trim()) return
    setLoading(true)

    const { error } = await supabase.from('courses').insert({
      title: title.trim(),
      description: description.trim() || null,
      image_url: imageUrl.trim() || null,
      status: 'published',
      created_by: user?.id,
    })

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    } else {
      toast({ title: 'Course created' })
      setTitle('')
      setDescription('')
      setImageUrl('')
      onOpenChange(false)
      onCreated()
    }
    setLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Course</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Course Title</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Legacy Launchpad Course" />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="What will students learn?" />
          </div>
          <div className="space-y-2">
            <Label>Cover Image URL (optional)</Label>
            <Input value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="https://..." />
          </div>
          <Button onClick={handleSubmit} disabled={loading || !title.trim()} className="w-full">
            {loading ? 'Creating...' : 'Create Course'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
