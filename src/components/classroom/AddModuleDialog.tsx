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
  courseId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: () => void
}

export function AddModuleDialog({ courseId, open, onOpenChange, onCreated }: Props) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!title.trim()) return
    setLoading(true)

    // Get next order index
    const { data: existing } = await supabase
      .from('course_modules')
      .select('order_index')
      .eq('course_id', courseId)
      .order('order_index', { ascending: false })
      .limit(1)

    const nextOrder = (existing?.[0]?.order_index ?? -1) + 1

    const { error } = await supabase.from('course_modules').insert({
      course_id: courseId,
      title: title.trim(),
      description: description.trim() || null,
      order_index: nextOrder,
      created_by: user?.id,
    })

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    } else {
      toast({ title: 'Module added' })
      setTitle('')
      setDescription('')
      onOpenChange(false)
      onCreated()
    }
    setLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Module</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Title</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Week #1: Trust Education" />
          </div>
          <div className="space-y-2">
            <Label>Description (optional)</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Module description..." />
          </div>
          <Button onClick={handleSubmit} disabled={loading || !title.trim()} className="w-full bg-[#ffb500] hover:bg-[#2eb2ff] text-foreground">
            {loading ? 'Adding...' : 'Add Module'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
