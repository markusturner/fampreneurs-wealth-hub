import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { Trash2 } from 'lucide-react'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

interface Resource {
  id: string
  title: string
  resource_type: string
  url: string | null
  file_path: string | null
}

interface Props {
  resource: Resource | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdated: () => void
}

export function EditResourceDialog({ resource, open, onOpenChange, onUpdated }: Props) {
  const { toast } = useToast()
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')
  const [resourceType, setResourceType] = useState('link')
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (resource) {
      setTitle(resource.title)
      setUrl(resource.url || resource.file_path || '')
      setResourceType(resource.resource_type)
    }
  }, [resource])

  const handleSave = async () => {
    if (!resource || !title.trim()) return
    setLoading(true)
    const { error } = await supabase.from('course_resources').update({
      title: title.trim(),
      resource_type: resourceType,
      url: url.trim() || null,
    }).eq('id', resource.id)

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    } else {
      toast({ title: 'Resource updated' })
      onOpenChange(false)
      onUpdated()
    }
    setLoading(false)
  }

  const handleDelete = async () => {
    if (!resource) return
    setDeleting(true)
    const { error } = await supabase.from('course_resources').delete().eq('id', resource.id)
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    } else {
      toast({ title: 'Resource deleted' })
      onOpenChange(false)
      onUpdated()
    }
    setDeleting(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Resource</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Title</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Resource name" />
          </div>
          <div className="space-y-2">
            <Label>Type</Label>
            <Select value={resourceType} onValueChange={setResourceType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="link">Link</SelectItem>
                <SelectItem value="pdf">PDF</SelectItem>
                <SelectItem value="file">File</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>URL</Label>
            <Input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://..." />
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
                  <AlertDialogTitle>Delete this resource?</AlertDialogTitle>
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
