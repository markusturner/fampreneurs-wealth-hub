import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { Loader2, Shield, Upload, User, CreditCard, ArrowLeft } from 'lucide-react'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useNavigate } from 'react-router-dom'
import { ThemeToggle } from '@/components/theme-toggle'
import { useTheme } from '@/components/theme-provider'
import { RecoveryDialog } from '@/components/auth/recovery-dialog'
import { TwoFactorSetup } from '@/components/auth/two-factor-setup'
import { ProfilePhotoUpload } from '@/components/auth/ProfilePhotoUpload'

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
  
  const { toast } = useToast()
  const navigate = useNavigate()
  const { theme } = useTheme()
  
  useEffect(() => {
    // Check URL parameters for payment success
    const urlParams = new URLSearchParams(window.location.search)
    const paymentStatus = urlParams.get('payment')
    const planName = urlParams.get('plan')
    
    if (paymentStatus === 'success') {
      // Show success message for completed payment
      toast({
        title: "Payment Successful! 🎉",
        description: `Welcome to ${planName || 'TruHeirs'}! Please create your account to get started.`,
        duration: 8000,
      })
      
      // Set membership type to paid if coming from payment
      setMembershipType('paid')
      
      // Extract price from plan name and set it
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
      
      // Clean up URL parameters
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
            ...(avatarUrl && { avatar_url: avatarUrl })
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
                   disabled={isLoading || !firstName || !lastName || (membershipType === 'paid' && !customPrice)}
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
    </div>
  )
}