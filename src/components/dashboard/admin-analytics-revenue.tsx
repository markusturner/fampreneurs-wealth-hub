import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { DollarSign, TrendingUp, Users, Mail, Loader2, AlertCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

interface RevenueStats {
  totalRevenue: number
  monthlyRevenue: number
  activeSubscribers: number
  overduePayments: number
}

interface OverduePayment {
  id: string
  user_email: string
  amount: number
  days_overdue: number
  last_reminder_sent?: string
}

export function AdminAnalyticsRevenue() {
  const [stats, setStats] = useState<RevenueStats>({
    totalRevenue: 0,
    monthlyRevenue: 0,
    activeSubscribers: 0,
    overduePayments: 0
  })
  const [overduePayments, setOverduePayments] = useState<OverduePayment[]>([])
  const [loading, setLoading] = useState(true)
  const [sendingReminders, setSendingReminders] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    fetchAnalytics()
  }, [])

  const fetchAnalytics = async () => {
    try {
      setLoading(true)

      // Fetch revenue stats from subscribers
      const { data: subscribers, error: subsError } = await supabase
        .from('subscribers')
        .select('*')
        .eq('subscribed', true)

      if (subsError) throw subsError

      // Calculate stats
      const total = subscribers?.length || 0
      const monthlyRev = subscribers?.reduce((sum, sub) => {
        // Assuming subscription tiers: basic ($50), premium ($100), enterprise ($200)
        const tierAmount = sub.subscription_tier === 'enterprise' ? 200 : 
                          sub.subscription_tier === 'premium' ? 100 : 50
        return sum + tierAmount
      }, 0) || 0

      // Fetch overdue payments
      const { data: overdueData, error: overdueError } = await supabase
        .from('payment_reminders' as any)
        .select('*')
        .eq('status', 'overdue')
        .order('days_overdue', { ascending: false })

      if (overdueError && overdueError.code !== 'PGRST116') {
        console.error('Error fetching overdue payments:', overdueError)
      }

      const typedOverdueData: OverduePayment[] = (overdueData || []).map((item: any) => ({
        id: item.id,
        user_email: item.user_email,
        amount: item.amount,
        days_overdue: item.days_overdue,
        last_reminder_sent: item.last_reminder_sent
      }))

      setStats({
        totalRevenue: monthlyRev * 12, // Annual estimate
        monthlyRevenue: monthlyRev,
        activeSubscribers: total,
        overduePayments: typedOverdueData.length
      })

      setOverduePayments(typedOverdueData)
    } catch (error: any) {
      console.error('Error fetching analytics:', error)
      toast({
        title: 'Error',
        description: 'Failed to load analytics data',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const sendPaymentReminders = async () => {
    try {
      setSendingReminders(true)

      const { error } = await supabase.functions.invoke('send-payment-reminders', {
        body: { overduePayments }
      })

      if (error) throw error

      toast({
        title: 'Success',
        description: 'Payment reminders sent successfully'
      })

      fetchAnalytics()
    } catch (error: any) {
      console.error('Error sending reminders:', error)
      toast({
        title: 'Error',
        description: 'Failed to send payment reminders',
        variant: 'destructive'
      })
    } finally {
      setSendingReminders(false)
    }
  }

  const cleanupOverduePayments = async () => {
    try {
      const { error } = await supabase.functions.invoke('cleanup-overdue-payments')

      if (error) throw error

      toast({
        title: 'Success',
        description: 'Cleaned up overdue payments (5+ days old)'
      })

      fetchAnalytics()
    } catch (error: any) {
      console.error('Error cleaning up payments:', error)
      toast({
        title: 'Error',
        description: 'Failed to cleanup overdue payments',
        variant: 'destructive'
      })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Analytics & Revenue</h3>
          <p className="text-sm text-muted-foreground">Track subscription revenue and payments</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={sendPaymentReminders}
            disabled={sendingReminders || overduePayments.length === 0}
            variant="outline"
            size="sm"
          >
            {sendingReminders ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Mail className="h-4 w-4 mr-2" />
                Send Reminders
              </>
            )}
          </Button>
          <Button
            onClick={cleanupOverduePayments}
            variant="outline"
            size="sm"
          >
            <AlertCircle className="h-4 w-4 mr-2" />
            Cleanup Overdue (5+ days)
          </Button>
        </div>
      </div>

      {/* Revenue Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue (Annual)</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.totalRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Based on active subscriptions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.monthlyRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Current month estimate</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Subscribers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeSubscribers}</div>
            <p className="text-xs text-muted-foreground">Paying members</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue Payments</CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{stats.overduePayments}</div>
            <p className="text-xs text-muted-foreground">Require attention</p>
          </CardContent>
        </Card>
      </div>

      {/* Overdue Payments Table */}
      {overduePayments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Overdue Payments</CardTitle>
            <CardDescription>
              Payments that are past due and require follow-up
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User Email</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Days Overdue</TableHead>
                  <TableHead>Last Reminder</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {overduePayments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell className="font-medium">{payment.user_email}</TableCell>
                    <TableCell>${payment.amount}</TableCell>
                    <TableCell>{payment.days_overdue} days</TableCell>
                    <TableCell>
                      {payment.last_reminder_sent
                        ? new Date(payment.last_reminder_sent).toLocaleDateString()
                        : 'Never'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={payment.days_overdue >= 5 ? 'destructive' : 'secondary'}>
                        {payment.days_overdue >= 5 ? 'Critical' : 'Overdue'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
