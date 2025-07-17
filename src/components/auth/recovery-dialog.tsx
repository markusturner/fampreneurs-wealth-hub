import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { Loader2 } from 'lucide-react'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { supabase } from '@/integrations/supabase/client'

export function RecoveryDialog() {
  const [isLoading, setIsLoading] = useState(false)
  const [recoveryMethod, setRecoveryMethod] = useState<'email' | 'phone'>('email')
  const [emailOrPhone, setEmailOrPhone] = useState('')
  const [recoveryType, setRecoveryType] = useState<'password' | 'username'>('password')
  const { toast } = useToast()
  const [open, setOpen] = useState(false)

  const handleResetPassword = async () => {
    setIsLoading(true)
    try {
      if (recoveryMethod === 'email') {
        // Reset password via email using Supabase's built-in functionality
        const { error } = await supabase.auth.resetPasswordForEmail(emailOrPhone, {
          redirectTo: `${window.location.origin}/auth?reset=password`,
        })
        
        if (error) throw error
        
        toast({
          title: "Password recovery email sent",
          description: "Check your email for a link to reset your password",
        })
        setOpen(false)
      } else {
        // Use our edge function for phone-based recovery
        const response = await supabase.functions.invoke('account-recovery', {
          body: {
            method: 'phone',
            contact: emailOrPhone,
            type: 'password'
          }
        })
        
        if (response.error) throw new Error(response.error.message)
        
        toast({
          title: "SMS Recovery",
          description: "A verification code has been sent to your phone number.",
        })
        setOpen(false)
      }
    } catch (error: any) {
      toast({
        title: "Recovery failed",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleUsernameRecovery = async () => {
    setIsLoading(true)
    try {
      // Use our edge function for both email and phone username recovery
      const response = await supabase.functions.invoke('account-recovery', {
        body: {
          method: recoveryMethod,
          contact: emailOrPhone,
          type: 'username'
        }
      })
      
      if (response.error) throw new Error(response.error.message)
      
      toast({
        title: "Username reminder sent",
        description: recoveryMethod === 'email'
          ? "If an account exists with this email, we've sent your username"
          : "If an account exists with this phone number, we've sent your username",
      })
      setOpen(false)
    } catch (error: any) {
      toast({
        title: "Recovery failed",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!emailOrPhone) {
      toast({
        title: "Missing information",
        description: recoveryMethod === 'email' 
          ? "Please enter your email address" 
          : "Please enter your phone number",
        variant: "destructive",
      })
      return
    }

    if (recoveryType === 'password') {
      await handleResetPassword()
    } else {
      await handleUsernameRecovery()
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="link" className="px-0 font-normal">Forgot password or username?</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Account Recovery</DialogTitle>
          <DialogDescription>
            Recover your account information using your email or phone number.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <Tabs defaultValue="password" className="w-full" onValueChange={(value) => setRecoveryType(value as 'password' | 'username')}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="password">Reset Password</TabsTrigger>
                <TabsTrigger value="username">Recover Username</TabsTrigger>
              </TabsList>
              
              <TabsContent value="password" className="space-y-4 mt-4">
                <p className="text-sm text-muted-foreground">
                  Enter your email or phone number to receive a password reset link.
                </p>
              </TabsContent>
              
              <TabsContent value="username" className="space-y-4 mt-4">
                <p className="text-sm text-muted-foreground">
                  Enter your email or phone number to retrieve your username.
                </p>
              </TabsContent>
            </Tabs>
            
            <div className="space-y-2">
              <Label htmlFor="recovery-method">Recovery Method</Label>
              <RadioGroup defaultValue="email" className="flex gap-4" onValueChange={(value) => setRecoveryMethod(value as 'email' | 'phone')}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="email" id="r1" />
                  <Label htmlFor="r1">Email</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="phone" id="r2" />
                  <Label htmlFor="r2">Phone</Label>
                </div>
              </RadioGroup>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email-or-phone">
                {recoveryMethod === 'email' ? 'Email Address' : 'Phone Number'}
              </Label>
              <Input
                id="email-or-phone"
                type={recoveryMethod === 'email' ? 'email' : 'tel'}
                placeholder={recoveryMethod === 'email' ? 'Enter your email' : 'Enter your phone number'}
                value={emailOrPhone}
                onChange={(e) => setEmailOrPhone(e.target.value)}
                disabled={isLoading}
                required
              />
            </div>
          </div>
          
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">Cancel</Button>
            </DialogClose>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {recoveryType === 'password' ? 'Reset Password' : 'Recover Username'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}