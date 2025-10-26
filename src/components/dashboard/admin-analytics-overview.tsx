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

  useEffect(() => {
    fetchMetrics()
  }, [])

  const fetchMetrics = async () => {
    try {
      setLoading(true)

      // Get all subscribers
      const { data: subscribers } = await supabase
        .from('subscribers')
        .select('*')

      // Get all profiles to calculate metrics
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, membership_type, created_at')

      // Calculate paid members (subscribed = true)
      const paidMembers = subscribers?.filter(s => s.subscribed === true).length || 0

      // Calculate MRR based on subscription tiers
      const mrr = subscribers
        ?.filter(s => s.subscribed === true)
        .reduce((sum, sub) => {
          const tier = sub.subscription_tier
          if (tier === 'Starter') return sum + 97
          if (tier === 'Professional') return sum + (247 / 3)
          if (tier === 'Enterprise') return sum + (897 / 12)
          return sum
        }, 0) || 0

      // Calculate signups in last 30 days
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      const recentSignups = profiles?.filter(p => 
        new Date(p.created_at) >= thirtyDaysAgo
      ).length || 0

      // Calculate trials in progress
      const trialsInProgress = subscribers?.filter(s => 
        s.trial_days_remaining && s.trial_days_remaining > 0
      ).length || 0

      // Calculate churn (cancelled in last 30 days / total at start of period)
      const cancelledLast30Days = subscribers?.filter(s => 
        !s.subscribed && s.subscription_end && 
        new Date(s.subscription_end) >= thirtyDaysAgo
      ).length || 0
      const totalSubscribersStart = paidMembers + cancelledLast30Days
      const churn = totalSubscribersStart > 0 
        ? (cancelledLast30Days / totalSubscribersStart) * 100 
        : 0

      // Calculate conversion rate (paid / total signups in last 30 days)
      const conversionRate = recentSignups > 0 
        ? ((paidMembers / recentSignups) * 100) 
        : 0

      // Calculate trial conversion rate
      const convertedTrials = subscribers?.filter(s => 
        s.subscribed && s.trial_end_date && 
        new Date(s.trial_end_date) >= thirtyDaysAgo
      ).length || 0
      const totalTrials = trialsInProgress + convertedTrials
      const trialConversionRate = totalTrials > 0 
        ? (convertedTrials / totalTrials) * 100 
        : 0

      setMetrics({
        paidMembers,
        mrr: Math.round(mrr),
        churn: Number(churn.toFixed(2)),
        signups: recentSignups,
        conversionRate: Number(conversionRate.toFixed(2)),
        trialsInProgress,
        trialConversionRate: Number(trialConversionRate.toFixed(2))
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
            title="Signups" 
            value={metrics.signups} 
            subtitle="New user registrations"
          />
          <MetricCard 
            title="Conversion rate" 
            value={`${metrics.conversionRate}%`} 
            subtitle="Signup to paid conversion"
          />
          <MetricCard 
            title="Trials in progress" 
            value={metrics.trialsInProgress} 
            subtitle="Active trial users"
          />
        </div>
      </div>

      {/* Other Section */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Other</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
          <MetricCard 
            title="Total users" 
            value={metrics.paidMembers + metrics.trialsInProgress} 
            subtitle="Paid + trial users"
          />
        </div>
      </div>
    </div>
  )
}
