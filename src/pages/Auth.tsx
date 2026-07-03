import { useState, useEffect } from 'react'
import { Helmet } from 'react-helmet-async'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { Loader2, Mail, Eye, EyeOff, ArrowRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { RecoveryDialog } from '@/components/auth/recovery-dialog'

export default function Auth() {
  const [isLoading, setIsLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const { toast } = useToast()
  const navigate = useNavigate()

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

  // No auto-redirect on load — user must explicitly sign in


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
        // Land on AI Chat by default; AppLayout will still gate onboarding/agreement first if needed
        window.location.href = '/ai-chat'
      }
    } catch (error) {
      toast({ title: "Something went wrong", description: "Please try again later.", variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleAuth = async () => {
    try {
      cleanupAuthState()
      const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${window.location.origin}/dashboard` } })
      if (error) toast({ title: "Google sign in failed", description: error.message, variant: "destructive" })
    } catch (error) {
      toast({ title: "Something went wrong", description: "Please try again later.", variant: "destructive" })
    }
  }

  const handleAppleAuth = async () => {
    try {
      cleanupAuthState()
      const { error } = await supabase.auth.signInWithOAuth({ provider: 'apple', options: { redirectTo: `${window.location.origin}/dashboard` } })
      if (error) toast({ title: "Apple sign in failed", description: error.message, variant: "destructive" })
    } catch (error) {
      toast({ title: "Something went wrong", description: "Please try again later.", variant: "destructive" })
    }
  }

  const handleMicrosoftAuth = async () => {
    try {
      cleanupAuthState()
      const { error } = await supabase.auth.signInWithOAuth({ provider: 'azure', options: { redirectTo: `${window.location.origin}/dashboard`, scopes: 'email' } })
      if (error) toast({ title: "Microsoft sign in failed", description: error.message, variant: "destructive" })
    } catch (error) {
      toast({ title: "Something went wrong", description: "Please try again later.", variant: "destructive" })
    }
  }

  const handleLinkedInAuth = async () => {
    try {
      cleanupAuthState()
      const { error } = await supabase.auth.signInWithOAuth({ provider: 'linkedin_oidc', options: { redirectTo: `${window.location.origin}/dashboard` } })
      if (error) toast({ title: "LinkedIn sign in failed", description: error.message, variant: "destructive" })
    } catch (error) {
      toast({ title: "Something went wrong", description: "Please try again later.", variant: "destructive" })
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden flex items-center justify-center p-4 bg-[#0a0410] text-white">
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
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(10,4,16,0.65)_55%,#0a0410_100%)]" />
      </div>

      <style>{`
        @keyframes th-drift-1 { 0%,100% { transform: translate(-10%, -15%) scale(1);} 50% { transform: translate(15%, 10%) scale(1.15);} }
        @keyframes th-drift-2 { 0%,100% { transform: translate(20%, 25%) scale(1.1);} 50% { transform: translate(-15%, -10%) scale(0.95);} }
        @keyframes th-drift-3 { 0%,100% { transform: translate(30%, -20%) scale(0.9);} 50% { transform: translate(-25%, 20%) scale(1.1);} }
        .th-blob { position:absolute; border-radius:9999px; filter: blur(120px); opacity:0.55; will-change: transform; }
        .th-blob-gold { width:60vw; height:60vw; background:#ffb500; top:-10%; left:20%; animation: th-drift-1 22s ease-in-out infinite; }
        .th-blob-purple { width:65vw; height:65vw; background:#290a52; top:20%; left:-15%; opacity:0.9; animation: th-drift-2 26s ease-in-out infinite; }
        .th-blob-sky { width:45vw; height:45vw; background:#2eb2ff; bottom:-15%; right:-5%; opacity:0.35; animation: th-drift-3 30s ease-in-out infinite; }
      `}</style>

      <div className="relative z-10 w-full max-w-sm">
        <div className="text-center mb-10">
          <p className="text-[11px] tracking-[0.4em] text-[#ffb500]/80 uppercase">TruHeirs</p>
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
            className="w-full h-12 px-4 rounded-md bg-white/5 border border-white/10 text-white placeholder:text-white/40 outline-none focus:border-[#ffb500]/60 focus:bg-white/[0.07] transition"
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
              className="w-full h-12 px-4 pr-11 rounded-md bg-white/5 border border-white/10 text-white placeholder:text-white/40 outline-none focus:border-[#ffb500]/60 focus:bg-white/[0.07] transition"
            />
            <button
              type="button"
              onClick={() => setShowPassword(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/80"
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
              className="group inline-flex items-center justify-center text-[#ffb500] hover:text-white transition disabled:opacity-50"
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
          <p className="text-[10px] tracking-[0.35em] text-white/40 uppercase">Licensed Members Only</p>
        </div>
      </div>
    </main>
  )
}
