import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { useNavigate } from 'react-router-dom'
import { Trash2 } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

interface Props {
  course: { id: string; title: string; description: string | null; image_url: string | null; community_ids?: string[] } | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdated: () => void
}

interface CommunityGroup {
  id: string
  name: string
}

export function EditCourseDialog({ course, open, onOpenChange, onUpdated }: Props) {
  const { toast } = useToast()
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [selectedCommunityIds, setSelectedCommunityIds] = useState<string[]>([])
  const [communityGroups, setCommunityGroups] = useState<CommunityGroup[]>([])
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (course) {
      setTitle(course.title)
      setDescription(course.description || '')
      setImageUrl(course.image_url || '')
      setSelectedCommunityIds(course.community_ids || [])
    }
  }, [course])

  useEffect(() => {
    if (open) {
      supabase.from('community_groups').select('id, name').order('name').then(({ data }) => {
        setCommunityGroups(data || [])
      })
    }
  }, [open])

  const toggleCommunity = (id: string) => {
    setSelectedCommunityIds(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    )
  }

  const handleSubmit = async () => {
    if (!course || !title.trim()) return
    setLoading(true)

    const { error } = await supabase.from('courses').update({
      title: title.trim(),
      description: description.trim() || null,
      image_url: imageUrl.trim() || null,
      community_ids: selectedCommunityIds,
    }).eq('id', course.id)

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    } else {
      toast({ title: 'Course updated' })
      onOpenChange(false)
      onUpdated()
    }
    setLoading(false)
  }

  const handleDelete = async () => {
    if (!course) return
    setDeleting(true)

    const { error } = await supabase.from('courses').delete().eq('id', course.id)

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    } else {
      toast({ title: 'Course deleted' })
      onOpenChange(false)
      navigate('/classroom')
    }
    setDeleting(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Course</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Title</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Cover Image URL</Label>
            <Input value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="https://..." />
          </div>

          <div className="space-y-2">
            <Label>Community Access</Label>
            <p className="text-xs text-muted-foreground">Select which communities can see this course. Leave empty for all users.</p>
            <div className="max-h-40 overflow-y-auto space-y-2 border rounded-md p-3">
              {communityGroups.length === 0 ? (
                <p className="text-xs text-muted-foreground">No community groups found</p>
              ) : (
                communityGroups.map(group => (
                  <div key={group.id} className="flex items-center gap-2">
                    <Checkbox
                      id={`community-${group.id}`}
                      checked={selectedCommunityIds.includes(group.id)}
                      onCheckedChange={() => toggleCommunity(group.id)}
                    />
                    <label htmlFor={`community-${group.id}`} className="text-sm cursor-pointer">
                      {group.name}
                    </label>
                  </div>
                ))
              )}
            </div>
          </div>

          <Button onClick={handleSubmit} disabled={loading || !title.trim()} className="w-full">
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="w-full gap-2" disabled={deleting}>
                <Trash2 className="h-4 w-4" />
                {deleting ? 'Deleting...' : 'Delete Course'}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this course?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete the course and all its modules, lessons, and resources. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </DialogContent>
    </Dialog>
  )
}
