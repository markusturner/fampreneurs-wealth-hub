import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { supabase } from '@/integrations/supabase/client'
import { Loader2, TrendingUp, DollarSign, Users, BarChart3 } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AdminGrowthCharts } from './admin-growth-charts'
import { AdminCourseCompletion } from './admin-course-completion'
import { AdminSopHeatmap } from './admin-sop-heatmap'
import { AdminTopReason } from './admin-top-reason'

interface MetricCardProps {
  title: string
  value: string | number
  subtitle: string
  icon?: React.ReactNode
  highlight?: boolean
}

function MetricCard({ title, value, subtitle, icon, highlight }: MetricCardProps) {
  return (
    <Card className={highlight ? 'border-[#ffb500]/40 bg-[#ffb500]/5' : 'bg-card/50 backdrop-blur'}>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{title}</p>
            <div className="text-2xl md:text-3xl font-bold">{value}</div>
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          </div>
          {icon && <div className="p-2 rounded-lg bg-muted/50">{icon}</div>}
        </div>
      </CardContent>
    </Card>
  )
}

interface SubscriptionMetrics {
  totalMembers: number
  paidMembers: number
  mrr: number
  mrrTruheirs: number
  mrrProgram: number
  ltgp: number
  churn: number
  signups: number
  conversionRate: number
  trialsInProgress: number
  trialConversionRate: number
  truheirdPaidCount: number
  programPaidCount: number
  programContractValue: number
  programCashCollected: number
  programRemaining: number
  trustSuccessRate: number
  trustSuccessCount: number
  successionSuccessRate: number
  successionSuccessCount: number
}

const METRICS_CACHE_KEY = 'admin_analytics_metrics_v1'

const EMPTY_METRICS: SubscriptionMetrics = {
  totalMembers: 0,
  paidMembers: 0,
  mrr: 0,
  mrrTruheirs: 0,
  mrrProgram: 0,
  ltgp: 0,
  churn: 0,
  signups: 0,
  conversionRate: 0,
  trialsInProgress: 0,
  trialConversionRate: 0,
  truheirdPaidCount: 0,
  programPaidCount: 0,
  programContractValue: 0,
  programCashCollected: 0,
  programRemaining: 0,
  trustSuccessRate: 0,
  trustSuccessCount: 0,
  successionSuccessRate: 0,
  successionSuccessCount: 0,
}

function readCachedMetrics(): SubscriptionMetrics | null {
  try {
    const raw = localStorage.getItem(METRICS_CACHE_KEY)
    return raw ? { ...EMPTY_METRICS, ...JSON.parse(raw) } : null
  } catch {
    return null
  }
}

