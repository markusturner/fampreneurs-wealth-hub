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
import { useNavigate, useLocation } from 'react-router-dom'
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
  const location = useLocation()
  const { theme } = useTheme()
  
  // Determine default tab based on route
  const defaultTab = location.pathname === '/sign-up' ? 'signup' : 'signin'
  
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

    if (!email || !password) {
      toast({
        title: "Missing required fields",
        description: "Please provide email and password.",
        variant: "destructive",
      })
      return
    }

    if (password.length < 6) {
      toast({
        title: "Password too short",
        description: "Password must be at least 6 characters long.",
        variant: "destructive",
      })
      return
    }
    
    setIsLoading(true)

    try {
      console.log('Starting signup process...')
      cleanupAuthState()
      
      try {
        await supabase.auth.signOut({ scope: 'global' })
      } catch (err) {
        console.log('Signout error (expected):', err)
      }

      const redirectUrl = `${window.location.origin}/dashboard`
      console.log('Redirect URL:', redirectUrl)

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            first_name: firstName,
            last_name: lastName,
            display_name: `${firstName} ${lastName}`.trim(),
            occupation: occupation || '',
            membership_type: membershipType || 'free',
            program_name: selectedProgram || '',
            custom_price: customPrice || ''
          }
        }
      })

      console.log('Signup response:', { data, error })

      if (error) {
        console.error('Signup error:', error)
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
        console.log('User created:', data.user.id)
        
        // Upload profile photo if selected
        let avatarUrl = null
        if (profilePhoto) {
          console.log('Uploading profile photo...')
          avatarUrl = await uploadProfilePhoto(profilePhoto, data.user.id)
          if (!avatarUrl) {
            console.error('Photo upload failed')
          }
        }
        
        // Update profile with additional info
        console.log('Updating profile...')
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            program_name: selectedProgram || null,
            membership_type: membershipType || 'free',
            ...(avatarUrl && { 
              avatar_url: avatarUrl,
              profile_photo_uploaded: true
            })
          })
          .eq('user_id', data.user.id)

        if (profileError) {
          console.error('Profile update error:', profileError)
        }

        // Success! Skip 2FA and go straight to dashboard
        toast({
          title: "Account created successfully!",
          description: "Welcome to TruHeirs. Redirecting to your dashboard...",
        })
        
        // Redirect to dashboard after a short delay
        setTimeout(() => {
          window.location.href = '/dashboard'
        }, 1500)
      }
    } catch (error: any) {
      console.error('Unexpected signup error:', error)
      toast({
        title: "Something went wrong",
        description: error?.message || "Please try again later.",
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

  // Show 2FA setup if user just signed up (commented out - 2FA is now optional)
  /*
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
  */

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
          <Tabs defaultValue={defaultTab} className="w-full">
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
                     !email ||
                     !password ||
                     password.length < 6
                   }
                 >
                   {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                   Create Account
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