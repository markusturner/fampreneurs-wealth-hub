import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'

interface Props {
  courseId: string
  lessonId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: () => void
}

export function AddResourceDialog({ courseId, lessonId, open, onOpenChange, onCreated }: Props) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')
  const [resourceType, setResourceType] = useState('link')
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!title.trim()) return
    setLoading(true)

    let fileUrl = url.trim() || null

    // Upload file if provided
    if (file && resourceType === 'file') {
      const filePath = `course-resources/${courseId}/${Date.now()}_${file.name}`
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file)

      if (uploadError) {
        toast({ title: 'Upload failed', description: uploadError.message, variant: 'destructive' })
        setLoading(false)
        return
      }

      const { data: publicUrl } = supabase.storage.from('documents').getPublicUrl(filePath)
      fileUrl = publicUrl.publicUrl
    }

    const { error } = await supabase.from('course_resources').insert({
      course_id: courseId,
      lesson_id: lessonId,
      title: title.trim(),
      resource_type: resourceType,
      url: fileUrl,
      created_by: user?.id,
    })

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    } else {
      toast({ title: 'Resource added' })
      setTitle('')
      setUrl('')
      setFile(null)
      onOpenChange(false)
      onCreated()
    }
    setLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Resource</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Resource Name</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Worksheet, Slides, Reference Guide" />
          </div>
          <div className="space-y-2">
            <Label>How would you like to add this?</Label>
            <Select value={resourceType} onValueChange={setResourceType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="link">Paste a Link</SelectItem>
                <SelectItem value="file">Upload a File</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {resourceType === 'file' ? (
            <div className="space-y-2">
              <Label>Choose File</Label>
              <Input type="file" onChange={e => setFile(e.target.files?.[0] || null)} />
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Link URL</Label>
              <Input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://example.com/resource" />
            </div>
          )}
          <Button onClick={handleSubmit} disabled={loading || !title.trim()} className="w-full bg-[#ffb500] hover:bg-[#2eb2ff] text-foreground">
            {loading ? 'Adding...' : 'Add Resource'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
