import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, CreditCard, CheckCircle2 } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { TRUHEIRS_SOFTWARE_PRICE_ID } from '@/lib/stripe-programs'

interface Props {
  user: { user_id: string; email?: string | null; truheirs_paid_until?: string | null; software_only?: boolean | null }
  onChanged?: () => void
}

// TruHeirs software subscription ($247/qtr). Software (DFO) only, no community or content.
export function TruHeirsSubscriptionPanel({ user, onChanged }: Props) {
  const { toast } = useToast()
  const [busy, setBusy] = useState<'link' | 'manual' | null>(null)
  const paidUntil = user.truheirs_paid_until
  const active = !!paidUntil && paidUntil >= new Date().toISOString().slice(0, 10)

  const sendLink = async () => {
    if (!user.email) return toast({ title: 'No email on this record', variant: 'destructive' })
    setBusy('link')
    try {
      const email = user.email.split(' · ')[0].trim()
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { price_id: TRUHEIRS_SOFTWARE_PRICE_ID, mode: 'subscription', email, program_name: 'TruHeirs Software', for_client: true },
      })
      if (error || !data?.url) throw error || new Error('No link')
      try { await navigator.clipboard.writeText(data.url) } catch { /* ignore */ }
      window.open(data.url, '_blank')
      toast({ title: 'Checkout opened', description: 'The payment link was also copied so you can text it to them.' })
    } catch (e: any) {
      toast({ title: 'Could not create payment link', description: e?.message, variant: 'destructive' })
    } finally { setBusy(null) }
  }

  const logManual = async () => {
    setBusy('manual')
    try {
      const until = new Date(Date.now() + 92 * 86400000).toISOString().slice(0, 10)
      const { error } = await supabase.from('profiles')
        .update({ truheirs_access: true, software_only: true, truheirs_paid_until: until } as any)
        .eq('user_id', user.user_id)
      if (error) throw error
      const { data: existing } = await supabase.from('client_retention_notes').select('id').eq('user_id', user.user_id).maybeSingle()
      if (existing?.id) await supabase.from('client_retention_notes').update({ status_override: 'continuity' }).eq('id', existing.id)
      else await supabase.from('client_retention_notes').insert({ user_id: user.user_id, note: '', status_override: 'continuity' } as any)
      toast({ title: 'Payment logged', description: 'TruHeirs access is back on and they moved to Continuity.' })
      onChanged?.()
    } catch (e: any) {
      toast({ title: 'Could not log payment', description: e?.message, variant: 'destructive' })
    } finally { setBusy(null) }
  }

  return (
    <div className="flex justify-between items-start gap-2">
      <span className="text-muted-foreground shrink-0 pt-0.5">TruHeirs Subscription</span>
      <div className="flex flex-col items-end gap-1.5">
        {active
          ? <Badge className="bg-green-600 text-white text-[10px]"><CheckCircle2 className="h-3 w-3 mr-1" />Paid until {paidUntil}</Badge>
          : <span className="text-xs text-muted-foreground">$247/quarter, software only</span>}
        <div className="flex gap-1.5">
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={sendLink} disabled={!!busy}>
            {busy === 'link' ? <Loader2 className="h-3 w-3 animate-spin" /> : <CreditCard className="h-3 w-3 mr-1" />} Card payment
          </Button>
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={logManual} disabled={!!busy}>
            {busy === 'manual' ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Log payment'}
          </Button>
        </div>
      </div>
    </div>
  )
}
