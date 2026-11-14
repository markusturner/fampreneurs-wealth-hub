import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { FunctionsHttpError } from '@supabase/supabase-js'
import { Loader2, Play, CheckCircle2, ArrowRight, Bot, Phone, LayoutDashboard, ShieldAlert, FileLock2, Users, MessageSquare, Smartphone, Sparkles, Check } from 'lucide-react'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import estate from '@/assets/markus-estate-dusk.jpg'
import markusPhoto from '@/assets/markus_call_photo.png.asset.json'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { MARKUS_PLANS, type MarkusPlan } from '@/lib/markus-member'

const FEATURES = [
  { icon: Bot, title: 'A digital AI clone of Markus, on call 24/7', body: 'Ask the AI version of Markus anything, day or night, and get clear answers in plain English. It thinks the way Markus teaches, remembers your family and your goals, and never makes you start over.', wide: true },
  { icon: Phone, title: 'Talk to Markus by voice', body: 'Tap call and hear Markus in his own voice. Every call turns into a written chat you can come back to.' },
  { icon: LayoutDashboard, title: 'Your whole net worth on one screen', body: 'Bank accounts, investments, real estate and businesses, all in one private Digital Family Office.' },
  { icon: ShieldAlert, title: 'See what is exposed before it costs you', body: 'Spot the assets left open to lawsuits, probate and estate taxes, and know what to ask about first.' },
  { icon: FileLock2, title: 'A private vault for what matters', body: 'Upload deeds, policies and statements. Markus reads them so his answers fit your real situation.' },
  { icon: Users, title: 'Bring your family into the plan', body: 'Family calendar, family members and a family constitution, so the next generation knows the plan.', wide: true },
  { icon: MessageSquare, title: 'A private room of serious families', body: 'Join the Markus AI Members community and learn from families building the same kind of legacy.' },
  { icon: Smartphone, title: 'In your pocket on iPhone', body: 'Everything comes with the TruHeirs app, so your family office goes where you go.' },
]

const PAINS = [
  { title: 'Your wealth is scattered', body: 'Accounts, properties and paperwork live in ten different places. Nobody sees the full picture.' },
  { title: 'You do not know what is exposed', body: 'One lawsuit, one probate court or one tax bill can undo decades of hard work.' },
  { title: 'Your heirs would not know where to start', body: 'If something happened tomorrow, would your family know what you own and what to do?' },
]

const STEPS = [
  { n: '01', title: 'Pick your plan', body: 'Monthly or annual. Checkout takes about two minutes.' },
  { n: '02', title: 'Get your login', body: 'Your login arrives by email right away. Choose your own password on first sign-in.' },
  { n: '03', title: 'Map and ask', body: 'Add your assets, upload your documents and start asking Markus anything.' },
]

const FAQS = [
  { q: 'What is Markus AI exactly?', a: 'Markus AI is a digital AI clone of Markus Turner. It is trained on how he teaches and thinks, so you get his way of protecting family wealth by text or voice, any time. Want to talk to the real Markus?', link: { href: 'https://calendly.com/turnermarkus50/pea-yt', label: 'Book a call with him here.' } },
  { q: 'Does this include setting up my private trust?', a: 'No. Markus AI is your always-on family office and advisor. Done-with-you private trust setup is part of The Private Estate Accelerator, The Trust Vault and the VIP Weekend.' },
  { q: 'Who is Markus AI built for?', a: 'Families who own real assets, like property, businesses and investments, and want to protect them and pass them down the right way.' },
  { q: 'Is my information private?', a: 'Yes. Your chats, notes and documents are tied to your own account and are not shared with other members.' },
  { q: 'How fast can I start?', a: 'Right after checkout. Your login arrives by email, and you can talk to Markus the same day.' },
]

