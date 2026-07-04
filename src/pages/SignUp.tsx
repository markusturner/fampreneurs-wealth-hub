import { useState, useEffect } from 'react'
import { Helmet } from 'react-helmet-async'
import { supabase } from '@/integrations/supabase/client'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { Loader2, CreditCard, ArrowRight } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { PROGRAMS, LITE_PRICING, type ProgramId } from '@/lib/stripe-programs'
import { useAuth } from '@/contexts/AuthContext'

const LITE_PLAN_MAP: Record<string, string> = {
  lite_monthly: LITE_PRICING[0].price_id,
  lite_quarterly: LITE_PRICING[1].price_id,
  lite_annual: LITE_PRICING[2].price_id,
}

export default function SignUp() {
  const [searchParams] = useSearchParams()
  const planParam = searchParams.get('plan') || ''
  const isLitePlan = planParam.startsWith('lite_')

  const [isLoading, setIsLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [selectedProgram, setSelectedProgram] = useState<ProgramId | ''>(isLitePlan ? 'fbu' : '')
  const [selectedPriceIndex, setSelectedPriceIndex] = useState<string>('')
  const [paymentMethod, setPaymentMethod] = useState<'credit_card' | 'other' | ''>(isLitePlan ? 'credit_card' : '')
  const [zipCode, setZipCode] = useState('')

  const { toast } = useToast()
  const navigate = useNavigate()
  const { profile } = useAuth()
  const isAdmin = profile?.is_admin === true

  // Pre-select Lite pricing index when plan param is present
  useEffect(() => {
    if (!isLitePlan) return
    const program = PROGRAMS.find(p => p.id === 'fbu')
    if (!program) return
    const litePriceId = LITE_PLAN_MAP[planParam]
    const idx = program.pricing.findIndex(p => p.price_id === litePriceId)
    if (idx >= 0) setSelectedPriceIndex(String(idx))
  }, [planParam, isLitePlan])


  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      if (!selectedProgram) {
        toast({ title: "Program required", description: "Please select a program.", variant: "destructive" })
        return
      }

      if (!paymentMethod) {
        toast({ title: "Payment method required", description: "Please select a payment method.", variant: "destructive" })
        return
      }

      if (paymentMethod === 'credit_card' && selectedPriceIndex === '') {
        toast({ title: "Pricing plan required", description: "Please select a pricing plan.", variant: "destructive" })
        return
      }

      const program = PROGRAMS.find(p => p.id === selectedProgram)
      if (!program) {
        toast({ title: "Invalid program", variant: "destructive" })
        return
      }

      const affiliateRef = localStorage.getItem('affiliate_ref') || sessionStorage.getItem('affiliate_ref') || null
      const visitorId = localStorage.getItem('visitor_id')

      // Admin-only "Other (Free)" path - create user immediately with temp password emailed
      if (paymentMethod === 'other') {
        const { data, error } = await supabase.functions.invoke('create-user-with-credentials', {
          body: {
            email,
            firstName,
            lastName,
            role: 'trustee',
            programName: program.name,
            mailingAddress: zipCode,
          },
        })
        if (error || !data?.success) {
          toast({ title: "Sign up failed", description: error?.message || data?.error || "Try again later.", variant: "destructive" })
          return
        }
        if (affiliateRef) {
          await supabase.from('affiliate_signups').insert({
            code: affiliateRef, email, visitor_id: visitorId, user_id: data?.userId ?? null,
          })
        }
        toast({ title: "Account created!", description: "A temporary password has been emailed to the user." })
        setEmail(''); setFirstName(''); setLastName('')
        setSelectedProgram(''); setSelectedPriceIndex(''); setPaymentMethod(''); setZipCode('')
        return
      }


      // Credit card path - go to Stripe checkout. Account is created by webhook after payment.
      const priceIdx = parseInt(selectedPriceIndex)
      const pricing = program.pricing[priceIdx]
      if (!pricing) {
        toast({ title: "Invalid pricing plan", variant: "destructive" })
        return
      }

      const { data: checkoutData, error: checkoutError } = await supabase.functions.invoke('signup-create-checkout', {
        body: {
          price_id: pricing.price_id,
          mode: pricing.mode,
          email,
          firstName,
          lastName,
          zipCode,
          programName: program.name,
          programId: selectedProgram,
        },
      })

      if (checkoutError || !checkoutData?.url) {
        toast({ title: "Checkout failed", description: checkoutError?.message || "Unable to start checkout.", variant: "destructive" })
        return
      }

      if (affiliateRef) {
        await supabase.from('affiliate_signups').insert({
          code: affiliateRef, email, visitor_id: visitorId, user_id: null,
        })
      }

      window.location.href = checkoutData.url
    } catch (error) {
      toast({ title: "Something went wrong", description: "Please try again later.", variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }

  const currentProgram = PROGRAMS.find(p => p.id === selectedProgram)
  const inputCls = "w-full h-11 px-4 rounded-md bg-card border border-border text-card-foreground placeholder:text-muted-foreground outline-none focus:border-secondary focus:ring-1 focus:ring-secondary/30 transition"

  return (
    <main className="relative min-h-screen overflow-hidden flex items-center justify-center p-4 bg-background text-foreground">
      <Helmet>
        <title>Create Account — TruHeirs Trustee Portal</title>
        <meta name="description" content="Create your TruHeirs trustee account to access the digital family office platform." />
        <link rel="canonical" href="https://truheirs.app/signup" />
      </Helmet>

      {/* Animated ambient background */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="th-blob th-blob-gold" />
        <div className="th-blob th-blob-purple" />
        <div className="th-blob th-blob-sky" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,hsl(var(--background)/0.9)_55%,hsl(var(--background))_100%)]" />
      </div>

      <style>{`
        @keyframes th-drift-1 { 0% { transform: translate(-30%, -35%) scale(1);} 33% { transform: translate(40%, 20%) scale(1.3);} 66% { transform: translate(-20%, 30%) scale(0.9);} 100% { transform: translate(-30%, -35%) scale(1);} }
        @keyframes th-drift-2 { 0% { transform: translate(35%, 40%) scale(1.1);} 33% { transform: translate(-40%, -25%) scale(0.85);} 66% { transform: translate(25%, -30%) scale(1.25);} 100% { transform: translate(35%, 40%) scale(1.1);} }
        @keyframes th-drift-3 { 0% { transform: translate(45%, -35%) scale(0.9);} 33% { transform: translate(-40%, 35%) scale(1.2);} 66% { transform: translate(30%, 25%) scale(1);} 100% { transform: translate(45%, -35%) scale(0.9);} }
        .th-blob { position:absolute; border-radius:9999px; filter: blur(120px); will-change: transform; }
        .th-blob-gold { width:60vw; height:60vw; background:hsl(var(--secondary)); opacity:0.28; top:-10%; left:20%; animation: th-drift-1 14s ease-in-out infinite; }
        .th-blob-purple { width:65vw; height:65vw; background:hsl(var(--foreground)); opacity:0.1; top:20%; left:-15%; animation: th-drift-2 16s ease-in-out infinite; }
        .th-blob-sky { width:45vw; height:45vw; background:hsl(var(--accent)); opacity:0.22; bottom:-15%; right:-5%; animation: th-drift-3 18s ease-in-out infinite; }
      `}</style>

      <div className="relative z-10 w-full max-w-sm">
        <div className="text-center mb-8">
          <img
            src="/lovable-uploads/00df4658-d6df-420b-8c0d-7af68820837d.png"
            alt="TruHeirs"
            className="h-24 w-auto mx-auto"
          />
        </div>

        <form onSubmit={handleSignUp} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <input type="text" placeholder="First name" value={firstName} onChange={(e) => setFirstName(e.target.value)} required disabled={isLoading} className={inputCls} />
            <input type="text" placeholder="Last name" value={lastName} onChange={(e) => setLastName(e.target.value)} required disabled={isLoading} className={inputCls} />
          </div>

          <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={isLoading} className={inputCls} />

          <input type="text" placeholder="Zip code" value={zipCode} onChange={(e) => setZipCode(e.target.value)} required disabled={isLoading} className={inputCls} />

          <Select value={selectedProgram} onValueChange={(val) => { setSelectedProgram(val as ProgramId); setSelectedPriceIndex(''); }}>
            <SelectTrigger className="h-11 bg-card border-border focus:ring-secondary/30"><SelectValue placeholder="Select a program" /></SelectTrigger>
            <SelectContent>
              {PROGRAMS.map(p => (<SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>))}
            </SelectContent>
          </Select>

          <Select value={paymentMethod} onValueChange={(val) => setPaymentMethod(val as 'credit_card' | 'other')}>
            <SelectTrigger className="h-11 bg-card border-border focus:ring-secondary/30"><SelectValue placeholder="Payment method" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="credit_card">
                <div className="flex items-center gap-2"><CreditCard className="h-4 w-4" />Credit Card</div>
              </SelectItem>
              {isAdmin && (<SelectItem value="other">Other (Free — Admin only)</SelectItem>)}
            </SelectContent>
          </Select>

          {paymentMethod === 'credit_card' && currentProgram && (
            <Select value={selectedPriceIndex} onValueChange={setSelectedPriceIndex}>
              <SelectTrigger className="h-11 bg-card border-border focus:ring-secondary/30"><SelectValue placeholder="Select a plan" /></SelectTrigger>
              <SelectContent>
                {currentProgram.pricing.map((p, i) => (
                  <SelectItem key={i} value={String(i)}>{p.label} ({p.interval})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <div className="flex justify-center pt-2">
            <button
              type="submit"
              disabled={isLoading}
              aria-label="Create account"
              className="group inline-flex items-center justify-center text-secondary hover:text-foreground transition disabled:opacity-50"
            >
              {isLoading
                ? <Loader2 className="h-5 w-5 animate-spin" />
                : <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />}
            </button>
          </div>

          <p className="text-center text-xs text-muted-foreground pt-1">
            Already have an account?{' '}
            <button type="button" onClick={() => navigate('/auth')} className="text-secondary hover:underline font-medium">
              Sign In
            </button>
          </p>
        </form>

        <div className="mt-12 text-center">
          <p className="text-[10px] tracking-[0.35em] text-muted-foreground uppercase">Licensed Members Only</p>
        </div>
      </div>
    </main>
  )
}

