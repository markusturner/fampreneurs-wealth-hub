import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { ProgramRestrictPicker } from './ProgramRestrictPicker'

interface Props {
  moduleId: string | null
  initial: string[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void
}

export function ModuleRestrictDialog({ moduleId, initial, open, onOpenChange, onSaved }: Props) {
  const { toast } = useToast()
  const [programs, setPrograms] = useState<string[]>(initial || [])
  const [saving, setSaving] = useState(false)

  useEffect(() => { if (open) setPrograms(initial || []) }, [open, initial])

  const save = async () => {
    if (!moduleId) return
    setSaving(true)
    const { error } = await supabase.from('course_modules').update({ required_programs: programs } as any).eq('id', moduleId)
    setSaving(false)
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
      return
    }
    toast({ title: 'Module access updated' })
    onOpenChange(false)
    onSaved()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Restrict module access</DialogTitle>
        </DialogHeader>
        <ProgramRestrictPicker value={programs} onChange={setPrograms} />
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving} style={{ backgroundColor: '#ffb500', color: '#290a52' }}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
