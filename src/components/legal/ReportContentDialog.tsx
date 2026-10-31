import { useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { REPORT_REASONS } from '@/lib/legal'

export type ReportTarget = {
  type: 'post' | 'comment' | 'message' | 'user'
  id: string | null
  userId: string | null
  snapshot?: string
}

export function ReportContentDialog({ target, onClose }: { target: ReportTarget | null; onClose: () => void }) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [reason, setReason] = useState<string>('')
  const [details, setDetails] = useState('')
  const [sending, setSending] = useState(false)

  const close = () => { setReason(''); setDetails(''); onClose() }

  const submit = async () => {
    if (!user || !target || !reason) return
    setSending(true)
    const { error } = await supabase.from('content_reports').insert({
      reporter_id: user.id,
      target_type: target.type,
      target_id: target.id,
      reported_user_id: target.userId,
      reason,
      details: details.trim() || null,
      content_snapshot: target.snapshot?.slice(0, 2000) ?? null,
    })
    setSending(false)
    if (error) {
      toast({ title: 'Report not sent', description: 'Please try again.', variant: 'destructive' })
      return
    }
    toast({ title: 'Report sent', description: 'Thanks. Our moderators will review it, usually within 24 hours.' })
    close()
  }

  return (
    <Dialog open={!!target} onOpenChange={open => { if (!open) close() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Report</DialogTitle>
          <DialogDescription>Tell us what's wrong. The person you report won't see who reported them.</DialogDescription>
        </DialogHeader>
        <RadioGroup value={reason} onValueChange={setReason} aria-label="Reason for report" className="space-y-1">
          {REPORT_REASONS.map(r => (
            <div key={r.value} className="flex items-center gap-2">
              <RadioGroupItem value={r.value} id={`report-${r.value}`} />
              <Label htmlFor={`report-${r.value}`} className="font-normal">{r.label}</Label>
            </div>
          ))}
        </RadioGroup>
        <div className="space-y-1.5">
          <Label htmlFor="report-details">More details (optional)</Label>
          <Textarea id="report-details" value={details} onChange={e => setDetails(e.target.value)} maxLength={1000} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={close}>Cancel</Button>
          <Button onClick={submit} disabled={!reason || sending}>{sending ? 'Sending...' : 'Send report'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