const DISCLAIMERS = [
  { label: '', body: 'This site is not a part of the Facebook website or Facebook Inc. Additionally, This site is NOT endorsed by Facebook in any way. FACEBOOK is a trademark of FACEBOOK, Inc.' },
  { label: 'Multi-level marketing', body: 'This program is NOT a multi-level or network marketing firm, Any individual, without any payment by participants, can become a part of the referral program by creating a free account online. Case reference: Koscot Interplanetary, Inc., 86 F.T.C. 1106, 1181 (1975).' },
  { label: 'Business opportunity', body: 'Social Business Solutions and associated training are NOT considered an income or business opportunity according to the Business Opportunity Rule \u00a7 437.1m. This states \u201Cthat advertising and general advice about business development and training shall not be considered as \u2018providing locations, outlets, accounts, or customers.\u2019\u201D' },
  { label: 'Income disclaimer', body: 'Although we make every effort to accurately represent the services and/or products presented on this website, Social Business Solutions makes no assurance, representation or promise regarding future earnings or income, or that you will make any specific amount of money, or any money at all, or that you will not lose money. Earnings or income statements, or examples of earnings or income, represent estimates of what you may earn; however, there is no promise or guarantee that you may experience the same level of earnings or income. There is no assurance that any prior success or past results regarding earnings or income may be an indication of your future success or results.' },
]

