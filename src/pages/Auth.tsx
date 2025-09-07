import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { useToast } from '@/hooks/use-toast'
import { Loader2, Shield, Upload, User, CreditCard, ArrowLeft, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useNavigate } from 'react-router-dom'
import { ThemeToggle } from '@/components/theme-toggle'
import { useTheme } from '@/components/theme-provider'
import { RecoveryDialog } from '@/components/auth/recovery-dialog'
import { TwoFactorSetup } from '@/components/auth/two-factor-setup'
import { ProfilePhotoUpload } from '@/components/auth/ProfilePhotoUpload'
import { CommunityCallBooking } from '@/components/community/CommunityCallBooking'
import { useDebounce } from '@/hooks/useDebounce'

export default function Auth() {
  const [isLoading, setIsLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [familySecretCode, setFamilySecretCode] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [occupation, setOccupation] = useState('')
  const [profilePhoto, setProfilePhoto] = useState<File | null>(null)
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string>('')
  const [membershipType, setMembershipType] = useState('free')
  const [customPrice, setCustomPrice] = useState('')
  const [selectedProgram, setSelectedProgram] = useState('')
  const [showTwoFactor, setShowTwoFactor] = useState(false)
  const [signupEmail, setSignupEmail] = useState('')
  const [userType, setUserType] = useState<'family_office' | 'family_member' | 'mentee'>('family_office')
  
  // Verification states
  const [isVerifyingEmail, setIsVerifyingEmail] = useState(false)
  const [skoolVerification, setSkoolVerification] = useState<{
    status: 'pending' | 'verified' | 'failed' | null
    message: string
  }>({ status: null, message: '' })
  const [programDetection, setProgramDetection] = useState<{
    status: 'pending' | 'detected' | 'not_found' | 'failed' | null
    program: string | null
    message: string
  }>({ status: null, program: null, message: '' })
  
  // Debounce email for verification
  const debouncedEmail = useDebounce(email, 1000)
  
  const { toast } = useToast()
  const navigate = useNavigate()
  const { theme } = useTheme()
  
  // Handle email verification when email changes (debounced)
  useEffect(() => {
    if (debouncedEmail && debouncedEmail.includes('@') && membershipType === 'community') {
      handleEmailVerification(debouncedEmail)
    }
  }, [debouncedEmail, membershipType])
  
  useEffect(() => {
    // Check URL parameters for different flows
    const urlParams = new URLSearchParams(window.location.search)
    const flow = urlParams.get('flow')
    const accessToken = urlParams.get('access_token')
    const paymentStatus = urlParams.get('payment')
    const planName = urlParams.get('plan')
    
    if (flow === 'fampreneur') {
      // Fampreneur member flow - enable community verification
      setMembershipType('community')
      toast({
        title: "Welcome Fampreneur Member! 👋",
        description: "Enter your email to verify your community membership and get your exclusive trial access.",
        duration: 6000,
      })
    } else if (flow === 'purchase' && accessToken) {
      // New user who completed purchase - validate the Stripe session
      handlePurchaseValidation(accessToken)
    } else if (paymentStatus === 'success') {
      // Legacy payment success handling (keeping for backward compatibility)
      toast({
        title: "Payment Successful! 🎉",
        description: `Welcome to ${planName || 'TruHeirs'}! Please create your account to get started.`,
        duration: 8000,
      })
      
      setMembershipType('paid')
      
      if (planName?.includes('Starter')) {
        setCustomPrice('97')
        setSelectedProgram('TruHeirs Starter')
      } else if (planName?.includes('Professional')) {
        setCustomPrice('297')
        setSelectedProgram('TruHeirs Professional')
      } else if (planName?.includes('Enterprise')) {
        setCustomPrice('497')
        setSelectedProgram('TruHeirs Enterprise')
      }
    }
    
    // Clean up URL parameters
    if (flow || accessToken || paymentStatus) {
      window.history.replaceState({}, document.title, window.location.pathname)
    }
    
    // Check if user is already logged in
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        navigate('/dashboard')
      }
    }
    checkUser()
  }, [navigate, toast])

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

  const handleEmailVerification = async (emailToVerify: string) => {
    setIsVerifyingEmail(true)
    setSkoolVerification({ status: 'pending', message: 'Checking Skool community membership...' })
    setProgramDetection({ status: null, program: null, message: '' })

    try {
      // Step 1: Check Skool membership
      const { data: skoolData, error: skoolError } = await supabase.functions.invoke('check-skool-membership', {
        body: { email: emailToVerify }
      })

      if (skoolError || !skoolData?.success) {
        setSkoolVerification({ 
          status: 'failed', 
          message: 'Unable to verify Skool membership' 
        })
        setIsVerifyingEmail(false)
        return
      }

      if (!skoolData.is_member) {
        setSkoolVerification({ 
          status: 'failed', 
          message: 'Email not found in Fampreneurs community' 
        })
        setIsVerifyingEmail(false)
        return
      }

      setSkoolVerification({ 
        status: 'verified', 
        message: 'Verified as Fampreneurs community member' 
      })

      // Step 2: Detect program from GoHighLevel
      setProgramDetection({ status: 'pending', program: null, message: 'Detecting your program...' })

      const { data: programData, error: programError } = await supabase.functions.invoke('detect-user-program', {
        body: { email: emailToVerify }
      })

      if (programError || !programData?.success) {
        setProgramDetection({ 
          status: 'failed', 
          program: null, 
          message: 'Unable to detect program enrollment' 
        })
      } else if (programData.program_detected && programData.program_name) {
        setProgramDetection({ 
          status: 'detected', 
          program: programData.program_name, 
          message: `Program detected: ${programData.program_name}` 
        })
        // Auto-populate program selection
        setSelectedProgram(programData.program_name)
      } else {
        setProgramDetection({ 
          status: 'not_found', 
          program: null, 
          message: 'No specific program enrollment found' 
        })
      }

    } catch (error: any) {
      console.error('Email verification error:', error)
      setSkoolVerification({ 
        status: 'failed', 
        message: 'Verification failed. Please try again.' 
      })
    } finally {
      setIsVerifyingEmail(false)
    }
  }

  const handlePurchaseValidation = async (sessionId: string) => {
    setIsLoading(true)
    
    try {
      const { data, error } = await supabase.functions.invoke('validate-purchase', {
        body: { sessionId }
      })

      if (error || !data?.valid) {
        toast({
          title: "Purchase Validation Failed",
          description: data?.error || "Unable to validate your purchase. Please contact support.",
          variant: "destructive",
        })
        navigate('/')
        return
      }

      // Purchase validated successfully
      toast({
        title: "Purchase Validated! 🎉",
        description: `Welcome to TruHeirs! Your ${data.planName} access is confirmed.`,
        duration: 8000,
      })

      // Pre-populate form with purchase data
      if (data.customerEmail) {
        setEmail(data.customerEmail)
      }
      
      setMembershipType('paid')
      setSelectedProgram(data.planName || 'TruHeirs Starter')
      
      // Set pricing based on plan
      const amount = data.amount || 9700
      if (amount === 9700) {
        setCustomPrice('97')
      } else if (amount === 29700) {
        setCustomPrice('297') 
      } else if (amount === 49700) {
        setCustomPrice('497')
      }

    } catch (error) {
      console.error('Purchase validation error:', error)
      toast({
        title: "Validation Error",
        description: "Unable to validate your purchase. Please contact support.",
        variant: "destructive",
      })
      navigate('/')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      cleanupAuthState()
      
      try {
        await supabase.auth.signOut({ scope: 'global' })
      } catch (err) {
        // Continue even if this fails
      }

      // For family members, validate the family secret code first
      if (userType === 'family_member' && familySecretCode) {
        try {
          const { data: codeValidation, error: codeError } = await supabase.functions.invoke(
            'validate-family-code',
            {
              body: {
                code: familySecretCode.toUpperCase().trim(),
                ip_address: null,
                user_agent: navigator.userAgent
              }
            }
          )

          if (codeError || !codeValidation?.success) {
            toast({
              title: "Invalid Family Code",
              description: codeValidation?.message || "The family secret code is invalid or has expired.",
              variant: "destructive",
            })
            return
          }
        } catch (codeError) {
          toast({
            title: "Code Validation Failed",
            description: "Unable to validate family secret code. Please try again.",
            variant: "destructive",
          })
          return
        }
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        toast({
          title: "Sign in failed",
          description: error.message,
          variant: "destructive",
        })
        return
      }

      if (data.user) {
        toast({
          title: "Welcome back!",
          description: "Successfully signed in to your family dashboard.",
        })
        window.location.href = '/dashboard'
      }
    } catch (error) {
      toast({
        title: "Something went wrong",
        description: "Please try again later.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const uploadProfilePhoto = async (file: File, userId: string): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${userId}/avatar.${fileExt}`
      
      const { error: uploadError } = await supabase.storage
        .from('profile-photos')
        .upload(fileName, file, { upsert: true })

      if (uploadError) {
        console.error('Upload error:', uploadError)
        return null
      }

      const { data } = supabase.storage
        .from('profile-photos')
        .getPublicUrl(fileName)

      return data.publicUrl
    } catch (error) {
      console.error('Upload failed:', error)
      return null
    }
  }

  const handleProfilePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast({
          title: "File too large",
          description: "Please select a photo under 5MB.",
          variant: "destructive",
        })
        return
      }
      
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid file type",
          description: "Please select an image file.",
          variant: "destructive",
        })
        return
      }
      
      setProfilePhoto(file)
      const url = URL.createObjectURL(file)
      setProfilePhotoUrl(url)
    }
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate required fields
    if (!firstName || !lastName) {
      toast({
        title: "Missing required fields",
        description: "Please fill in your full name.",
        variant: "destructive",
      })
      return
    }

    // Validate paid membership fields
    if (membershipType === 'paid') {
      if (!customPrice) {
        toast({
          title: "Missing paid membership fields",
          description: "Please enter the price for paid membership.",
          variant: "destructive",
        })
        return
      }
    }
    
    setIsLoading(true)

    try {
      cleanupAuthState()
      
      try {
        await supabase.auth.signOut({ scope: 'global' })
      } catch (err) {
        // Continue even if this fails
      }

      const redirectUrl = `${window.location.origin}/`

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            first_name: firstName,
            last_name: lastName,
            display_name: `${firstName} ${lastName}`.trim(),
            occupation: occupation,
            membership_type: membershipType,
            program_name: selectedProgram,
            custom_price: customPrice
          }
        }
      })

      if (error) {
        if (error.message.includes('User already registered')) {
          toast({
            title: "Account exists",
            description: "This email is already registered. Please sign in instead.",
            variant: "destructive",
          })
        } else {
          toast({
            title: "Sign up failed",
            description: error.message,
            variant: "destructive",
          })
        }
        return
      }

        if (data.user) {
        // Store email for 2FA setup
        setSignupEmail(email)
        
        // Upload profile photo if selected
        let avatarUrl = null
        if (profilePhoto) {
          avatarUrl = await uploadProfilePhoto(profilePhoto, data.user.id)
          if (!avatarUrl) {
            toast({
              title: "Photo upload failed",
              description: "Your account was created but the profile photo failed to upload.",
              variant: "destructive",
            })
          }
        }
        
        // Update profile with program and membership info
        await supabase
          .from('profiles')
          .update({
            program_name: selectedProgram,
            membership_type: membershipType,
            ...(avatarUrl && { 
              avatar_url: avatarUrl,
              profile_photo_uploaded: true
            })
          })
          .eq('user_id', data.user.id)

        // Handle Stripe payment for paid membership
        if (membershipType === 'paid' && customPrice) {
          try {
            const { data: stripeData, error: stripeError } = await supabase.functions.invoke('create-session-payment', {
              body: {
                amount: parseFloat(customPrice) * 100, // Convert to cents
                program_name: selectedProgram,
                user_id: data.user.id
              }
            })

            if (stripeError) throw stripeError

            if (stripeData?.url) {
              window.open(stripeData.url, '_blank')
            }
          } catch (stripeError: any) {
            console.error('Stripe payment error:', stripeError)
            toast({
              title: "Payment setup failed",
              description: "Account created but payment setup failed. You can set up payment later.",
              variant: "destructive",
            })
          }
        }

        // Show 2FA setup instead of immediate redirect
        toast({
          title: "Account created!",
          description: "Now let's secure your account with two-factor authentication.",
        })
        
        setShowTwoFactor(true)
      }
    } catch (error) {
      toast({
        title: "Something went wrong",
        description: "Please try again later.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleAuth = async () => {
    try {
      cleanupAuthState()
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/dashboard`
        }
      })
      
      if (error) {
        toast({
          title: "Google sign in failed",
          description: error.message,
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Something went wrong",
        description: "Please try again later.",
        variant: "destructive",
      })
    }
  }

  const handleAppleAuth = async () => {
    try {
      cleanupAuthState()
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'apple',
        options: {
          redirectTo: `${window.location.origin}/dashboard`
        }
      })
      
      if (error) {
        toast({
          title: "Apple sign in failed",
          description: error.message,
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Something went wrong",
        description: "Please try again later.",
        variant: "destructive",
      })
    }
  }

  const handleFacebookAuth = async () => {
    try {
      cleanupAuthState()
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'facebook',
        options: {
          redirectTo: `${window.location.origin}/dashboard`
        }
      })
      
      if (error) {
        toast({
          title: "Facebook sign in failed",
          description: error.message,
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Something went wrong",
        description: "Please try again later.",
        variant: "destructive",
      })
    }
  }

  const handleTwitterAuth = async () => {
    try {
      cleanupAuthState()
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'twitter',
        options: {
          redirectTo: `${window.location.origin}/dashboard`
        }
      })
      
      if (error) {
        toast({
          title: "Twitter sign in failed",
          description: error.message,
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Something went wrong",
        description: "Please try again later.",
        variant: "destructive",
      })
    }
  }

  const handleLinkedInAuth = async () => {
    try {
      cleanupAuthState()
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'linkedin_oidc',
        options: {
          redirectTo: `${window.location.origin}/dashboard`
        }
      })
      
      if (error) {
        toast({
          title: "LinkedIn sign in failed",
          description: error.message,
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Something went wrong",
        description: "Please try again later.",
        variant: "destructive",
      })
    }
  }

  const handleTwoFactorComplete = (method: string) => {
    toast({
      title: "Security setup complete!",
      description: `Two-factor authentication enabled using ${method}. Your account is now secure.`,
    })
    window.location.href = '/dashboard'
  }

  const handleTwoFactorSkip = () => {
    toast({
      title: "Account ready!",
      description: "You can enable two-factor authentication later in your security settings.",
    })
    window.location.href = '/dashboard'
  }

  // Show 2FA setup if user just signed up
  if (showTwoFactor) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
        <TwoFactorSetup 
          email={signupEmail}
          onComplete={handleTwoFactorComplete}
          onSkip={handleTwoFactorSkip}
        />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-soft relative">
        <div className="absolute top-4 left-4 z-10">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/')}
            className="hover:bg-accent"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </div>
        <div className="absolute top-4 right-4 z-10">
          <ThemeToggle />
        </div>
        <CardHeader className="text-center">
          <div className="mx-auto w-20 h-20 rounded-full flex items-center justify-center mb-4">
            <img 
              src={theme === 'dark' ? "/lovable-uploads/04497296-47f8-41b8-8138-1326135c3c2e.png" : "/lovable-uploads/cb7af8d2-0809-4d9d-8fa4-acfb507144de.png"}
              alt="TruHeirs Logo" 
              className="w-20 h-20 object-contain"
            />
          </div>
          <CardTitle className="text-2xl font-bold">TruHeirs</CardTitle>
          <CardDescription>
            Where family and wealth unite
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label>Login as</Label>
                  <div className="grid grid-cols-3 gap-2">
                    <Button
                      type="button"
                      variant={userType === 'family_office' ? 'default' : 'outline'}
                      onClick={() => setUserType('family_office')}
                      className="text-xs"
                    >
                      Family Office
                    </Button>
                    <Button
                      type="button"
                      variant={userType === 'family_member' ? 'default' : 'outline'}
                      onClick={() => setUserType('family_member')}
                      className="text-xs"
                    >
                      Family Member
                    </Button>
                    <Button
                      type="button"
                      variant={userType === 'mentee' ? 'default' : 'outline'}
                      onClick={() => setUserType('mentee')}
                      className="text-xs"
                    >
                      Trustees
                    </Button>
                  </div>
                  {userType === 'family_office' && (
                    <p className="text-xs text-muted-foreground">Full access to manage your family office and wealth portfolio.</p>
                  )}
                  {userType === 'family_member' && (
                    <p className="text-xs text-muted-foreground">Use the credentials sent to your email by your Family Office.</p>
                  )}
                  {userType === 'mentee' && (
                    <p className="text-xs text-muted-foreground">Use your mentee program credentials.</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signin-email">Email</Label>
                  <Input
                    id="signin-email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signin-password">Password</Label>
                  <Input
                    id="signin-password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                </div>
                
                {/* Family Secret Code Field - Only for family members */}
                {userType === 'family_member' && (
                  <div className="space-y-2">
                    <Label htmlFor="family-secret-code">Family Secret Code *</Label>
                    <Input
                      id="family-secret-code"
                      type="text"
                      placeholder="Enter family secret code"
                      value={familySecretCode}
                      onChange={(e) => setFamilySecretCode(e.target.value.toUpperCase())}
                      required={userType === 'family_member'}
                      disabled={isLoading}
                      className="font-mono"
                      maxLength={12}
                    />
                    <p className="text-xs text-muted-foreground">
                      This code was provided by your family administrator
                    </p>
                  </div>
                )}
                
                <div className="flex justify-center">
                  <RecoveryDialog />
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full"
                  style={{ backgroundColor: '#ffb500', color: '#290a52' }}
                  disabled={isLoading}
                >
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Sign In {userType === 'family_member' ? '(Family Member)' : userType === 'mentee' ? '(Trustees)' : '(Family Office)'}
                </Button>
              </form>
              
            </TabsContent>

            <TabsContent value="signup">
              <div className="space-y-4 p-4 bg-destructive/20 rounded-lg border border-destructive mb-4">
                <div className="text-center">
                  <h3 className="font-semibold text-foreground">Trustees Registration Only</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Only trustees can create accounts. Family members will receive access through their trustees.
                  </p>
                </div>
              </div>
              
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name *</Label>
                    <Input
                      id="firstName"
                      type="text"
                      placeholder="First name"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      required
                      disabled={isLoading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name *</Label>
                    <Input
                      id="lastName"
                      type="text"
                      placeholder="Last name"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      required
                      disabled={isLoading}
                    />
                  </div>
                </div>
                
                {/* Profile Photo Upload */}
                <ProfilePhotoUpload
                  onPhotoSelected={(file, url) => {
                    setProfilePhoto(file)
                    setProfilePhotoUrl(url)
                  }}
                  currentPhotoUrl={profilePhotoUrl}
                />

                {/* Community Membership Selection */}
                <div className="space-y-4 p-4 bg-muted/50 rounded-lg border">
                     <div className="flex items-center space-x-3">
                     <Checkbox
                       id="community-member"
                       checked={membershipType === 'community'}
                       onCheckedChange={(checked) => {
                         setMembershipType(checked ? 'community' : 'free')
                         if (!checked) {
                           setSelectedProgram('')
                           setSkoolVerification({ status: null, message: '' })
                           setProgramDetection({ status: null, program: null, message: '' })
                         }
                       }}
                     />
                     <Label htmlFor="community-member" className="text-sm font-medium">
                       I'm a member of the Fampreneurs community
                     </Label>
                   </div>
                   <p className="text-xs text-muted-foreground">
                     Community members get 50% off all pricing tiers and access to exclusive programs with free trials. Verification required.
                   </p>

                   {membershipType === 'community' && (
                     <div className="space-y-2">
                       <Label htmlFor="program-select">Select Your Program</Label>
                       <Select
                         value={selectedProgram}
                         onValueChange={setSelectedProgram}
                         disabled={programDetection.status === 'pending'}
                       >
                         <SelectTrigger className="bg-background">
                           <SelectValue placeholder={
                             programDetection.status === 'pending' 
                               ? "Detecting your program..." 
                               : programDetection.program 
                               ? `Auto-detected: ${programDetection.program}`
                               : "Choose your program"
                           } />
                         </SelectTrigger>
                         <SelectContent className="bg-background border shadow-md z-50">
                           <SelectItem value="">General Community Member</SelectItem>
                           <SelectItem value="The Family Vault">
                             The Family Vault (30-day free trial)
                           </SelectItem>
                           <SelectItem value="The Family Business Accelerator">
                             The Family Business Accelerator (90-day free trial)
                           </SelectItem>
                           <SelectItem value="The Family Legacy: VIP Weekend">
                             The Family Legacy: VIP Weekend (120-day free trial)
                           </SelectItem>
                         </SelectContent>
                       </Select>
                       
                       {programDetection.program && (
                         <p className="text-xs text-green-600">
                           ✓ Your program was automatically detected and selected
                         </p>
                       )}
                     </div>
                   )}

                  {membershipType !== 'community' && (
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">
                        Not a community member yet? 
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          // Open Calendly booking link
                          window.open('https://calendly.com/turnermarkus50/tfba', '_blank')
                        }}
                        className="w-full"
                      >
                        Book a Call to Join Community & Get 50% Off
                      </Button>
                    </div>
                  )}

                  {/* Pricing Preview */}
                  {(membershipType === 'community' || membershipType === 'free') && (
                    <div className="space-y-2 p-3 bg-primary/10 rounded-md">
                      <h4 className="text-sm font-medium">Your Pricing Preview:</h4>
                      {membershipType === 'community' && selectedProgram ? (
                         <div className="text-xs space-y-1">
                           {selectedProgram === 'The Family Vault' && (
                             <p className="text-green-600">✓ 30-day free trial, then $97/mo, $297/mo, $497/mo</p>
                           )}
                           {selectedProgram === 'The Family Business Accelerator' && (
                             <p className="text-green-600">✓ 90-day free trial, then $97/mo, $297/mo, $497/mo</p>
                           )}
                           {selectedProgram === 'The Family Legacy: VIP Weekend' && (
                             <p className="text-green-600">✓ 120-day free trial, then $97/mo, $297/mo, $497/mo</p>
                           )}
                           {selectedProgram === '' && (
                             <p className="text-green-600">✓ Community pricing: $97/mo, $297/mo, $497/mo</p>
                           )}
                         </div>
                      ) : membershipType === 'community' ? (
                        <p className="text-xs text-muted-foreground">Select a program to see your pricing</p>
                      ) : (
                        <div className="text-xs space-y-1">
                          <p className="text-muted-foreground">Standard pricing: $297/mo, $497/mo, $997/mo</p>
                          <p className="text-green-600">💡 Join community for 50% savings!</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                 <div className="space-y-2">
                   <Label htmlFor="signup-email">Email *</Label>
                   <Input
                     id="signup-email"
                     type="email"
                     placeholder="Enter your email"
                     value={email}
                     onChange={(e) => setEmail(e.target.value)}
                     required
                     disabled={isLoading}
                   />
                   
                   {/* Email Verification Status */}
                   {membershipType === 'community' && email && email.includes('@') && (
                     <div className="space-y-2">
                       {isVerifyingEmail && (
                         <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                           <Loader2 className="h-4 w-4 animate-spin" />
                           <span>Verifying membership...</span>
                         </div>
                       )}
                       
                       {/* Skool Verification Status */}
                       {skoolVerification.status && (
                         <div className={`flex items-center space-x-2 text-sm p-2 rounded-md ${
                           skoolVerification.status === 'verified' 
                             ? 'bg-green-50 text-green-700 border border-green-200' 
                             : skoolVerification.status === 'failed'
                             ? 'bg-red-50 text-red-700 border border-red-200'
                             : 'bg-blue-50 text-blue-700 border border-blue-200'
                         }`}>
                           {skoolVerification.status === 'verified' && <CheckCircle className="h-4 w-4" />}
                           {skoolVerification.status === 'failed' && <XCircle className="h-4 w-4" />}
                           {skoolVerification.status === 'pending' && <Loader2 className="h-4 w-4 animate-spin" />}
                           <span>{skoolVerification.message}</span>
                         </div>
                       )}
                       
                       {/* Program Detection Status */}
                       {programDetection.status && (
                         <div className={`flex items-center space-x-2 text-sm p-2 rounded-md ${
                           programDetection.status === 'detected' 
                             ? 'bg-green-50 text-green-700 border border-green-200' 
                             : programDetection.status === 'not_found'
                             ? 'bg-yellow-50 text-yellow-700 border border-yellow-200'
                             : programDetection.status === 'failed'
                             ? 'bg-red-50 text-red-700 border border-red-200'
                             : 'bg-blue-50 text-blue-700 border border-blue-200'
                         }`}>
                           {programDetection.status === 'detected' && <CheckCircle className="h-4 w-4" />}
                           {programDetection.status === 'not_found' && <AlertCircle className="h-4 w-4" />}
                           {programDetection.status === 'failed' && <XCircle className="h-4 w-4" />}
                           {programDetection.status === 'pending' && <Loader2 className="h-4 w-4 animate-spin" />}
                           <span>{programDetection.message}</span>
                         </div>
                       )}
                     </div>
                   )}
                 </div>
                 <div className="space-y-2">
                   <Label htmlFor="signup-password">Password *</Label>
                   <Input
                     id="signup-password"
                     type="password"
                     placeholder="Create a password (min. 6 characters)"
                     value={password}
                     onChange={(e) => setPassword(e.target.value)}
                     required
                     disabled={isLoading}
                     minLength={6}
                   />
                  </div>





                
                 <Button 
                   type="submit" 
                   className="w-full" 
                   style={{ backgroundColor: '#ffb500', color: '#290a52' }}
                   disabled={
                     isLoading || 
                     !firstName || 
                     !lastName || 
                     (membershipType === 'paid' && !customPrice) ||
                     (membershipType === 'community' && skoolVerification.status === 'failed') ||
                     isVerifyingEmail
                   }
                 >
                   {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                   {membershipType === 'paid' ? 'Create Account & Pay' : 'Create Account'}
                 </Button>
                
                <p className="text-xs text-muted-foreground text-center">
                  * Required fields - All information must be completed before account creation
                </p>
              </form>
              
            </TabsContent>

          </Tabs>
        </CardContent>
      </Card>
      <CommunityCallBooking />
    </div>
  )
}