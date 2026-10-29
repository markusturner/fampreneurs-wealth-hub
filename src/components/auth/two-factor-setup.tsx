import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/integrations/supabase/client'
import { Loader2, Smartphone, Mail, QrCode, Shield } from 'lucide-react'
import { normalizeSecurityPhone, isSecurityCode } from '@/lib/two-factor-validation'

interface TwoFactorSetupProps {
  email: string
  onComplete: (method: string) => void
  onSkip: () => void
}

export function TwoFactorSetup({ email, onComplete, onSkip }: TwoFactorSetupProps) {
  const [selectedMethod, setSelectedMethod] = useState<'phone' | 'email' | 'authenticator'>('phone')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [verificationCode, setVerificationCode] = useState('')
  const [qrCodeSecret, setQrCodeSecret] = useState('')
  const [qrCodeImage, setQrCodeImage] = useState('')
  const [factorId, setFactorId] = useState('')
  const [challengeId, setChallengeId] = useState('')
  const [completedMethod, setCompletedMethod] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [step, setStep] = useState<'setup' | 'verify'>('setup')
  const [isVerificationLoading, setIsVerificationLoading] = useState(false)
  
  const { toast } = useToast()

  useEffect(() => {
    let active = true
    supabase.auth.mfa.listFactors().then(({ data, error }) => {
      if (!active || error) return
      const verified = data?.all.find(f => f.status === 'verified')
      if (verified) setCompletedMethod(verified.factor_type === 'totp' ? 'authenticator' : 'phone')
    })
    return () => { active = false }
  }, [])

  const resetSetup = async () => {
    if (factorId && !completedMethod) {
      const { error } = await supabase.auth.mfa.unenroll({ factorId })
      if (error) { toast({ title: 'Could not cancel setup', description: error.message, variant: 'destructive' }); return }
    }
    setFactorId(''); setChallengeId(''); setQrCodeSecret(''); setQrCodeImage(''); setVerificationCode(''); setStep('setup')
  }

  const handleSetup = async () => {
    setIsLoading(true)
    
    try {
      if (selectedMethod === 'phone') {
        const phone = normalizeSecurityPhone(phoneNumber)
        const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'phone', phone })
        if (error) throw error
        setFactorId(data.id)
        const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId: data.id, channel: 'sms' })
        if (challengeError) {
          await supabase.auth.mfa.unenroll({ factorId: data.id })
          setFactorId('')
          throw challengeError
        }
        setPhoneNumber(phone)
        setChallengeId(challenge.id)

        toast({
          title: "Verification code sent",
          description: "Check your phone for the verification code.",
        })
        
      } else if (selectedMethod === 'email') {
        // Send email verification code
        const { data, error } = await supabase.functions.invoke('send-email-verification', {
          body: { email }
        })

        if (error || !data?.success) {
          const details = await error.context?.json?.().catch(() => null)
          throw new Error(details?.error || data?.error || error?.message || 'The verification email could not be sent.')
        }

        toast({
          title: "Verification code sent",
          description: "Check your email for the verification code.",
        })
        
      } else if (selectedMethod === 'authenticator') {
        const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', issuer: 'TruHeirs' })
        if (error) throw error
        setFactorId(data.id)
        setQrCodeSecret(data.totp.secret)
        setQrCodeImage(data.totp.qr_code.startsWith('data:') ? data.totp.qr_code : `data:image/svg+xml;charset=utf-8,${encodeURIComponent(data.totp.qr_code)}`)
        
        toast({
          title: "QR Code generated",
          description: "Scan the QR code with your authenticator app.",
        })
      }
      
      setStep('verify')
    } catch (error: any) {
      toast({
        title: "Setup failed",
        description: error.message || "Failed to set up 2FA. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleVerification = async () => {
    if (!isSecurityCode(verificationCode)) {
      toast({
        title: "Invalid code",
        description: "Please enter a valid 6-digit verification code.",
        variant: "destructive",
      })
      return
    }

    setIsVerificationLoading(true)

    try {
      if (selectedMethod === 'email') {
        const { data, error } = await supabase.functions.invoke('verify-2fa-code', { body: { email, code: verificationCode, method: 'email' } })
        if (error || !data?.success) {
          const details = await error?.context?.json?.().catch(() => null)
          throw new Error(details?.error || data?.error || error?.message || 'Invalid verification code')
        }
      } else {
        if (!factorId) throw new Error('Start setup again before verifying.')
        const result = selectedMethod === 'authenticator'
          ? await supabase.auth.mfa.challengeAndVerify({ factorId, code: verificationCode })
          : await supabase.auth.mfa.verify({ factorId, challengeId, code: verificationCode })
        if (result.error) throw result.error
        const { data, error } = await supabase.auth.mfa.listFactors()
        if (error) throw error
        if (!data.all.some(f => f.id === factorId && f.status === 'verified')) throw new Error('Verification has not been saved. Please try again.')
      }

      toast({
        title: selectedMethod === 'email' ? 'Email verified' : 'Security method verified',
        description: selectedMethod === 'email' ? 'Your email verification was saved.' : 'Your verified security method was saved to your account.',
      })

      setCompletedMethod(selectedMethod)
      setQrCodeSecret(''); setQrCodeImage(''); setVerificationCode('')
      onComplete(selectedMethod)
    } catch (error: any) {
      toast({
        title: "Verification failed",
        description: error.message || "Invalid verification code. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsVerificationLoading(false)
    }
  }

  if (completedMethod) {
    return <Card className="w-full"><CardHeader><CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5 text-primary" />Account Security</CardTitle><CardDescription>{completedMethod === 'email' ? 'Email verification saved' : `${completedMethod === 'phone' ? 'SMS' : 'Authenticator app'} verified`}</CardDescription></CardHeader><CardContent><Button variant="outline" onClick={() => { setCompletedMethod(''); setFactorId(''); setStep('setup') }}>Set up another method</Button></CardContent></Card>
  }

  if (step === 'verify') {
    return (
      <Card className="w-full">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>Verify Your Code</CardTitle>
          <CardDescription>
            {selectedMethod === 'phone' 
              ? `Enter the 6-digit code sent to ${phoneNumber}`
              : selectedMethod === 'email'
              ? `Enter the 6-digit code sent to ${email}`
              : 'Enter the 6-digit code from your authenticator app'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {selectedMethod === 'authenticator' && (
            <div className="text-center space-y-4">
              <div className="p-4 bg-card rounded-lg border inline-block">
                <img 
                  src={qrCodeImage}
                  alt="QR Code for authenticator app"
                  className="w-48 h-48"
                />
              </div>
              <p className="text-sm text-muted-foreground">
                Scan this QR code with Google Authenticator, Authy, or any TOTP app
              </p>
              <div className="text-xs font-mono bg-muted p-2 rounded">
                Manual entry key: {qrCodeSecret}
              </div>
            </div>
          )}
          
          <div className="space-y-2">
            <Label>Verification Code</Label>
            <div className="flex justify-center">
              <InputOTP 
                maxLength={6} 
                value={verificationCode} 
                onChange={setVerificationCode}
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
            </div>
          </div>

          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={resetSetup}
              className="flex-1"
            >
              Back
            </Button>
            <Button 
              onClick={handleVerification}
              className="flex-1"
              disabled={isVerificationLoading || !isSecurityCode(verificationCode)}
            >
              {isVerificationLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Verify & Complete
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full">
      <CardHeader className="text-center">
        <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
          <Shield className="h-6 w-6 text-primary" />
        </div>
        <CardTitle>Secure Your Account</CardTitle>
        <CardDescription>
          Verify your phone, email, or authenticator app
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={selectedMethod} onValueChange={(value) => { if (value === 'phone' || value === 'email' || value === 'authenticator') { setSelectedMethod(value); setVerificationCode('') } }}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="phone" className="text-xs">
              <Smartphone className="h-4 w-4 mr-1" />
              SMS
            </TabsTrigger>
            <TabsTrigger value="email" className="text-xs">
              <Mail className="h-4 w-4 mr-1" />
              Email
            </TabsTrigger>
            <TabsTrigger value="authenticator" className="text-xs">
              <QrCode className="h-4 w-4 mr-1" />
              App
            </TabsTrigger>
          </TabsList>

          <TabsContent value="phone" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+1 (555) 123-4567"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                disabled={isLoading}
              />
              <p className="text-xs text-muted-foreground">
                We'll send a verification code to this number
              </p>
            </div>
          </TabsContent>

          <TabsContent value="email" className="space-y-4">
            <div className="space-y-2">
              <Label>Email Address</Label>
              <Input value={email} disabled />
              <p className="text-xs text-muted-foreground">
                Verify your email address. Email verification is not a sign-in second factor.
              </p>
            </div>
          </TabsContent>

          <TabsContent value="authenticator" className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Use an authenticator app like Google Authenticator, Authy, or 1Password to generate verification codes.
              </p>
              <div className="bg-muted p-3 rounded-lg">
                <p className="text-xs font-medium">Recommended apps:</p>
                <ul className="text-xs text-muted-foreground mt-1">
                  <li>• Google Authenticator</li>
                  <li>• Microsoft Authenticator</li>
                  <li>• Authy</li>
                  <li>• 1Password</li>
                </ul>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex gap-2 mt-6">
          <Button 
            variant="outline" 
            onClick={onSkip}
            className="flex-1"
          >
            Skip for now
          </Button>
          <Button 
            onClick={handleSetup}
            className="flex-1"
            disabled={isLoading || (selectedMethod === 'phone' && !phoneNumber)}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Continue
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}