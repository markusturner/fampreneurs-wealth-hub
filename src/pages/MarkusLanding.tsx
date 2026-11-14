import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { FunctionsHttpError } from '@supabase/supabase-js'
import { Loader2, Play, CheckCircle2 } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { MARKUS_PLANS, type MarkusPlan } from '@/lib/markus-member'

const FEATURES = [
  ['Markus AI, your private trust and estate AI', '24/7 access'],
  ['Digital Family Office', 'asset values and exposure view'],
  ['TruHeirs app access', 'included'],
  ['Private Markus AI community', 'separate from the Accelerator'],
  ['Monthly live call', 'with the team'],
]

const ASSET_RANGES = ['Under $250K', '$250K to $1M', '$1M to $5M', '$5M to $25M', '$25M+']

function useSeo(title: string, description: string) {
  useEffect(() => {
    const prev = document.title
    document.title = title
    const meta = document.querySelector('meta[name="description"]')
    const prevDesc = meta?.getAttribute('content')
    meta?.setAttribute('content', description)
    return () => { document.title = prev; if (prevDesc) meta?.setAttribute('content', prevDesc) }
  }, [title, description])
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="dark min-h-[100dvh] overflow-y-auto bg-background text-foreground">
      <div className="mx-auto min-h-[100dvh] max-w-4xl border-x border-border/60 bg-card/40 px-5 py-12 sm:px-10">{children}</div>
    </div>
  )
}

export default function MarkusLanding() {
  useSeo('Markus AI | Your AI Family Office', 'Markus AI answers trust and estate questions in real time and maps every asset you own.')
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const go = (plan: MarkusPlan) => navigate(`/markusturnerai/checkout?plan=${plan}`)
  return (
    <Shell>
      <main className="mx-auto max-w-2xl text-center">
        {params.get('payment') === 'cancelled' && <p className="mb-6 rounded-md border border-border p-3 text-sm text-muted-foreground">Your checkout was not finished. You can pick a plan again anytime.</p>}
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-secondary">For families serious about legacy</p>
        <h1 className="mt-3 text-3xl font-bold leading-tight sm:text-4xl">Your AI Family Office. Your Assets, Mapped And Monitored, 24/7.</h1>
        <p className="mx-auto mt-4 max-w-xl text-sm text-muted-foreground sm:text-base">Markus AI answers your trust and estate questions in real time, values every asset you own, and shows you exactly what's exposed. It is the same system our enrolled families run inside the Accelerator.</p>

        <div className="mx-auto mt-8 flex aspect-video w-full items-center justify-center rounded-xl border border-border bg-background text-sm text-muted-foreground">
          <span className="flex items-center gap-2"><Play className="h-4 w-4" />2-minute explainer coming soon</span>
        </div>

        <h2 className="mt-10 text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">What you get</h2>
        <ul className="mt-4 space-y-2 text-left">
          {FEATURES.map(([name, note]) => (
            <li key={name} className="flex items-center justify-between gap-4 rounded-lg border border-border bg-background/60 px-4 py-3 text-sm">
              <span>{name}</span><span className="text-right text-xs text-muted-foreground">{note}</span>
            </li>
          ))}
        </ul>

        <div className="mx-auto mt-8 grid max-w-md gap-4 sm:grid-cols-2">
          {(['monthly', 'annual'] as MarkusPlan[]).map((key) => {
            const p = MARKUS_PLANS[key]
            const best = key === 'annual'
            return (
              <div key={key} className={`rounded-xl border p-5 ${best ? 'border-secondary' : 'border-border'} bg-background/60`}>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">{best ? 'Annual - best value' : 'Monthly'}</p>
                <p className="mt-2 text-3xl font-bold">{p.price}</p>
                <p className="text-xs text-muted-foreground">{p.per}</p>
                {best && <p className="mt-1 text-xs text-secondary">Save vs. monthly</p>}
                <Button className="mt-4 w-full bg-secondary text-secondary-foreground hover:bg-accent hover:text-accent-foreground" onClick={() => go(key)}>Start {p.label}</Button>
              </div>
            )
          })}
        </div>
        <p className="mt-10 text-xs text-muted-foreground">No application. No booked call. Pick a plan and get started today.</p>
      </main>
    </Shell>
  )
}

