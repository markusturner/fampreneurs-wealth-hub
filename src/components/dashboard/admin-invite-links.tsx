import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Link2, Copy, Trash2, Loader2, Plus, DollarSign, Infinity as InfinityIcon, Clock } from 'lucide-react'
import { format } from 'date-fns'

type InviteType = 'temporary' | 'permanent'
type PlanType = 'free' | 'paid_in_full' | 'payment_plan'
type RoleType = 'trustee' | 'family_office_member' | 'family_member'

const PROGRAM_OPTIONS = [
  'Family Business University',
  'The Family Vault',
  'The Family Business Accelerator',
  'The Family Fortune Mastermind',
]

const DURATION_PRESETS: Record<string, number | null> = {
  '30m': 30 * 60 * 1000,
  '1h': 60 * 60 * 1000,
  '6h': 6 * 60 * 60 * 1000,
  '1d': 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
  '30d': 30 * 24 * 60 * 60 * 1000,
  never: null,
}

function makeToken(len = 10) {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  const arr = new Uint8Array(len)
  crypto.getRandomValues(arr)
  return Array.from(arr, (b) => chars[b % chars.length]).join('')
}

export function AdminInviteLinks() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [links, setLinks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)

  // form
  const [inviteType, setInviteType] = useState<InviteType>('temporary')
  const [duration, setDuration] = useState<string>('7d')
  const [maxUsesInput, setMaxUsesInput] = useState<string>('1')
  const [role, setRole] = useState<RoleType>('family_member')
  const [programName, setProgramName] = useState('')
  const [tfbaVariant, setTfbaVariant] = useState<'standard' | 'vip_weekend'>('standard')
  const [truheirsAccess, setTruheirsAccess] = useState(true)
  const [planType, setPlanType] = useState<PlanType>('free')
  const [totalAmount, setTotalAmount] = useState('')
  const [installmentAmount, setInstallmentAmount] = useState('')
  const [installmentFrequency, setInstallmentFrequency] = useState<'monthly' | 'weekly' | 'biweekly'>('monthly')
  const [paymentStartDate, setPaymentStartDate] = useState('')
  const [note, setNote] = useState('')


  const load = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('invite_links' as any)
      .select('*')
      .order('created_at', { ascending: false })
    setLinks((data as any[]) || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const inviteUrl = (token: string) =>
    `https://truheirs.app/invite/${token}`

  const copyLink = async (token: string) => {
    await navigator.clipboard.writeText(inviteUrl(token))
    toast({ title: 'Copied!', description: 'Invite link copied to clipboard.' })
  }

  const revoke = async (id: string) => {
    const { error } = await supabase.from('invite_links' as any).update({ is_active: false }).eq('id', id)
    if (error) return toast({ title: 'Failed', description: error.message, variant: 'destructive' })
    toast({ title: 'Revoked' })
    load()
  }

  const remove = async (id: string) => {
    const { error } = await supabase.from('invite_links' as any).delete().eq('id', id)
    if (error) return toast({ title: 'Failed', description: error.message, variant: 'destructive' })
    toast({ title: 'Deleted' })
    load()
  }

  const create = async () => {
    if (planType !== 'free' && (!totalAmount || isNaN(Number(totalAmount)))) {
      return toast({ title: 'Missing amount', description: 'Enter total program amount.', variant: 'destructive' })
    }
    if (planType === 'payment_plan' && (!installmentAmount || !paymentStartDate)) {
      return toast({ title: 'Missing payment plan info', description: 'Fill installment amount and start date.', variant: 'destructive' })
    }

    setCreating(true)
    const token = makeToken(10)

    let expires_at: string | null = null
    let max_uses: number | null = null

    if (inviteType === 'temporary') {
      const ms = DURATION_PRESETS[duration]
      if (ms) expires_at = new Date(Date.now() + ms).toISOString()
      const n = parseInt(maxUsesInput)
      max_uses = maxUsesInput === '' || isNaN(n) || n <= 0 ? null : n
    }

    const effectiveProgram = programName === 'The Family Business Accelerator' && tfbaVariant === 'vip_weekend'
      ? 'The Family Business Accelerator (VIP Weekend)'
      : (programName || null)

    const { error } = await supabase.from('invite_links' as any).insert({
      token,
      created_by: user?.id,
      invite_type: inviteType,
      expires_at,
      max_uses,
      role,
      program_name: effectiveProgram,
      truheirs_access: truheirsAccess,
      plan_type: planType,
      total_amount: planType !== 'free' ? Number(totalAmount) : null,
      installment_amount: planType === 'payment_plan' ? Number(installmentAmount) : null,
      installment_frequency: planType === 'payment_plan' ? installmentFrequency : null,
      payment_start_date: planType === 'payment_plan' ? paymentStartDate : null,
      note: note || null,
    })


    setCreating(false)
    if (error) return toast({ title: 'Failed', description: error.message, variant: 'destructive' })

    toast({ title: 'Invite link created', description: 'Copy the link and share it.' })
    setNote('')
    setTotalAmount('')
    setInstallmentAmount('')
    setPaymentStartDate('')
    load()
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Link2 className="h-5 w-5" style={{ color: '#ffb500' }} />
            <CardTitle>Create Invite Link</CardTitle>
          </div>
          <CardDescription>
            Generate a shareable URL that new members can use to join — just like Discord. Choose temporary (expires or limited uses) or permanent (never expires).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Link Type</Label>
              <Select value={inviteType} onValueChange={(v) => setInviteType(v as InviteType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="temporary"><span className="inline-flex items-center gap-2"><Clock className="h-3.5 w-3.5" /> Temporary</span></SelectItem>
                  <SelectItem value="permanent"><span className="inline-flex items-center gap-2"><InfinityIcon className="h-3.5 w-3.5" /> Permanent</span></SelectItem>
                </SelectContent>
              </Select>
            </div>

            {inviteType === 'temporary' && (
              <>
                <div className="space-y-2">
                  <Label>Expires After</Label>
                  <Select value={duration} onValueChange={setDuration}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30m">30 minutes</SelectItem>
                      <SelectItem value="1h">1 hour</SelectItem>
                      <SelectItem value="6h">6 hours</SelectItem>
                      <SelectItem value="1d">1 day</SelectItem>
                      <SelectItem value="7d">7 days</SelectItem>
                      <SelectItem value="30d">30 days</SelectItem>
                      <SelectItem value="never">Never (uses only)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Max Uses (blank = unlimited)</Label>
                  <Input type="number" min="1" value={maxUsesInput} onChange={(e) => setMaxUsesInput(e.target.value)} placeholder="e.g. 1, 10, 100" />
                </div>
              </>
            )}
          </div>

          <Separator />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={role} onValueChange={(v) => setRole(v as RoleType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="trustee">Trustee</SelectItem>
                  <SelectItem value="family_office_member">Family Office Member</SelectItem>
                  <SelectItem value="family_member">Family Member</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Program</Label>
              <Select value={programName} onValueChange={setProgramName}>
                <SelectTrigger><SelectValue placeholder="Select a program (optional)" /></SelectTrigger>
                <SelectContent>
                  {PROGRAM_OPTIONS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
              {programName === 'The Family Business Accelerator' && (
                <div className="pt-2">
                  <Label className="text-xs text-muted-foreground">Sub-option</Label>
                  <Select value={tfbaVariant} onValueChange={(v) => setTfbaVariant(v as 'standard' | 'vip_weekend')}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="standard">Standard (Accelerator only)</SelectItem>
                      <SelectItem value="vip_weekend">VIP Weekend (sends VIP Weekend Agreement)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    VIP Weekend still joins the Accelerator program, but the invitee signs the VIP Weekend agreement.
                  </p>
                </div>
              )}
            </div>


          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <Label>TruHeirs Section Access</Label>
              <p className="text-xs text-muted-foreground">Grants access to TruHeirs dashboard and family office features.</p>
            </div>
            <Switch checked={truheirsAccess} onCheckedChange={setTruheirsAccess} />
          </div>

          <div className="border rounded-lg p-4 space-y-4 bg-muted/30">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" style={{ color: '#ffb500' }} />
              <Label className="text-base font-semibold">Payment Details</Label>
            </div>
            <div className="space-y-2">
              <Label>Payment Type</Label>
              <Select value={planType} onValueChange={(v) => setPlanType(v as PlanType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">Free</SelectItem>
                  <SelectItem value="paid_in_full">Paid in Full</SelectItem>
                  <SelectItem value="payment_plan">Payment Plan</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {planType !== 'free' && (
              <div className="space-y-2">
                <Label>Total Program Amount ($)</Label>
                <Input type="number" min="0" value={totalAmount} onChange={(e) => setTotalAmount(e.target.value)} placeholder="e.g. 5000" />
              </div>
            )}
            {planType === 'payment_plan' && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Installment Amount ($)</Label>
                  <Input type="number" min="0" value={installmentAmount} onChange={(e) => setInstallmentAmount(e.target.value)} placeholder="e.g. 500" />
                </div>
                <div className="space-y-2">
                  <Label>Frequency</Label>
                  <Select value={installmentFrequency} onValueChange={(v) => setInstallmentFrequency(v as any)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="biweekly">Bi-Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>First Payment Due Date</Label>
                  <Input type="date" value={paymentStartDate} onChange={(e) => setPaymentStartDate(e.target.value)} />
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Internal Note (optional)</Label>
            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Twitter launch, John's referrals..." />
          </div>

          <Button onClick={create} disabled={creating} className="w-full" style={{ backgroundColor: '#ffb500', color: '#290a52' }}>
            {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
            Create Invite Link
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Active & Past Invite Links</CardTitle>
          <CardDescription>Copy to share, revoke to disable, delete to remove.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
          ) : links.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No invite links yet.</p>
          ) : (
            <div className="space-y-3">
              {links.map((l) => {
                const expired = l.expires_at && new Date(l.expires_at).getTime() < Date.now()
                const maxedOut = l.max_uses != null && l.uses_count >= l.max_uses
                const status = !l.is_active ? 'Revoked' : expired ? 'Expired' : maxedOut ? 'Used up' : 'Active'
                const statusColor = status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-muted text-muted-foreground'
                return (
                  <div key={l.id} className="rounded-lg border p-3 space-y-2">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <Badge className={`text-xs ${statusColor}`}>{status}</Badge>
                          <Badge variant="outline" className="text-xs capitalize">{l.invite_type}</Badge>
                          {l.program_name && <Badge variant="outline" className="text-xs">{l.program_name}</Badge>}
                          <Badge variant="outline" className="text-xs capitalize">{l.plan_type.replace('_', ' ')}</Badge>
                        </div>
                        <code className="text-xs bg-muted px-2 py-1 rounded break-all">{inviteUrl(l.token)}</code>
                        <p className="text-xs text-muted-foreground mt-1">
                          Uses: {l.uses_count}{l.max_uses != null ? ` / ${l.max_uses}` : ''} · Created {format(new Date(l.created_at), 'MMM d, yyyy')}
                          {l.expires_at ? ` · Expires ${format(new Date(l.expires_at), 'MMM d, yyyy h:mm a')}` : ''}
                          {l.note ? ` · ${l.note}` : ''}
                        </p>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <Button size="sm" variant="outline" onClick={() => copyLink(l.token)}>
                          <Copy className="h-3.5 w-3.5 mr-1" /> Copy
                        </Button>
                        {l.is_active && (
                          <Button size="sm" variant="outline" onClick={() => revoke(l.id)}>Revoke</Button>
                        )}
                        <Button size="sm" variant="ghost" onClick={() => remove(l.id)}>
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
