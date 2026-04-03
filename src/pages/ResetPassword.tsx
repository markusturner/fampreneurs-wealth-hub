import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function ResetPassword() {
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isReady, setIsReady] = useState(false)
  const { toast } = useToast()
  const navigate = useNavigate()

  useEffect(() => {
    // Listen for the PASSWORD_RECOVERY event from Supabase auth
    // The hash fragment is consumed by Supabase JS before React mounts,
    // so we can't rely on checking window.location.hash.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsReady(true)
        setError(null)
      } else if (event === 'SIGNED_IN' && session) {
        // Recovery flow also triggers SIGNED_IN — accept it
        setIsReady(true)
        setError(null)
      }
    })

    // Also check if there's already an active session (user may have
    // arrived here via the recovery link and Supabase already processed it)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setIsReady(true)
        setError(null)
      } else {
        // Give Supabase a moment to process the hash fragment
        setTimeout(() => {
          supabase.auth.getSession().then(({ data: { session: s } }) => {
            if (s) {
              setIsReady(true)
            } else {
              setError('This password reset link is invalid or has expired. Please request a new one.')
            }
          })
        }, 2000)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (newPassword.length < 6) {
      toast({ title: 'Password too short', description: 'Password must be at least 6 characters.', variant: 'destructive' })
      return
    }

    if (newPassword !== confirmPassword) {
      toast({ title: 'Passwords do not match', description: 'Please make sure both passwords match.', variant: 'destructive' })
      return
    }

    setIsLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      
      if (error) throw error

      setIsSuccess(true)
      toast({ title: 'Password updated!', description: 'Your password has been successfully reset.' })
      
      // Redirect to auth page after 3 seconds
      setTimeout(() => {
        navigate('/auth')
      }, 3000)
    } catch (err: any) {
      toast({ title: 'Reset failed', description: err.message || 'Something went wrong. Please try again.', variant: 'destructive' })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-soft">
        <CardHeader className="text-center">
          <div className="mx-auto w-20 h-20 rounded-full flex items-center justify-center mb-4">
            <img
              src="/lovable-uploads/cb7af8d2-0809-4d9d-8fa4-acfb507144de.png"
              alt="TruHeirs Logo"
              className="w-20 h-20 object-contain"
            />
          </div>
          <CardTitle className="text-2xl font-bold">Reset Your Password</CardTitle>
          <CardDescription>Enter your new password below</CardDescription>
        </CardHeader>
        <CardContent>
          {isSuccess ? (
            <div className="text-center space-y-4 py-4">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
              <p className="text-lg font-medium">Password successfully reset!</p>
              <p className="text-sm text-muted-foreground">Redirecting you to the sign in page...</p>
              <Button onClick={() => navigate('/auth')} variant="outline" className="mt-2">
                Go to Sign In
              </Button>
            </div>
          ) : error ? (
            <div className="text-center space-y-4 py-4">
              <AlertCircle className="w-16 h-16 text-destructive mx-auto" />
              <p className="text-sm text-muted-foreground">{error}</p>
              <Button onClick={() => navigate('/auth')} variant="outline" className="mt-2">
                Back to Sign In
              </Button>
            </div>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <Input
                  id="new-password"
                  type="password"
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  minLength={6}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm Password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  minLength={6}
                />
              </div>
              <Button type="submit" className="w-full" style={{ backgroundColor: '#ffb500', color: '#290a52' }} disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Reset Password
              </Button>
              <div className="text-center">
                <Button variant="link" onClick={() => navigate('/auth')} className="text-sm text-muted-foreground">
                  Back to Sign In
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
