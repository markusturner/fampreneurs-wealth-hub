import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { Loader2, Mail } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { RecoveryDialog } from '@/components/auth/recovery-dialog'

export default function Auth() {
  const [isLoading, setIsLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const { toast } = useToast()
  const navigate = useNavigate()

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        window.location.href = '/onboarding-explanation'
      }
    }
    checkUser()
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
        window.location.href = '/onboarding-explanation'
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
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-soft relative">
        <CardHeader className="text-center">
          <div className="mx-auto w-20 h-20 rounded-full flex items-center justify-center mb-4">
            <img
              src="/lovable-uploads/cb7af8d2-0809-4d9d-8fa4-acfb507144de.png"
              alt="TruHeirs Logo"
              className="w-20 h-20 object-contain"
            />
          </div>
          <CardTitle className="text-2xl font-bold">TruHeirs</CardTitle>
          <CardDescription>Trustee Sign In</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignIn} className="space-y-3">
            <p className="text-[10px] text-muted-foreground leading-tight">Use your mentee program credentials.</p>
            <div className="space-y-1.5">
              <Label htmlFor="signin-email" className="text-sm">Email</Label>
              <Input id="signin-email" type="email" placeholder="Enter your email" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={isLoading} className="h-9" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="signin-password" className="text-sm">Password</Label>
              <Input id="signin-password" type="password" placeholder="Enter your password" value={password} onChange={(e) => setPassword(e.target.value)} required disabled={isLoading} className="h-9" />
            </div>
            <div className="flex justify-center pt-1">
              <RecoveryDialog />
            </div>
            <Button type="submit" className="w-full h-9" style={{ backgroundColor: '#ffb500', color: '#290a52' }} disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sign In (Trustees)
            </Button>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-1.5">
              <Button type="button" variant="outline" onClick={handleGoogleAuth} disabled={isLoading} className="w-full h-9 px-2">
                <svg className="h-4 w-4" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
              </Button>
              <Button type="button" variant="outline" onClick={handleAppleAuth} disabled={isLoading} className="w-full h-9 px-2">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                </svg>
              </Button>
              <Button type="button" variant="outline" onClick={handleMicrosoftAuth} disabled={isLoading} className="w-full h-9 px-2">
                <Mail className="h-4 w-4" />
              </Button>
              <Button type="button" variant="outline" onClick={handleLinkedInAuth} disabled={isLoading} className="w-full h-9 px-2">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
