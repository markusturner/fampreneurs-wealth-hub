import { useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { Loader2, AlertTriangle, Mail, CreditCard } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { PROGRAMS, type ProgramId } from '@/lib/stripe-programs'
import { useAuth } from '@/contexts/AuthContext'

export default function SignUp() {
  const [isLoading, setIsLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword] = useState('') // kept for minimal diff
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [selectedProgram, setSelectedProgram] = useState<ProgramId | ''>('')
  const [selectedPriceIndex, setSelectedPriceIndex] = useState<string>('')
  const [paymentMethod, setPaymentMethod] = useState<'credit_card' | 'other' | ''>('')
  const [streetAddress, setStreetAddress] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [zipCode, setZipCode] = useState('')
  const [dateOfBirth, setDateOfBirth] = useState('')

  const { toast } = useToast()
  const navigate = useNavigate()
  const { profile } = useAuth()
  const isAdmin = profile?.is_admin === true

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      if (password.length < 6) {
        toast({ title: "Password too short", description: "Password must be at least 6 characters long.", variant: "destructive" })
        return
      }

      if (!selectedProgram) {
        toast({ title: "Program required", description: "Please select a program.", variant: "destructive" })
        return
      }

      if (!paymentMethod) {
        toast({ title: "Payment method required", description: "Please select a payment method.", variant: "destructive" })
        return
      }

      if (paymentMethod === 'credit_card' && selectedPriceIndex === '') {
        toast({ title: "Pricing plan required", description: "Please select a pricing plan.", variant: "destructive" })
        return
      }

      const program = PROGRAMS.find(p => p.id === selectedProgram)

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
          data: {
            first_name: firstName,
            last_name: lastName,
            user_type: 'trustee',
            program_name: program?.name || '',
            program_id: selectedProgram,
            street_address: streetAddress,
            city: city,
            state: state,
            zip_code: zipCode,
            date_of_birth: dateOfBirth,
          }
        }
      })

      if (error) {
        toast({ title: "Sign up failed", description: error.message, variant: "destructive" })
        return
      }

      if (data.user && paymentMethod === 'credit_card' && program) {
        const priceIdx = parseInt(selectedPriceIndex)
        const pricing = program.pricing[priceIdx]

        if (pricing) {
          const { data: checkoutData, error: checkoutError } = await supabase.functions.invoke('create-checkout', {
            body: {
              price_id: pricing.price_id,
              mode: pricing.mode,
              email: email,
              program_name: program.name,
            }
          })

          if (!checkoutError && checkoutData?.url) {
            toast({ title: "Account created!", description: "Redirecting to payment..." })
            window.location.href = checkoutData.url
            return
          }
        }
      }

      toast({
        title: "Account created!",
        description: paymentMethod === 'other'
          ? "Member added for free. They can check their email to verify."
          : "Please check your email to verify your account.",
      })

      setEmail(''); setPassword(''); setFirstName(''); setLastName('')
      setSelectedProgram(''); setSelectedPriceIndex(''); setPaymentMethod('')
      setStreetAddress(''); setCity(''); setState(''); setZipCode(''); setDateOfBirth('')
    } catch (error) {
      toast({ title: "Something went wrong", description: "Please try again later.", variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }

  const currentProgram = PROGRAMS.find(p => p.id === selectedProgram)

  const handleGoogleAuth = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${window.location.origin}/dashboard` } })
      if (error) toast({ title: "Google sign up failed", description: error.message, variant: "destructive" })
    } catch { toast({ title: "Something went wrong", variant: "destructive" }) }
  }

  const handleAppleAuth = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({ provider: 'apple', options: { redirectTo: `${window.location.origin}/dashboard` } })
      if (error) toast({ title: "Apple sign up failed", description: error.message, variant: "destructive" })
    } catch { toast({ title: "Something went wrong", variant: "destructive" }) }
  }

  const handleMicrosoftAuth = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({ provider: 'azure', options: { redirectTo: `${window.location.origin}/dashboard`, scopes: 'email' } })
      if (error) toast({ title: "Microsoft sign up failed", description: error.message, variant: "destructive" })
    } catch { toast({ title: "Something went wrong", variant: "destructive" }) }
  }

  const handleLinkedInAuth = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({ provider: 'linkedin_oidc', options: { redirectTo: `${window.location.origin}/dashboard` } })
      if (error) toast({ title: "LinkedIn sign up failed", description: error.message, variant: "destructive" })
    } catch { toast({ title: "Something went wrong", variant: "destructive" }) }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-soft relative">
        <CardHeader className="text-center">
          <div className="mx-auto w-20 h-20 rounded-full flex items-center justify-center mb-4">
            <img src="/lovable-uploads/cb7af8d2-0809-4d9d-8fa4-acfb507144de.png" alt="TruHeirs Logo" className="w-20 h-20 object-contain" />
          </div>
          <CardTitle className="text-2xl font-bold">Create Account</CardTitle>
          <CardDescription>Sign up as a new Trustee</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignUp} className="space-y-4">
            <div className="px-4 py-3 bg-destructive/10 border-2 border-destructive/50 rounded-lg">
              <div className="flex items-center justify-center gap-2 mb-1">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                <span className="text-sm font-medium text-destructive">Creating Account For</span>
              </div>
              <div className="text-center"><span className="font-bold text-lg text-destructive">Trustee</span></div>
              <p className="text-xs text-center mt-2 text-muted-foreground">Create your trustee account to manage your family office.</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first-name">First Name</Label>
                <Input id="first-name" type="text" placeholder="John" value={firstName} onChange={(e) => setFirstName(e.target.value)} required disabled={isLoading} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last-name">Last Name</Label>
                <Input id="last-name" type="text" placeholder="Doe" value={lastName} onChange={(e) => setLastName(e.target.value)} required disabled={isLoading} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="signup-email">Email</Label>
              <Input id="signup-email" type="email" placeholder="Enter your email" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={isLoading} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="signup-password">Password</Label>
              <Input id="signup-password" type="password" placeholder="Create a password" value={password} onChange={(e) => setPassword(e.target.value)} required disabled={isLoading} />
              <p className="text-xs text-muted-foreground">Must be at least 6 characters long</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="zip-code">Zip Code</Label>
              <Input id="zip-code" type="text" placeholder="12345" value={zipCode} onChange={(e) => setZipCode(e.target.value)} required disabled={isLoading} />
            </div>
            <div className="space-y-2">
              <Label>Program</Label>
              <Select value={selectedProgram} onValueChange={(val) => { setSelectedProgram(val as ProgramId); setSelectedPriceIndex(''); }}>
                <SelectTrigger><SelectValue placeholder="Select a program" /></SelectTrigger>
                <SelectContent>
                  {PROGRAMS.map(p => (<SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Payment Method</Label>
              <Select value={paymentMethod} onValueChange={(val) => setPaymentMethod(val as 'credit_card' | 'other')}>
                <SelectTrigger><SelectValue placeholder="Select payment method" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="credit_card">
                    <div className="flex items-center gap-2"><CreditCard className="h-4 w-4" />Credit Card</div>
                  </SelectItem>
                  {isAdmin && (<SelectItem value="other">Other (Free - Admin Only)</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {paymentMethod === 'credit_card' && currentProgram && (
              <div className="space-y-2">
                <Label>Pricing Plan</Label>
                <Select value={selectedPriceIndex} onValueChange={setSelectedPriceIndex}>
                  <SelectTrigger><SelectValue placeholder="Select a plan" /></SelectTrigger>
                  <SelectContent>
                    {currentProgram.pricing.map((p, i) => (
                      <SelectItem key={i} value={String(i)}>{p.label} ({p.interval})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <Button type="submit" className="w-full" style={{ backgroundColor: '#ffb500', color: '#290a52' }} disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {paymentMethod === 'credit_card' ? 'Create Account & Pay' : 'Create Trustee Account'}
            </Button>



            <p className="text-center text-sm text-muted-foreground mt-4">
              Already have an account?{' '}
              <button type="button" onClick={() => navigate('/auth')} className="text-accent hover:underline font-medium">
                Sign In
              </button>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
