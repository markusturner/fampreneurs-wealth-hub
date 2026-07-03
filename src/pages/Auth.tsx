import { useState, useEffect } from 'react'
import { Helmet } from 'react-helmet-async'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { Loader2, Eye, EyeOff, ArrowRight } from 'lucide-react'
import { RecoveryDialog } from '@/components/auth/recovery-dialog'

export default function Auth() {
  const [isLoading, setIsLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const { toast } = useToast()

  // Track affiliate ref visits + persist for signup attribution
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search)
      const refCode = params.get('ref')
      if (refCode) {
        sessionStorage.setItem('affiliate_ref', refCode)
        localStorage.setItem('affiliate_ref', refCode)
      }
      let visitorId = localStorage.getItem('visitor_id')
      if (!visitorId) {
        visitorId = crypto.randomUUID()
        localStorage.setItem('visitor_id', visitorId)
      }
      supabase.from('page_views').insert({
        page_path: '/auth',
        visitor_id: visitorId,
        user_agent: navigator.userAgent,
        referrer: document.referrer || null,
        ref_code: refCode || null,
      }).then(() => {})
    } catch (e) {
      console.error('page view tracking failed', e)
    }
  }, [])

  const cleanupAuthState = () => {
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
        localStorage.removeItem(key)
      }
    })
    Object.keys(sessionStorage || {}).forEach((key) => {
      if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
        sessionStorage.removeItem(key)
      }
    })
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      cleanupAuthState()
      try { await supabase.auth.signOut({ scope: 'global' }) } catch (err) {}

      const { data, error } = await supabase.auth.signInWithPassword({ email, password })

      if (error) {
        const friendlyMessage = error.message === "Invalid login credentials"
          ? "Incorrect email or password. If your credentials were recently resent, please check your latest email for the updated password."
          : error.message;
        toast({ title: "Sign in failed", description: friendlyMessage, variant: "destructive" })
        return
      }

      if (data.user) {
        toast({ title: "Welcome back!", description: "Successfully signed in to your family dashboard." })
        window.location.href = '/welcome'
      }
    } catch (error) {
      toast({ title: "Something went wrong", description: "Please try again later.", variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden flex items-center justify-center p-4 bg-background text-foreground">
      <Helmet>
        <title>Sign In — TruHeirs Trustee Portal</title>
        <meta name="description" content="Sign in to TruHeirs, the digital family office platform for trustees managing family wealth, governance, and legacy." />
        <link rel="canonical" href="https://truheirs.app/auth" />
        <meta property="og:title" content="Sign In — TruHeirs Trustee Portal" />
        <meta property="og:description" content="Sign in to TruHeirs, the digital family office platform for trustees managing family wealth, governance, and legacy." />
        <meta property="og:url" content="https://truheirs.app/auth" />
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

        <form onSubmit={handleSignIn} className="space-y-4">
          <input
            id="signin-email"
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={isLoading}
            className="w-full h-12 px-4 rounded-md bg-card border border-border text-card-foreground placeholder:text-muted-foreground outline-none focus:border-secondary focus:ring-1 focus:ring-secondary/30 transition"
          />

          <div className="relative">
            <input
              id="signin-password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isLoading}
              className="w-full h-12 px-4 pr-11 rounded-md bg-card border border-border text-card-foreground placeholder:text-muted-foreground outline-none focus:border-secondary focus:ring-1 focus:ring-secondary/30 transition"
            />
            <button
              type="button"
              onClick={() => setShowPassword(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          <div className="flex justify-center pt-2">
            <button
              type="submit"
              disabled={isLoading}
              aria-label="Sign in"
              className="group inline-flex items-center justify-center text-secondary hover:text-foreground transition disabled:opacity-50"
            >
              {isLoading
                ? <Loader2 className="h-5 w-5 animate-spin" />
                : <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />}
            </button>
          </div>

          <div className="flex justify-center pt-1">
            <RecoveryDialog />
          </div>
        </form>

        <div className="mt-16 text-center">
          <p className="text-[10px] tracking-[0.35em] text-muted-foreground uppercase">Licensed Members Only</p>
        </div>
      </div>
    </main>
  )
}
