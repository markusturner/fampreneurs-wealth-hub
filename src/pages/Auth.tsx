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

          </form>
        </CardContent>
      </Card>
    </div>
  )
}
