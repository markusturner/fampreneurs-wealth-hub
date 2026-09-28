import { useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { CreditCard, PauseCircle, PlayCircle, Mail } from 'lucide-react'
import { useIsAdminOrOwner } from '@/hooks/useIsAdminOrOwner'

async function readError(error: any) {
  try { const t = await error?.context?.text?.(); return JSON.parse(t).error || t } catch { return error?.message || 'Something went wrong' }
}

export function TruHeirsBillingCard() {
  const { profile, refreshProfile } = useAuth() as any
  const { isAdminOrOwner } = useIsAdminOrOwner() as any
  const [busy, setBusy] = useState<string | null>(null)
  const [cancelOpen, setCancelOpen] = useState(false)
  const paused = profile?.subscription_paused === true

  const openPortal = async () => {
    setBusy('portal')
    const { data, error } = await supabase.functions.invoke('customer-portal')
    setBusy(null)
    if (error) return toast.error(await readError(error))
    if (data?.url) window.open(data.url, '_blank')
  }

  const setPause = async (action: 'pause' | 'resume') => {
    setBusy(action)
    const { error } = await supabase.functions.invoke('pause-subscription', { body: { action } })
    setBusy(null)
    if (error) return toast.error(await readError(error))
    setCancelOpen(false)
    toast.success(action === 'pause' ? 'Your account is paused. Your data is saved.' : 'Welcome back! Your account is active.')
    await refreshProfile?.()
    if (action === 'resume') window.location.reload()
  }

  const sendTestReport = async () => {
    setBusy('report')
    const { error } = await supabase.functions.invoke('family-report', { body: { test: true } })
    setBusy(null)
    if (error) return toast.error(await readError(error))
    toast.success('Test Family Report sent to your email.')
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>TruHeirs Subscription</CardTitle>
        <CardDescription>{paused ? 'Your account is paused ($29/mo). Your data is saved.' : 'Manage your card and plan.'}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={openPortal} disabled={!!busy}>
          <CreditCard className="mr-2 h-4 w-4" /> Update card
        </Button>
        {paused ? (
          <Button onClick={() => setPause('resume')} disabled={!!busy}>
            <PlayCircle className="mr-2 h-4 w-4" /> Resume my account
          </Button>
        ) : (
          <Button variant="ghost" onClick={() => setCancelOpen(true)} disabled={!!busy}>
            Pause or cancel
          </Button>
        )}
        {isAdminOrOwner && (
          <Button variant="outline" onClick={sendTestReport} disabled={!!busy}>
            <Mail className="mr-2 h-4 w-4" /> Send test Family Report
          </Button>
        )}
      </CardContent>

      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Before you go, pause instead?</DialogTitle>
            <DialogDescription>
              For $29/mo we keep all your family office data safe. Come back anytime and pick up right where you left off.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Button onClick={() => setPause('pause')} disabled={!!busy}>
              <PauseCircle className="mr-2 h-4 w-4" /> Pause for $29/mo
            </Button>
            <Button variant="ghost" className="text-muted-foreground" onClick={openPortal} disabled={!!busy}>
              No thanks, cancel my subscription
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