function LegalFooter() {
  return (
    <footer className="border-t border-border/60 bg-card/30 px-6 py-12">
      <div className="mx-auto max-w-4xl">
        <p className="text-xs font-semibold text-muted-foreground">&copy; 2020 Copyrights by VNCI, LLC. All Rights Reserved.</p>
        <div className="mt-6 space-y-5">
          {DISCLAIMERS.map((d) => (
            <div key={d.label || d.body.slice(0, 24)}>
              {d.label && <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">{d.label}</p>}
              <p className={`text-[11px] leading-relaxed text-muted-foreground/70 ${d.label ? 'mt-1' : ''}`}>{d.body}</p>
            </div>
          ))}
        </div>
      </div>
    </footer>
  )
}

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

const goldBtn = 'bg-secondary text-secondary-foreground hover:bg-accent hover:text-accent-foreground'

export default function MarkusLanding() {
  useSeo('Markus AI | Your AI Family Office', 'Markus AI is a digital AI clone of Markus Turner: a 24/7 trust and estate advisor and private family office that maps every asset you own.')
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const go = (plan: MarkusPlan) => navigate(`/markusturnerai/checkout?plan=${plan}`)
  const toPlans = () => document.getElementById('plans')?.scrollIntoView({ behavior: 'smooth' })

  return (
    <div className="dark h-[100dvh] overflow-y-auto bg-background font-poppins text-foreground">
      {/* Hero */}
      <header className="relative isolate overflow-hidden">
        <img src={estate} alt="A family estate lit up at dusk" width={1920} height={1088} className="absolute inset-0 -z-20 h-full w-full object-cover object-bottom" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-background/90 via-background/55 to-background" />
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_right,hsl(var(--accent)/0.18),transparent_55%)]" />
        <div className="mx-auto flex max-w-4xl flex-col items-center px-5 pb-10 pt-4 text-center sm:px-6 sm:pt-10">
          {params.get('payment') === 'cancelled' && <p className="mb-6 rounded-full border border-border bg-card/60 px-4 py-2 text-xs text-muted-foreground backdrop-blur">Your checkout was not finished. Pick a plan whenever you are ready.</p>}
          <span className="inline-flex items-center gap-2 rounded-full border border-secondary/40 bg-secondary/10 whitespace-nowrap px-3 py-1 text-[9px] font-semibold uppercase tracking-[0.15em] text-secondary backdrop-blur sm:px-4 sm:py-1.5 sm:text-[11px] sm:tracking-[0.25em]">
            <Sparkles className="h-3 w-3 sm:h-3.5 sm:w-3.5" />For families serious about legacy
          </span>
          <h1 className="mt-3 max-w-3xl font-montserrat text-[26px] font-bold sm:mt-5 sm:text-3xl leading-[1.1] tracking-tight sm:text-5xl">
            <span className="text-foreground/70">How to</span> <span className="text-secondary">map</span> and <span className="bg-gradient-to-r from-accent to-accent/70 bg-clip-text text-transparent">protect</span> every asset your family owns.
          </h1>
          <p className="mt-2.5 max-w-2xl text-[13px] leading-snug text-muted-foreground sm:mt-4 sm:text-base sm:leading-normal">Markus Turner has protected over $68M in client assets and helped create 80+ trustees, and his family has used trusts for three generations. Most families never get that kind of help. Markus AI gives you his method and shows you what you own, what it's worth, and what's at risk.</p>
          <div className="relative mt-4 w-full max-w-[17rem] sm:mt-6 sm:max-w-xl">
            <div className="absolute -inset-3 rounded-[1.75rem] bg-gradient-to-br from-secondary/25 to-accent/25 blur-2xl" />
            <div className="relative flex aspect-video items-center justify-center overflow-hidden rounded-2xl border border-border bg-card shadow-2xl shadow-secondary/10">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,hsl(var(--secondary)/0.15),transparent_65%)]" />
              <div className="relative flex flex-col items-center gap-3 text-muted-foreground">
                <span className="flex h-12 w-12 items-center justify-center rounded-full border border-secondary/50 bg-secondary/10 text-secondary sm:h-16 sm:w-16"><Play className="ml-1 h-5 w-5 sm:h-6 sm:w-6" /></span>
                <span className="text-xs sm:text-sm">2-minute walkthrough coming soon</span>
              </div>
            </div>
          </div>
          <Button size="lg" className={`mt-4 h-11 px-7 text-base shadow-xl sm:mt-6 sm:h-12 sm:px-8 shadow-secondary/20 ${goldBtn}`} onClick={toPlans}>Start my family office<ArrowRight className="ml-2 h-4 w-4" /></Button>
          <p className="mt-3 text-xs text-muted-foreground sm:mt-4">Built by Markus Turner, Family Wealth Architect</p>
        </div>
      </header>

      {/* Pains */}
      <section className="mx-auto max-w-6xl px-6 py-24">
        <p className="text-center text-xs font-semibold uppercase tracking-[0.25em] text-secondary">Sound familiar?</p>
        <h2 className="mx-auto mt-3 max-w-2xl text-center font-montserrat text-3xl font-bold sm:text-4xl">You built the wealth. Now it needs a system.</h2>
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {PAINS.map((p) => (
            <div key={p.title} className="rounded-2xl border border-border border-l-2 border-l-accent/70 bg-card/50 p-6 transition-colors hover:border-accent/50">
              <h3 className="font-montserrat text-lg font-semibold">{p.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{p.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="relative border-y border-border/60 bg-card/30 py-24">
        <div className="mx-auto max-w-6xl px-6">
          <p className="text-center text-xs font-semibold uppercase tracking-[0.25em] text-secondary">What you get</p>
          <h2 className="mx-auto mt-3 max-w-3xl text-center font-montserrat text-3xl font-bold sm:text-4xl">Everything a family office does, for a fraction of what one costs.</h2>
          <div className="mt-14 grid gap-4 md:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.title} className={`group rounded-2xl border border-border bg-background/70 p-6 transition-all hover:-translate-y-0.5 hover:border-secondary/50 hover:shadow-xl hover:shadow-secondary/10 ${f.wide ? 'md:col-span-2' : ''}`}>
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-secondary/10 text-secondary transition-colors group-hover:bg-secondary group-hover:text-secondary-foreground"><f.icon className="h-5 w-5" /></span>
                <h3 className="mt-5 font-montserrat text-lg font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Meet Markus */}
      <section className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-24 md:grid-cols-2">
        <div className="relative mx-auto w-full max-w-sm">
          <div className="absolute -inset-4 rounded-[2rem] bg-gradient-to-br from-secondary/30 to-accent/20 blur-2xl" />
          <img src={markusPhoto.url} alt="Markus Turner" loading="lazy" className="relative aspect-[4/5] w-full rounded-[1.75rem] border border-border object-cover" />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-secondary">Meet Markus</p>
          <blockquote className="mt-4 font-montserrat text-2xl font-semibold leading-snug sm:text-3xl">"My name is Markus Turner, a Family Wealth Architect, helping asset-rich families protect what they've built and pass it down for generations."</blockquote>
          <p className="mt-6 text-muted-foreground">Markus AI is a digital AI clone of Markus, built from how he teaches, thinks and talks. It is like having him on call for your family, any time you need him.</p>
          <ul className="mt-6 space-y-3 text-sm">
            {['Answers in plain English, not legal jargon', 'Knows your family and your assets', 'Available 24/7, even by voice'].map((t) => (
              <li key={t} className="flex items-center gap-3"><Check className="h-4 w-4 text-secondary" />{t}</li>
            ))}
          </ul>
        </div>
      </section>

      {/* Steps */}
      <section className="mx-auto max-w-6xl px-6 pb-24">
        <h2 className="text-center font-montserrat text-3xl font-bold sm:text-4xl">Up and running today</h2>
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {STEPS.map((s) => (
            <div key={s.n} className="rounded-2xl border border-border bg-card/50 p-6">
              <span className="font-montserrat text-3xl font-bold"><span className="text-secondary">{s.n.slice(0, -1)}</span><span className="text-accent">{s.n.slice(-1)}</span></span>
              <h3 className="mt-3 font-montserrat text-lg font-semibold">{s.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Plans */}
      <section id="plans" className="relative overflow-hidden border-t border-border/60 py-24">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,hsl(var(--secondary)/0.12),transparent_60%)]" />
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_bottom_left,hsl(var(--accent)/0.12),transparent_60%)]" />
        <div className="mx-auto max-w-4xl px-6">
          <p className="text-center text-xs font-semibold uppercase tracking-[0.25em] text-secondary">Membership</p>
          <h2 className="mt-3 text-center font-montserrat text-3xl font-bold sm:text-4xl">Choose your plan</h2>
          <div className="mx-auto mt-12 grid max-w-3xl gap-5 md:grid-cols-2">
            {(['monthly', 'annual'] as MarkusPlan[]).map((key) => {
              const p = MARKUS_PLANS[key]
              const best = key === 'annual'
              return (
                <div key={key} className={`relative flex flex-col rounded-3xl border p-8 ${best ? 'border-secondary bg-card shadow-2xl shadow-secondary/20' : 'border-border bg-card/50'}`}>
                  {best && <span className="absolute -top-4 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-secondary px-5 py-1.5 text-xs font-extrabold uppercase tracking-wider text-secondary-foreground shadow-lg shadow-secondary/40 ring-2 ring-background">Best value - save $3,003</span>}
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">{p.label}</p>
                  <p className="mt-4 font-montserrat text-5xl font-bold">{p.price}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{p.per}</p>
                  <ul className="mt-6 flex-1 space-y-2.5 text-sm">
                    {['Markus AI, 24/7 by text and voice', 'Digital Family Office', 'Private document vault', 'Markus AI Members community', 'TruHeirs iPhone app'].map((t) => (
                      <li key={t} className="flex items-center gap-2.5"><Check className="h-4 w-4 shrink-0 text-secondary" />{t}</li>
                    ))}
                  </ul>
                  <Button size="lg" className={`mt-8 h-12 w-full text-base ${best ? goldBtn : 'bg-foreground text-background hover:bg-accent hover:text-accent-foreground'}`} onClick={() => go(key)}>Start {p.label}</Button>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-6 pb-24">
        <h2 className="text-center font-montserrat text-3xl font-bold">Questions</h2>
        <Accordion type="single" collapsible className="mt-8">
          {FAQS.map((f) => (
            <AccordionItem key={f.q} value={f.q} className="border-border">
              <AccordionTrigger className="text-left font-montserrat text-base hover:no-underline">{f.q}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">{f.a}{"link" in f && f.link && <> <a href={f.link.href} target="_blank" rel="noopener noreferrer" className="font-semibold text-accent underline underline-offset-4 hover:text-secondary">{f.link.label}</a></>}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      {/* Final CTA */}
      <section className="px-6 pb-20">
        <div className="relative mx-auto max-w-5xl overflow-hidden rounded-3xl border border-secondary/40 bg-card p-10 text-center sm:p-16">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,hsl(var(--secondary)/0.2),transparent_70%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,hsl(var(--accent)/0.18),transparent_60%)]" />
          <div className="relative">
            <h2 className="font-montserrat text-3xl font-bold sm:text-4xl">Your legacy deserves a system.</h2>
            <p className="mx-auto mt-4 max-w-xl text-muted-foreground">Start today and have Markus on your side tonight.</p>
            <Button size="lg" className={`mt-8 h-12 px-10 text-base ${goldBtn}`} onClick={toPlans}>Choose my plan<ArrowRight className="ml-2 h-4 w-4" /></Button>
          </div>
        </div>
        <p className="mt-10 text-center text-xs text-muted-foreground">TruHeirs. Markus AI gives education, not legal, tax or financial advice.</p>
      </section>

      <LegalFooter />
    </div>
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
        <button className="inline-flex items-center gap-2 rounded-full border border-secondary/50 bg-secondary/10 px-4 py-2 text-sm font-semibold text-secondary transition-colors hover:border-accent hover:bg-accent/15 hover:text-accent" onClick={() => navigate('/markusturnerai')}><span aria-hidden>&larr;</span>Back to Markus AI</button>
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
          <p className="text-center text-xs text-muted-foreground">Payments are processed securely by Stripe.</p>
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
