import { useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { Loader2, CreditCard } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { PROGRAMS, type ProgramId } from '@/lib/stripe-programs'
import { useAuth } from '@/contexts/AuthContext'

export default function SignUp() {
  const [isLoading, setIsLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [selectedProgram, setSelectedProgram] = useState<ProgramId | ''>('')
  const [selectedPriceIndex, setSelectedPriceIndex] = useState<string>('')
  const [paymentMethod, setPaymentMethod] = useState<'credit_card' | 'other' | ''>('')
  const [zipCode, setZipCode] = useState('')

  const { toast } = useToast()
  const navigate = useNavigate()
  const { profile } = useAuth()
  const isAdmin = profile?.is_admin === true

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
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
      if (!program) {
        toast({ title: "Invalid program", variant: "destructive" })
        return
      }

      // Admin-only "Other (Free)" path - create user immediately with temp password emailed
      if (paymentMethod === 'other') {
        const { data, error } = await supabase.functions.invoke('create-user-with-credentials', {
          body: {
            email,
            firstName,
            lastName,
            role: 'trustee',
            programName: program.name,
            mailingAddress: zipCode,
          },
        })
        if (error || !data?.success) {
          toast({ title: "Sign up failed", description: error?.message || data?.error || "Try again later.", variant: "destructive" })
          return
        }
        toast({ title: "Account created!", description: "A temporary password has been emailed to the user." })
        setEmail(''); setFirstName(''); setLastName('')
        setSelectedProgram(''); setSelectedPriceIndex(''); setPaymentMethod(''); setZipCode('')
        return
      }

      // Credit card path - go to Stripe checkout. Account is created by webhook after payment.
      const priceIdx = parseInt(selectedPriceIndex)
      const pricing = program.pricing[priceIdx]
      if (!pricing) {
        toast({ title: "Invalid pricing plan", variant: "destructive" })
        return
      }

      const { data: checkoutData, error: checkoutError } = await supabase.functions.invoke('signup-create-checkout', {
        body: {
          price_id: pricing.price_id,
          mode: pricing.mode,
          email,
          firstName,
          lastName,
          zipCode,
          programName: program.name,
          programId: selectedProgram,
        },
      })

      if (checkoutError || !checkoutData?.url) {
        toast({ title: "Checkout failed", description: checkoutError?.message || "Unable to start checkout.", variant: "destructive" })
        return
      }

      window.location.href = checkoutData.url
    } catch (error) {
      toast({ title: "Something went wrong", description: "Please try again later.", variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }

  const currentProgram = PROGRAMS.find(p => p.id === selectedProgram)

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-3">
      <Card className="w-full max-w-md shadow-soft relative">
        <CardHeader className="text-center pb-2 pt-4">
          <div className="mx-auto w-12 h-12 rounded-full flex items-center justify-center mb-1">
            <img src="/lovable-uploads/cb7af8d2-0809-4d9d-8fa4-acfb507144de.png" alt="TruHeirs Logo" className="w-12 h-12 object-contain" />
          </div>
          <CardTitle className="text-xl font-bold">Create Trustee Account</CardTitle>
          <CardDescription className="text-xs">A temporary password will be emailed after payment.</CardDescription>
        </CardHeader>
        <CardContent className="pb-4">
          <form onSubmit={handleSignUp} className="space-y-2.5">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label htmlFor="first-name" className="text-xs">First Name</Label>
                <Input id="first-name" type="text" placeholder="John" value={firstName} onChange={(e) => setFirstName(e.target.value)} required disabled={isLoading} className="h-9" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="last-name" className="text-xs">Last Name</Label>
                <Input id="last-name" type="text" placeholder="Doe" value={lastName} onChange={(e) => setLastName(e.target.value)} required disabled={isLoading} className="h-9" />
              </div>
            </div>

            <div className="grid grid-cols-[1fr_110px] gap-2">
              <div className="space-y-1">
                <Label htmlFor="signup-email" className="text-xs">Email</Label>
                <Input id="signup-email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={isLoading} className="h-9" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="zip-code" className="text-xs">Zip Code</Label>
                <Input id="zip-code" type="text" placeholder="12345" value={zipCode} onChange={(e) => setZipCode(e.target.value)} required disabled={isLoading} className="h-9" />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Program</Label>
              <Select value={selectedProgram} onValueChange={(val) => { setSelectedProgram(val as ProgramId); setSelectedPriceIndex(''); }}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Select a program" /></SelectTrigger>
                <SelectContent>
                  {PROGRAMS.map(p => (<SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Payment Method</Label>
              <Select value={paymentMethod} onValueChange={(val) => setPaymentMethod(val as 'credit_card' | 'other')}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Select payment method" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="credit_card">
                    <div className="flex items-center gap-2"><CreditCard className="h-4 w-4" />Credit Card</div>
                  </SelectItem>
                  {isAdmin && (<SelectItem value="other">Other (Free - Admin Only)</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {paymentMethod === 'credit_card' && currentProgram && (
              <div className="space-y-1">
                <Label className="text-xs">Pricing Plan</Label>
                <Select value={selectedPriceIndex} onValueChange={setSelectedPriceIndex}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Select a plan" /></SelectTrigger>
                  <SelectContent>
                    {currentProgram.pricing.map((p, i) => (
                      <SelectItem key={i} value={String(i)}>{p.label} ({p.interval})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <Button type="submit" className="w-full h-9 mt-1" style={{ backgroundColor: '#ffb500', color: '#290a52' }} disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {paymentMethod === 'credit_card' ? 'Continue to Payment' : 'Create Trustee Account'}
            </Button>

            <p className="text-center text-xs text-muted-foreground">
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