export function MarkusCheckout() {
  useSeo('Markus AI Checkout', 'Start your Markus AI membership.')
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  const initial = (params.get('plan') === 'monthly' ? 'monthly' : 'annual') as MarkusPlan
  const [plan, setPlan] = useState<MarkusPlan>(initial)
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '', assetRange: '', biggestConcern: '' })
  const [busy, setBusy] = useState(false)
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.assetRange) { toast({ title: 'Pick your asset range', variant: 'destructive' }); return }
    setBusy(true)
    const { data, error } = await supabase.functions.invoke('signup-create-checkout', { body: { flow: 'markus', plan, ...form } })
    if (error || !data?.url) {
      let msg = error?.message || 'Please try again.'
      if (error instanceof FunctionsHttpError) { try { msg = (await error.context.json()).error || msg } catch {} }
      setBusy(false)
      toast({ title: 'Could not start checkout', description: msg, variant: 'destructive' })
      return
    }
    window.location.href = data.url
  }

  return (
    <Shell>
      <main className="mx-auto max-w-lg">
        <button className="text-xs text-muted-foreground hover:text-foreground" onClick={() => navigate('/markusturnerai')}>Back to Markus AI</button>
        <h1 className="mt-4 text-2xl font-bold">Start your Markus AI membership</h1>
        <p className="mt-1 text-sm text-muted-foreground">A few quick details, then secure card payment.</p>
        <div className="mt-6 grid grid-cols-2 gap-3">
          {(['monthly', 'annual'] as MarkusPlan[]).map((key) => (
            <button key={key} type="button" onClick={() => setPlan(key)} className={`rounded-lg border p-3 text-left ${plan === key ? 'border-secondary' : 'border-border'}`}>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">{MARKUS_PLANS[key].label}</p>
              <p className="text-lg font-bold">{MARKUS_PLANS[key].price}<span className="text-xs font-normal text-muted-foreground"> {MARKUS_PLANS[key].per}</span></p>
            </button>
          ))}
        </div>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div><Label htmlFor="fn">First name</Label><Input id="fn" required maxLength={80} value={form.firstName} onChange={set('firstName')} /></div>
            <div><Label htmlFor="ln">Last name</Label><Input id="ln" required maxLength={80} value={form.lastName} onChange={set('lastName')} /></div>
          </div>
          <div><Label htmlFor="em">Email</Label><Input id="em" type="email" required maxLength={200} value={form.email} onChange={set('email')} /></div>
          <div><Label htmlFor="ph">Phone</Label><Input id="ph" type="tel" required maxLength={40} value={form.phone} onChange={set('phone')} /></div>
          <div>
            <Label>About how much are your total assets worth?</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {ASSET_RANGES.map((r) => (
                <button key={r} type="button" onClick={() => setForm((f) => ({ ...f, assetRange: r }))} className={`rounded-full border px-3 py-1.5 text-xs ${form.assetRange === r ? 'border-secondary text-secondary' : 'border-border text-muted-foreground'}`}>{r}</button>
              ))}
            </div>
          </div>
          <div><Label htmlFor="bc">What is your biggest concern about protecting your family's wealth?</Label><Textarea id="bc" required maxLength={1000} rows={3} value={form.biggestConcern} onChange={set('biggestConcern')} /></div>
          <Button type="submit" disabled={busy} className="w-full bg-secondary text-secondary-foreground hover:bg-accent hover:text-accent-foreground">
            {busy ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Starting checkout...</> : `Continue to payment (${MARKUS_PLANS[plan].price} ${MARKUS_PLANS[plan].per})`}
          </Button>
          <p className="text-center text-xs text-muted-foreground">Payments are processed securely by Stripe. Cancel anytime.</p>
        </form>
      </main>
    </Shell>
  )
}

export function MarkusThankYou() {
  useSeo('Welcome to Markus AI', 'Your Markus AI membership is active.')
  return (
    <Shell>
      <main className="mx-auto max-w-lg py-16 text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-secondary" />
        <h1 className="mt-4 text-3xl font-bold">You're in.</h1>
        <p className="mt-3 text-muted-foreground">Check your email in the next few minutes. We sent your login and a temporary password. When you sign in, you'll choose your own password.</p>
        <Button asChild className="mt-8 bg-secondary text-secondary-foreground hover:bg-accent hover:text-accent-foreground"><Link to="/auth">Go to sign in</Link></Button>
      </main>
    </Shell>
  )
}
