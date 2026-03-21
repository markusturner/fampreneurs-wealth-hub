import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/integrations/supabase/client'
import { Loader2, UserPlus, Shield, DollarSign } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

type UserRole = 'trustee' | 'family_office_member' | 'family_member'

const PROGRAM_OPTIONS = [
  'Family Business University',
  'The Family Vault',
  'The Family Business Accelerator',
  'The Family Fortune Mastermind',
]

export function AdminUserManagement() {
  const [bulkEmails, setBulkEmails] = useState('')
  const [role, setRole] = useState<UserRole>('family_member')
  const [programName, setProgramName] = useState('')
  const [truHeirsAccess, setTruHeirsAccess] = useState(true)
  const [isLoading, setIsLoading] = useState(false)

  const [planType, setPlanType] = useState<'free' | 'paid_in_full' | 'payment_plan'>('paid_in_full')
  const [totalAmount, setTotalAmount] = useState('')
  const [installmentAmount, setInstallmentAmount] = useState('')
  const [installmentFrequency, setInstallmentFrequency] = useState<'monthly' | 'weekly' | 'biweekly'>('monthly')
  const [paymentStartDate, setPaymentStartDate] = useState('')

  const { toast } = useToast()
  const { user } = useAuth()

  const parseEmails = (input: string): string[] => {
    return input
      .split(/[\n,;]+/)
      .map((e) => e.trim().toLowerCase())
      .filter((e) => e.length > 0 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e))
  }

  const handleBulkInvite = async () => {
    const emails = parseEmails(bulkEmails)

    if (emails.length === 0) {
      toast({
        title: 'No Valid Emails',
        description: 'Please enter at least one valid email address.',
        variant: 'destructive',
      })
      return
    }

    if (planType !== 'free' && (!totalAmount || isNaN(Number(totalAmount)))) {
      toast({
        title: 'Missing Payment Info',
        description: 'Please enter a valid total amount.',
        variant: 'destructive',
      })
      return
    }

    if (planType === 'payment_plan' && (!installmentAmount || !paymentStartDate)) {
      toast({
        title: 'Missing Payment Plan Info',
        description: 'Please fill in installment amount and start date.',
        variant: 'destructive',
      })
      return
    }

    setIsLoading(true)

    let successCount = 0
    let failCount = 0
    const errors: string[] = []

    for (const email of emails) {
      try {
        const { data, error } = await supabase.functions.invoke('create-user-with-credentials', {
          body: {
            email,
            firstName: 'Invited',
            lastName: 'User',
            role,
            programName: programName || undefined,
            truHeirsAccess,
            isBulkInvite: true,
          },
        })

        if (error || data?.success === false || data?.error) {
          throw new Error(data?.error || error?.message || 'Failed')
        }

        const userId = data?.userId
        if (userId && planType !== 'free') {
          const nextPaymentDue = planType === 'payment_plan' && paymentStartDate
            ? paymentStartDate
            : null

          await supabase
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
        }

        successCount++
      } catch (err: any) {
        failCount++
        errors.push(`${email}: ${err.message}`)
      }
    }

    if (successCount > 0) {
      toast({
        title: `${successCount} Invitation${successCount > 1 ? 's' : ''} Sent!`,
        description: `Users will receive an email to complete their profile.${failCount > 0 ? ` ${failCount} failed.` : ''}`,
      })
    }

    if (failCount > 0 && successCount === 0) {
      toast({
        title: 'All Invitations Failed',
        description: errors.slice(0, 3).join('; '),
        variant: 'destructive',
      })
    }

    // Reset
    setBulkEmails('')
    setRole('family_member')
    setProgramName('')
    setTruHeirsAccess(true)
    setPlanType('paid_in_full')
    setTotalAmount('')
    setInstallmentAmount('')
    setInstallmentFrequency('monthly')
    setPaymentStartDate('')
    setIsLoading(false)
  }

  const emailCount = parseEmails(bulkEmails).length

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5" style={{ color: '#ffb500' }} />
          <CardTitle>Bulk Invite Users</CardTitle>
        </div>
        <CardDescription>
          Invite users via email in bulk. They'll receive an invitation to complete their profile (name, address, etc.). Payment plans trigger automatic reminders.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="bulkEmails">Email Addresses</Label>
          <Textarea
            id="bulkEmails"
            value={bulkEmails}
            onChange={(e) => setBulkEmails(e.target.value)}
            placeholder={"Enter emails separated by commas or new lines:\njohn@example.com\njane@example.com, bob@example.com"}
            rows={5}
            disabled={isLoading}
          />
          <p className="text-xs text-muted-foreground">
            {emailCount > 0 ? `${emailCount} valid email${emailCount > 1 ? 's' : ''} detected` : 'Separate emails with commas, semicolons, or new lines'}
          </p>
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
            <Select value={planType} onValueChange={(v) => setPlanType(v as 'free' | 'paid_in_full' | 'payment_plan')} disabled={isLoading}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="free">Free</SelectItem>
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

        <Button onClick={handleBulkInvite} disabled={isLoading || emailCount === 0} className="w-full" style={{ backgroundColor: '#ffb500', color: '#290a52' }}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Sending {emailCount} Invitation{emailCount > 1 ? 's' : ''}...
            </>
          ) : (
            <>
              <UserPlus className="mr-2 h-4 w-4" />
              Send {emailCount > 0 ? `${emailCount} ` : ''}Invitation{emailCount !== 1 ? 's' : ''}
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}