export function AdminAnalyticsOverview() {
  const cached = readCachedMetrics()
  const [metrics, setMetrics] = useState<SubscriptionMetrics>(cached ?? EMPTY_METRICS)
  const [loading, setLoading] = useState(!cached)
  const [landingPageVisitors, setLandingPageVisitors] = useState(0)

  useEffect(() => {
    fetchMetrics()
  }, [])

  const fetchMetrics = async () => {
    try {


      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      
      const { count: pageViewsCount } = await supabase
        .from('page_views')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', thirtyDaysAgo.toISOString())
        .eq('page_path', '/')

      const visitors = pageViewsCount || 0
      setLandingPageVisitors(visitors)

      const { data: subscribers } = await supabase
        .from('subscribers')
        .select('*')

      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, membership_type, created_at, program_name, truheirs_access, program_contract_value, program_cash_collected, partner_group_id')

      const totalMembers = profiles?.length || 0
      const paidMembers = subscribers?.filter(s => s.subscribed === true).length || 0

      const calcMrrForSub = (sub: any) => {
        const tier = sub.subscription_tier
        if (tier === 'Starter') return 97
        if (tier === 'Professional') return 247 / 3
        if (tier === 'Enterprise') return 897 / 12
        return 0
      }

      const activeSubs = subscribers?.filter(s => s.subscribed === true) || []
      const mrr = activeSubs.reduce((sum, sub) => sum + calcMrrForSub(sub), 0)

      let mrrTruheirs = 0
      let mrrProgram = 0
      let truheirdPaidCount = 0
      let programPaidCount = 0
      
      for (const sub of activeSubs) {
        const userProfile = profiles?.find(p => p.user_id === sub.user_id)
        const amount = calcMrrForSub(sub)
        if (userProfile?.truheirs_access && !userProfile?.program_name) {
          // TruHeirs/DFO only (no program)
          mrrTruheirs += amount
          truheirdPaidCount++
        } else if (userProfile?.program_name && !userProfile?.truheirs_access) {
          // Program only (no TruHeirs/DFO)
          mrrProgram += amount
          programPaidCount++
        } else if (userProfile?.truheirs_access && userProfile?.program_name) {
          // Has both — split: count in both but attribute revenue to each
          mrrTruheirs += amount / 2
          truheirdPaidCount++
          mrrProgram += amount / 2
          programPaidCount++
        }
      }

      // Program metrics from contract data
      const programProfiles = profiles?.filter(p => p.program_name) || []
      // Linked partners share one contract — count their money only once per partner group
      const partnerGroupBest: Record<string, any> = {}
      const financeProfiles: any[] = []
      for (const p of programProfiles as any[]) {
        if (!p.partner_group_id) { financeProfiles.push(p); continue }
        const current = partnerGroupBest[p.partner_group_id]
        if (!current || (Number(p.program_contract_value) || 0) > (Number(current.program_contract_value) || 0)) {
          partnerGroupBest[p.partner_group_id] = p
        }
      }
      financeProfiles.push(...Object.values(partnerGroupBest))
      const programContractValue = financeProfiles.reduce((sum, p) => sum + ((p as any).program_contract_value || 0), 0)
      const programCashCollected = financeProfiles.reduce((sum, p) => sum + ((p as any).program_cash_collected || 0), 0)
      const programRemaining = programContractValue - programCashCollected
      programPaidCount = programProfiles.length

      // Program MRR based on cash collected / 12
      mrrProgram = Math.round(programCashCollected / 12)

      // LTGP = Lifetime Gross Profit (annualized MRR)
      const ltgp = mrr * 12

      const trialsInProgress = subscribers?.filter(s => 
        s.trial_days_remaining && s.trial_days_remaining > 0 && !s.subscribed
      ).length || 0

      const cancelledLast30Days = subscribers?.filter(s => {
        if (!s.subscription_end) return false
        const endDate = new Date(s.subscription_end)
        return !s.subscribed && endDate >= thirtyDaysAgo && endDate <= new Date()
      }).length || 0
      
      const totalSubscribersStart = paidMembers + cancelledLast30Days
      const churn = totalSubscribersStart > 0 ? (cancelledLast30Days / totalSubscribersStart) * 100 : 0

      const paidSignups = profiles?.filter(p => {
        const createdAt = new Date(p.created_at)
        if (createdAt < thirtyDaysAgo) return false
        return subscribers?.some(s => s.user_id === p.user_id && s.subscribed)
      }).length || 0

      const conversionRate = visitors > 0 ? (paidSignups / visitors) * 100 : 0

      const convertedFromTrial = subscribers?.filter(s => 
        s.subscribed && s.trial_end_date && new Date(s.trial_end_date) >= thirtyDaysAgo
      ).length || 0
      
      const totalTrialsStarted = trialsInProgress + convertedFromTrial
      const trialConversionRate = totalTrialsStarted > 0 ? (convertedFromTrial / totalTrialsStarted) * 100 : 0

      // Client Success Rates
      const { data: trustRows } = await supabase
        .from('trust_submissions')
        .select('user_id, status')
      const { data: successionRows } = await supabase
        .from('succession_progress')
        .select('user_id, status')

      const trustUsers = new Set((trustRows || []).map((r: any) => r.user_id))
      const successionUsers = new Set(
        (successionRows || [])
          .filter((r: any) => String(r.status || '').toLowerCase() === 'completed' || String(r.status || '').toLowerCase() === 'complete' || String(r.status || '').toLowerCase() === 'done')
          .map((r: any) => r.user_id)
      )
      const trustSuccessCount = trustUsers.size
      const successionSuccessCount = successionUsers.size
      const trustSuccessRate = totalMembers > 0 ? (trustSuccessCount / totalMembers) * 100 : 0
      const successionSuccessRate = totalMembers > 0 ? (successionSuccessCount / totalMembers) * 100 : 0

      const next: SubscriptionMetrics = {
        totalMembers,
        paidMembers,
        mrr: Math.round(mrr),
        mrrTruheirs: Math.round(mrrTruheirs),
        mrrProgram: Math.round(mrrProgram),
        ltgp: Math.round(ltgp),
        churn: Number(churn.toFixed(1)),
        signups: paidSignups,
        conversionRate: Number(conversionRate.toFixed(1)),
        trialsInProgress,
        trialConversionRate: Number(trialConversionRate.toFixed(1)),
        truheirdPaidCount,
        programPaidCount,
        programContractValue,
        programCashCollected,
        programRemaining,
        trustSuccessRate: Number(trustSuccessRate.toFixed(1)),
        trustSuccessCount,
        successionSuccessRate: Number(successionSuccessRate.toFixed(1)),
        successionSuccessCount,
      }
      setMetrics(next)
      try { localStorage.setItem(METRICS_CACHE_KEY, JSON.stringify(next)) } catch { /* ignore */ }
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
      <Tabs defaultValue="overall" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overall" className="flex items-center gap-1.5 text-sm">
            <BarChart3 className="h-4 w-4" />
            Overall
          </TabsTrigger>
          <TabsTrigger value="truheirs" className="flex items-center gap-1.5 text-sm">
            <DollarSign className="h-4 w-4" />
            TruHeirs
          </TabsTrigger>
          <TabsTrigger value="program" className="flex items-center gap-1.5 text-sm">
            <TrendingUp className="h-4 w-4" />
            Program
          </TabsTrigger>
        </TabsList>

        {/* OVERALL TAB */}
        <TabsContent value="overall" className="space-y-6">
          {/* LTGP Hero Card */}
          <Card className="border-[#ffb500]/40 bg-gradient-to-r from-[#ffb500]/10 to-transparent">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Lifetime Gross Profit (LTGP)</p>
                  <div className="text-4xl md:text-5xl font-bold mt-1" style={{ color: '#ffb500' }}>
                    ${metrics.ltgp.toLocaleString()}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">Annualized recurring revenue</p>
                </div>
                <div className="p-3 rounded-xl" style={{ backgroundColor: '#ffb500' }}>
                  <DollarSign className="h-6 w-6" style={{ color: '#290a52' }} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Client Success Rates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="border-[#290a52]/30">
              <CardContent className="pt-6">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Client Success Rate — Trust Creation</p>
                <div className="text-3xl font-bold mt-1" style={{ color: '#290a52' }}>{metrics.trustSuccessRate}%</div>
                <p className="text-sm text-muted-foreground mt-1">
                  {metrics.trustSuccessCount} of {metrics.totalMembers} members submitted a trust form
                </p>
              </CardContent>
            </Card>
            <Card className="border-[#2eb2ff]/30">
              <CardContent className="pt-6">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Client Success Rate — Succession Planning</p>
                <div className="text-3xl font-bold mt-1" style={{ color: '#2eb2ff' }}>{metrics.successionSuccessRate}%</div>
                <p className="text-sm text-muted-foreground mt-1">
                  {metrics.successionSuccessCount} of {metrics.totalMembers} members completed succession items
                </p>
              </CardContent>
            </Card>
          </div>



          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <MetricCard 
              title="Total Members" 
              value={metrics.totalMembers} 
              subtitle="All registered users"
              icon={<Users className="h-4 w-4 text-muted-foreground" />}
            />
            <MetricCard 
              title="Paid Members" 
              value={metrics.paidMembers} 
              subtitle="Active subscriptions"
              icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />}
            />
            <MetricCard 
              title="Total MRR" 
              value={`$${metrics.mrr.toLocaleString()}`} 
              subtitle="Monthly recurring revenue"
              icon={<DollarSign className="h-4 w-4 text-muted-foreground" />}
            />
            <MetricCard 
              title="Churn Rate" 
              value={`${metrics.churn}%`} 
              subtitle="Last 30 days"
            />
          </div>

          {/* Traffic & Conversion */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Traffic & Conversions</CardTitle>
              <CardDescription>Last 30 days performance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-3 rounded-lg bg-muted/30">
                  <div className="text-2xl font-bold">{landingPageVisitors}</div>
                  <p className="text-xs text-muted-foreground">Page Visitors</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-muted/30">
                  <div className="text-2xl font-bold">{metrics.signups}</div>
                  <p className="text-xs text-muted-foreground">Paid Signups</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-muted/30">
                  <div className="text-2xl font-bold">{metrics.conversionRate}%</div>
                  <p className="text-xs text-muted-foreground">Conversion Rate</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-muted/30">
                  <div className="text-2xl font-bold">{metrics.trialsInProgress}</div>
                  <p className="text-xs text-muted-foreground">Trials Active</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <AdminTopReason />
          <AdminCourseCompletion />
          <AdminSopHeatmap />
        </TabsContent>

        {/* TRUHEIRS TAB */}
        <TabsContent value="truheirs" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <MetricCard 
              title="TruHeirs MRR" 
              value={`$${metrics.mrrTruheirs.toLocaleString()}`} 
              subtitle="Monthly recurring from TruHeirs"
              icon={<DollarSign className="h-4 w-4" style={{ color: '#ffb500' }} />}
              highlight
            />
            <MetricCard 
              title="TruHeirs Paid Members" 
              value={metrics.truheirdPaidCount} 
              subtitle="Active TruHeirs subscribers"
              icon={<Users className="h-4 w-4" style={{ color: '#ffb500' }} />}
            />
            <MetricCard 
              title="TruHeirs ARPU" 
              value={metrics.truheirdPaidCount > 0 ? `$${Math.round(metrics.mrrTruheirs / metrics.truheirdPaidCount)}` : '$0'} 
              subtitle="Avg revenue per TruHeirs user"
            />
          </div>
          <MetricCard 
            title="TruHeirs Annual Revenue" 
            value={`$${(metrics.mrrTruheirs * 12).toLocaleString()}`} 
            subtitle="Projected annual TruHeirs revenue"
            highlight
          />

          <AdminCourseCompletion truheirsOnly />
          <AdminGrowthCharts truheirsOnly />
        </TabsContent>

        {/* PROGRAM TAB */}
        <TabsContent value="program" className="space-y-6">
          {/* Contract Overview Hero */}
          <Card className="border-[#ffb500]/40 bg-gradient-to-r from-[#ffb500]/10 to-transparent">
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center md:text-left">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Contract Value</p>
                  <div className="text-3xl md:text-4xl font-bold mt-1" style={{ color: '#ffb500' }}>
                    ${metrics.programContractValue.toLocaleString()}
                  </div>
                </div>
                <div className="text-center md:text-left">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Cash Collected</p>
                  <div className="text-3xl md:text-4xl font-bold mt-1 text-green-500">
                    ${metrics.programCashCollected.toLocaleString()}
                  </div>
                </div>
                <div className="text-center md:text-left">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Remaining Balance</p>
                  <div className="text-3xl md:text-4xl font-bold mt-1 text-orange-500">
                    ${metrics.programRemaining.toLocaleString()}
                  </div>
                </div>
              </div>
              {metrics.programContractValue > 0 && (
                <div className="mt-4">
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>Collection Progress</span>
                    <span>{Math.round((metrics.programCashCollected / metrics.programContractValue) * 100)}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-muted">
                    <div 
                      className="h-2 rounded-full bg-green-500 transition-all"
                      style={{ width: `${Math.min((metrics.programCashCollected / metrics.programContractValue) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <MetricCard 
              title="Program MRR" 
              value={`$${metrics.mrrProgram.toLocaleString()}`} 
              subtitle="Cash collected ÷ 12"
              icon={<DollarSign className="h-4 w-4" style={{ color: '#ffb500' }} />}
              highlight
            />
            <MetricCard 
              title="Program Paid Members" 
              value={metrics.programPaidCount} 
              subtitle="Trustees with programs"
              icon={<Users className="h-4 w-4" style={{ color: '#ffb500' }} />}
            />
            <MetricCard 
              title="Program ARPU" 
              value={metrics.programPaidCount > 0 ? `$${Math.round(metrics.programContractValue / metrics.programPaidCount).toLocaleString()}` : '$0'} 
              subtitle="Avg contract per trustee"
            />
            <MetricCard 
              title="Program Annual Revenue" 
              value={`$${(metrics.mrrProgram * 12).toLocaleString()}`} 
              subtitle="Projected annual revenue"
              highlight
            />
          </div>

          <AdminCourseCompletion programOnly />
          <AdminGrowthCharts programOnly />
        </TabsContent>
      </Tabs>
    </div>
  )
}
