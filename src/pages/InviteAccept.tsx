import { useEffect, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/integrations/supabase/client'
import { Loader2, ArrowRight, CheckCircle2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

// Edge functions return the real reason in the response body on non-2xx.
async function readFnError(error: any, data: any, fallback: string) {
  if (data?.error) return data.error as string
  try {
    const body = await error?.context?.json?.()
    if (body?.error) return body.error as string
  } catch {
    // ignore parse failures
  }
  return error?.message === 'Edge Function returned a non-2xx status code'
    ? fallback
    : error?.message || fallback
}


export default function InviteAccept() {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()

  const [checking, setChecking] = useState(true)
  const [invite, setInvite] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [zipCode, setZipCode] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [pin, setPin] = useState('')

  const directSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    const { data, error } = await supabase.functions.invoke('redeem-invite-link', {
      body: { action: 'direct_access', token, pin },
    })
    if (error || !data?.success) {
      setSubmitting(false)
      toast({
        title: 'Could not get you in',
        description: await readFnError(error, data, 'Please check your code.'),
        variant: 'destructive',
      })
      return
    }
    const { error: otpErr } = await supabase.auth.verifyOtp({
      token_hash: data.hashedToken,
      type: 'magiclink',
    })

    setSubmitting(false)
    if (otpErr) {
      toast({ title: 'Could not sign you in', description: otpErr.message, variant: 'destructive' })
      return
    }
    navigate('/welcome')
  }


  useEffect(() => {
    (async () => {
      if (!token) { setError('Missing invite token.'); setChecking(false); return }
      const { data, error } = await supabase.functions.invoke('redeem-invite-link', {
        body: { action: 'validate', token },
      })
      if (error || !data?.success) {
        setError(data?.error || error?.message || 'Invalid invite.')
      } else {
        setInvite(data.invite)
      }
      setChecking(false)
    })()
  }, [token])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    const { data, error } = await supabase.functions.invoke('redeem-invite-link', {
      body: { action: 'redeem', token, firstName, lastName, email, zipCode },
    })
    setSubmitting(false)
    if (error || !data?.success) {
      toast({
        title: 'Could not accept invite',
        description: data?.error || error?.message || 'Please try again.',
        variant: 'destructive',
      })
      return
    }
    setDone(true)
  }

  const inputCls =
    'w-full h-11 px-4 rounded-md bg-card border border-border text-card-foreground placeholder:text-muted-foreground outline-none focus:border-secondary focus:ring-1 focus:ring-secondary/30 transition'

  return (
    <main className="relative min-h-screen overflow-hidden flex items-center justify-center p-4 bg-background text-foreground">
      <Helmet>
        <title>Join TruHeirs — Community Invite</title>
        <meta name="description" content="Accept your TruHeirs community invite and create your account." />
      </Helmet>

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
          <img src="/lovable-uploads/00df4658-d6df-420b-8c0d-7af68820837d.png" alt="TruHeirs" className="h-24 w-auto mx-auto" />
        </div>

        {checking ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-secondary" /></div>
        ) : error ? (
          <div className="text-center space-y-4">
            <h1 className="text-xl font-semibold">Invite unavailable</h1>
            <p className="text-sm text-muted-foreground">{error}</p>
            <button onClick={() => navigate('/auth')} className="text-secondary hover:underline text-sm">Go to sign in</button>
          </div>
        ) : done ? (
          <div className="text-center space-y-4">
            <CheckCircle2 className="h-12 w-12 text-secondary mx-auto" />
            <h1 className="text-xl font-semibold">You're in!</h1>
            <p className="text-sm text-muted-foreground">
              Check your email for your temporary password, then sign in to get started.
            </p>
            <button onClick={() => navigate('/auth')} className="text-secondary hover:underline text-sm inline-flex items-center gap-1">
              Sign in <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        ) : invite?.access_mode === 'direct' ? (
          <>
            <div className="text-center mb-6">
              <h1 className="text-xl font-semibold">Enter your access code</h1>
              <p className="text-xs text-muted-foreground mt-1">
                Type the code you were given to go straight into TruHeirs. No password needed.
              </p>
            </div>
            <form onSubmit={directSubmit} className="space-y-3">
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="Access code"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                required
                disabled={submitting}
                className={`${inputCls} text-center tracking-[0.4em] text-lg`}
              />
              <button
                type="submit"
                disabled={submitting}
                className="w-full h-11 rounded-md font-semibold disabled:opacity-50"
                style={{ backgroundColor: '#ffb500', color: '#290a52' }}
              >
                {submitting ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> : 'Enter TruHeirs'}
              </button>
            </form>
          </>
        ) : (
          <>
            <div className="text-center mb-6">
              <h1 className="text-xl font-semibold">You've been invited</h1>
              <p className="text-xs text-muted-foreground mt-1">
                {invite?.program_name ? `Program: ${invite.program_name}` : 'Join the TruHeirs community'}
              </p>
            </div>


            <form onSubmit={submit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <input type="text" placeholder="First name" value={firstName} onChange={(e) => setFirstName(e.target.value)} required disabled={submitting} className={inputCls} />
                <input type="text" placeholder="Last name" value={lastName} onChange={(e) => setLastName(e.target.value)} required disabled={submitting} className={inputCls} />
              </div>
              <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={submitting} className={inputCls} />
              <input type="text" placeholder="Zip code" value={zipCode} onChange={(e) => setZipCode(e.target.value)} disabled={submitting} className={inputCls} />

              <div className="flex justify-center pt-2">
                <button type="submit" disabled={submitting} aria-label="Accept invite"
                  className="group inline-flex items-center justify-center text-secondary hover:text-foreground transition disabled:opacity-50">
                  {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />}
                </button>
              </div>

              <p className="text-center text-xs text-muted-foreground pt-1">
                Already have an account?{' '}
                <button type="button" onClick={() => navigate('/auth')} className="text-secondary hover:underline font-medium">
                  Sign In
                </button>
              </p>
            </form>
          </>
        )}
      </div>
    </main>
  )
}
