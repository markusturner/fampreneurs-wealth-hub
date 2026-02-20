import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/integrations/supabase/client'
import { Loader2, UserPlus, Shield, DollarSign } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

type UserRole = 'trustee' | 'family_office_member' | 'family_member'

// Only the four workspace community programs (matches the sidebar community list)
const PROGRAM_OPTIONS = [
  'Family Business University',
  'The Family Vault',
  'The Family Business Accelerator',
  'The Family Fortune Mastermind',
]

export function AdminUserManagement() {
  const [email, setEmail] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [role, setRole] = useState<UserRole>('family_member')
  const [programName, setProgramName] = useState('')
  const [mailingAddress, setMailingAddress] = useState('')
  const [truHeirsAccess, setTruHeirsAccess] = useState(true)
  const [isLoading, setIsLoading] = useState(false)

  // Payment plan fields
  const [planType, setPlanType] = useState<'paid_in_full' | 'payment_plan'>('paid_in_full')
  const [totalAmount, setTotalAmount] = useState('')
  const [installmentAmount, setInstallmentAmount] = useState('')
  const [installmentFrequency, setInstallmentFrequency] = useState<'monthly' | 'weekly' | 'biweekly'>('monthly')
  const [paymentStartDate, setPaymentStartDate] = useState('')

  const { toast } = useToast()
  const { user } = useAuth()

  const handleAddUser = async () => {
    if (!email || !firstName || !lastName || !role) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      })
      return
    }

    if (!totalAmount || isNaN(Number(totalAmount))) {
      toast({
        title: 'Missing Payment Info',
        description: 'Please enter a valid total amount',
        variant: 'destructive',
      })
      return
    }

    if (planType === 'payment_plan' && (!installmentAmount || !paymentStartDate)) {
      toast({
        title: 'Missing Payment Plan Info',
        description: 'Please fill in installment amount and start date',
        variant: 'destructive',
      })
      return
    }

    setIsLoading(true)

    try {
      console.log("Attempting to create user:", { email, firstName, lastName, role });
      
      const { data, error } = await supabase.functions.invoke('create-user-with-credentials', {
        body: {
          email,
          firstName,
          lastName,
          role,
          programName: programName || undefined,
          mailingAddress: mailingAddress || undefined,
          truHeirsAccess,
        },
      })

      console.log("Function response:", { data, error });

      if (error) {
        console.error("Function error:", error);
        throw new Error("Failed to create user. Please check the logs for details.");
      }

      if (data?.success === false || data?.error) {
        console.error("Data error:", data.error);
        throw new Error(data.error || "Failed to create user");
      }

      // Save payment plan to DB
      const userId = data?.userId
      if (userId) {
        const nextPaymentDue = planType === 'payment_plan' && paymentStartDate
          ? paymentStartDate
          : null

        const { error: planError } = await supabase
          .from('user_payment_plans' as any)
          .insert({
            user_id: userId,
            user_email: email,
            plan_type: planType,
            total_amount: Number(totalAmount),
            amount_paid: planType === 'paid_in_full' ? Number(totalAmount) : 0,
            installment_amount: planType === 'payment_plan' ? Number(installmentAmount) : null,
            installment_frequency: planType === 'payment_plan' ? installmentFrequency : null,
            next_payment_due: nextPaymentDue,
            payment_start_date: paymentStartDate || null,
            status: planType === 'paid_in_full' ? 'paid' : 'active',
            created_by: user?.id,
          })

        if (planError) {
          console.error("Payment plan save error:", planError)
          // Don't throw — user was created, just log the plan error
          toast({
            title: 'Note',
            description: 'User created but payment plan could not be saved. Please update manually.',
            variant: 'destructive',
          })
        }
      }

      toast({
        title: data.isExistingUser ? 'Credentials Updated!' : 'User Created Successfully!',
        description: data.isExistingUser
          ? `New credentials have been sent to ${email}`
          : `${firstName} ${lastName} has been added as ${role.replace(/_/g, ' ')}${planType === 'payment_plan' ? ' on a payment plan — reminders will be sent automatically.' : ' (Paid in Full).'}`,
      })

      // Reset form
      setEmail('')
      setFirstName('')
      setLastName('')
      setRole('family_member')
      setProgramName('')
      setMailingAddress('')
      setTruHeirsAccess(true)
      setPlanType('paid_in_full')
      setTotalAmount('')
      setInstallmentAmount('')
      setInstallmentFrequency('monthly')
      setPaymentStartDate('')
    } catch (error: any) {
      console.error('Error adding user:', error)
      
      let errorMessage = 'Failed to add user. Please try again.'
      
      if (error.message?.includes('Failed to fetch')) {
        errorMessage = 'The user creation service is still deploying. Please wait 2-3 minutes and try again.'
      } else if (error.message) {
        errorMessage = error.message
      }
      
      toast({
        title: 'Error Adding User',
        description: errorMessage,
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5" style={{ color: '#ffb500' }} />
          <CardTitle>Admin User Management</CardTitle>
        </div>
        <CardDescription>
          Add new users or resend credentials. Payment plans trigger automatic reminders and access revocation on missed payments.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="firstName">First Name</Label>
            <Input
              id="firstName"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="John"
              disabled={isLoading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName">Last Name</Label>
            <Input
              id="lastName"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Doe"
              disabled={isLoading}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email Address</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="user@example.com"
            disabled={isLoading}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="role">User Role</Label>
          <Select value={role} onValueChange={(value) => setRole(value as UserRole)} disabled={isLoading}>
            <SelectTrigger id="role">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="trustee">Trustee</SelectItem>
              <SelectItem value="family_office_member">Family Office Member</SelectItem>
              <SelectItem value="family_member">Family Member</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="program">Program</Label>
          <Select value={programName} onValueChange={setProgramName} disabled={isLoading}>
            <SelectTrigger id="program">
              <SelectValue placeholder="Select a program (optional)" />
            </SelectTrigger>
            <SelectContent>
              {PROGRAM_OPTIONS.map((p) => (
                <SelectItem key={p} value={p}>{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="mailingAddress">Mailing Address</Label>
          <Input
            id="mailingAddress"
            value={mailingAddress}
            onChange={(e) => setMailingAddress(e.target.value)}
            placeholder="123 Main St, City, State ZIP"
            disabled={isLoading}
          />
        </div>

        <div className="flex items-center justify-between py-2">
          <div className="space-y-0.5">
            <Label htmlFor="truheirs-access">TruHeirs Section Access</Label>
            <p className="text-sm text-muted-foreground">Allow access to TruHeirs dashboard, family office, and related features</p>
          </div>
          <Switch
            id="truheirs-access"
            checked={truHeirsAccess}
            onCheckedChange={setTruHeirsAccess}
            disabled={isLoading}
          />
        </div>

        {/* Payment Plan Section */}
        <div className="border rounded-lg p-4 space-y-4 bg-muted/30">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" style={{ color: '#ffb500' }} />
            <Label className="text-base font-semibold">Payment Details</Label>
          </div>

          <div className="space-y-2">
            <Label>Payment Type</Label>
            <Select value={planType} onValueChange={(v) => setPlanType(v as 'paid_in_full' | 'payment_plan')} disabled={isLoading}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="paid_in_full">Paid in Full</SelectItem>
                <SelectItem value="payment_plan">Payment Plan</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="totalAmount">Total Program Amount ($)</Label>
            <Input
              id="totalAmount"
              type="number"
              min="0"
              value={totalAmount}
              onChange={(e) => setTotalAmount(e.target.value)}
              placeholder="e.g. 5000"
              disabled={isLoading}
            />
          </div>

          {planType === 'payment_plan' && (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="installmentAmount">Installment Amount ($)</Label>
                  <Input
                    id="installmentAmount"
                    type="number"
                    min="0"
                    value={installmentAmount}
                    onChange={(e) => setInstallmentAmount(e.target.value)}
                    placeholder="e.g. 500"
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Frequency</Label>
                  <Select value={installmentFrequency} onValueChange={(v) => setInstallmentFrequency(v as any)} disabled={isLoading}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="biweekly">Bi-Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="paymentStartDate">First Payment Due Date</Label>
                <Input
                  id="paymentStartDate"
                  type="date"
                  value={paymentStartDate}
                  onChange={(e) => setPaymentStartDate(e.target.value)}
                  disabled={isLoading}
                />
              </div>

              <p className="text-xs text-muted-foreground">
                📧 Automatic payment reminders will be sent 7 days, 3 days, and 24 hours before each due date. Access will be revoked after 2 consecutive missed payments.
              </p>
            </>
          )}
        </div>

        <Button onClick={handleAddUser} disabled={isLoading} className="w-full">
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <UserPlus className="mr-2 h-4 w-4" />
              Add / Resend Credentials
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}
