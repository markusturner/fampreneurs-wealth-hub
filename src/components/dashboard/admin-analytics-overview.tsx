import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { supabase } from '@/integrations/supabase/client'
import { Loader2 } from 'lucide-react'

interface MetricCardProps {
  title: string
  value: string | number
  subtitle: string
}

function MetricCard({ title, value, subtitle }: MetricCardProps) {
  return (
    <Card className="bg-card/50 backdrop-blur">
      <CardContent className="pt-6">
        <div className="text-center space-y-2">
          <div className="text-4xl md:text-5xl font-bold">{value}</div>
          <div className="text-sm text-muted-foreground">{title}</div>
        </div>
      </CardContent>
    </Card>
  )
}

interface SubscriptionMetrics {
  paidMembers: number
  mrr: number
  churn: number
  signups: number
  conversionRate: number
  trialsInProgress: number
  trialConversionRate: number
}

export function AdminAnalyticsOverview() {
  const [metrics, setMetrics] = useState<SubscriptionMetrics>({
    paidMembers: 0,
    mrr: 0,
    churn: 0,
    signups: 0,
    conversionRate: 0,
    trialsInProgress: 0,
    trialConversionRate: 0
  })
  const [loading, setLoading] = useState(true)
  const [landingPageVisitors, setLandingPageVisitors] = useState(0)

  useEffect(() => {
    fetchMetrics()
  }, [])

  const fetchMetrics = async () => {
    try {
      setLoading(true)

      // Fetch landing page analytics for last 30 days
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      const startDate = thirtyDaysAgo.toISOString().split('T')[0]
      const endDate = new Date().toISOString().split('T')[0]
      
      let visitors = 0
      try {
        const { data: analyticsData } = await supabase.functions.invoke('analytics--read_project_analytics', {
          body: { 
            startdate: startDate, 
            enddate: endDate, 
            granularity: 'daily' 
          }
        })
        
        // Calculate total landing page visitors
        visitors = analyticsData?.reduce((sum: number, day: any) => sum + (day.visitors || 0), 0) || 0
        setLandingPageVisitors(visitors)
      } catch (error) {
        console.error('Error fetching analytics:', error)
      }

      // Get all subscribers
      const { data: subscribers } = await supabase
        .from('subscribers')
        .select('*')

      // Get all profiles to calculate metrics
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, membership_type, created_at')

      const totalUsers = profiles?.length || 0

      // Calculate paid members (subscribed = true)
      const paidMembers = subscribers?.filter(s => s.subscribed === true).length || 0

      // Calculate MRR based on subscription tiers
      // Starter: $97/month, Professional: $247/quarter, Enterprise: $897/annual
      const mrr = subscribers
        ?.filter(s => s.subscribed === true)
        .reduce((sum, sub) => {
          const tier = sub.subscription_tier
          if (tier === 'Starter') return sum + 97 // Monthly
          if (tier === 'Professional') return sum + (247 / 3) // Quarterly to monthly
          if (tier === 'Enterprise') return sum + (897 / 12) // Annual to monthly
          return sum
        }, 0) || 0


      // Calculate trials in progress (users who have trial_days_remaining > 0)
      const trialsInProgress = subscribers?.filter(s => 
        s.trial_days_remaining && s.trial_days_remaining > 0 && !s.subscribed
      ).length || 0

      // Calculate churn (cancelled in last 30 days)
      const cancelledLast30Days = subscribers?.filter(s => {
        if (!s.subscription_end) return false
        const endDate = new Date(s.subscription_end)
        return !s.subscribed && endDate >= thirtyDaysAgo && endDate <= new Date()
      }).length || 0
      
      const totalSubscribersStart = paidMembers + cancelledLast30Days
      const churn = totalSubscribersStart > 0 
        ? (cancelledLast30Days / totalSubscribersStart) * 100 
        : 0

      // Calculate paid signups in last 30 days (only users who became paid members)
      const paidSignups = profiles?.filter(p => {
        const createdAt = new Date(p.created_at)
        if (createdAt < thirtyDaysAgo) return false
        return subscribers?.some(s => s.user_id === p.user_id && s.subscribed)
      }).length || 0

      // Calculate conversion rate (paid signups / landing page visitors)
      const conversionRate = visitors > 0 
        ? (paidSignups / visitors) * 100 
        : 0

      // Calculate trial conversion rate (users who converted from trial to paid)
      const convertedFromTrial = subscribers?.filter(s => 
        s.subscribed && s.trial_end_date && 
        new Date(s.trial_end_date) >= thirtyDaysAgo
      ).length || 0
      
      const totalTrialsStarted = trialsInProgress + convertedFromTrial
      const trialConversionRate = totalTrialsStarted > 0 
        ? (convertedFromTrial / totalTrialsStarted) * 100 
        : 0

      setMetrics({
        paidMembers,
        mrr: Math.round(mrr),
        churn: Number(churn.toFixed(1)),
        signups: paidSignups,
        conversionRate: Number(conversionRate.toFixed(1)),
        trialsInProgress,
        trialConversionRate: Number(trialConversionRate.toFixed(1))
      })
    } catch (error) {
      console.error('Error fetching metrics:', error)
    } finally {
      setLoading(false)
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
      {/* Subscriptions Section */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Subscriptions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <MetricCard 
            title="Paid members" 
            value={metrics.paidMembers} 
            subtitle="Active subscriptions"
          />
          <MetricCard 
            title="MRR" 
            value={`$${metrics.mrr.toLocaleString()}`} 
            subtitle="Monthly recurring revenue"
          />
          <MetricCard 
            title="Churn (last 30d)" 
            value={`${metrics.churn}%`} 
            subtitle="Cancellation rate"
          />
        </div>
      </div>

      {/* Traffic Section */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Traffic (last 30 days)</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <MetricCard 
            title="Landing page visitors" 
            value={landingPageVisitors} 
            subtitle="Total page views"
          />
          <MetricCard 
            title="Paid signups" 
            value={metrics.signups} 
            subtitle="New paid members"
          />
          <MetricCard 
            title="Conversion rate" 
            value={`${metrics.conversionRate}%`} 
            subtitle="Visitors to paid members"
          />
        </div>
      </div>

      {/* Other Section */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Other</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <MetricCard 
            title="Trials in progress" 
            value={metrics.trialsInProgress} 
            subtitle="Active trial users"
          />
          <MetricCard 
            title="Trial conversion rate" 
            value={`${metrics.trialConversionRate}%`} 
            subtitle="Trial to paid conversion"
          />
          <MetricCard 
            title="Avg revenue per user" 
            value={metrics.paidMembers > 0 ? `$${Math.round(metrics.mrr / metrics.paidMembers)}` : '$0'} 
            subtitle="Per paying member"
          />
        </div>
      </div>
    </div>
  )
}
