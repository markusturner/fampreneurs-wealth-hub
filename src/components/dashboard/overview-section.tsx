
import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/integrations/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

import { Checkbox } from '@/components/ui/checkbox'
import {
  BarChart3,
  Target,
  AlertTriangle,
  BrainCircuit
} from 'lucide-react'
import { InvestmentChart } from '@/components/dashboard/investment-chart'
import { AssetAllocation } from '@/components/dashboard/asset-allocation'
import { BusinessGoalsDialog } from '@/components/dashboard/business-goals-dialog'
import { DEMO_DFO_ACCOUNTS, useDfoDemo } from '@/lib/dfo-demo'

interface Investment {
  id: string
  user_id: string
  platform_id: string
  total_value: number
  cash_balance: number | null
  day_change: number | null
  day_change_percent: number | null
  positions: any
  last_updated: string | null
  created_at: string
  updated_at: string
}

interface BusinessGoals {
  goals: string
  target_revenue: number | null
  target_timeline: string | null
}

export function OverviewSection() {
  const { user } = useAuth()
  const demoMode = useDfoDemo()
  const [investments, setInvestments] = useState<Investment[]>([])
  const [connectedAccountsBalanceTotal, setConnectedAccountsBalanceTotal] = useState(0)
  const [connectedAccountsData, setConnectedAccountsData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [businessGoals, setBusinessGoals] = useState<BusinessGoals | null>(null)
  const [goalsKey, setGoalsKey] = useState(0)
  const [completedSteps, setCompletedSteps] = useState<number[]>([])
  const [currentStepIndex, setCurrentStepIndex] = useState(1) // Start at index 1 (first step after header)

  useEffect(() => {
    fetchInvestments()
    fetchBusinessGoals()
    setCompletedSteps([]) // Reset progress when goals change
  }, [user, goalsKey])

  const fetchInvestments = async () => {
    if (!user?.id) {
      setLoading(false)
      return
    }
    
    try {
      const { data, error } = await supabase
        .from('investment_portfolios')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setInvestments(data || [])

      // Fetch connected accounts balance total
      const { data: accountsData, error: accountsDataError } = await supabase
        .from('connected_accounts')
        .select('id, account_name, balance, status, account_type, provider, currency, metadata')
        .eq('user_id', user.id)

      if (!accountsDataError && accountsData) {
        const sum = accountsData.reduce((s: number, a: any) => s + Number(a.balance || 0), 0)
        setConnectedAccountsBalanceTotal(sum)
        setConnectedAccountsData(accountsData)
      }
    } catch (error) {
      console.error('Error fetching investments:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchBusinessGoals = async () => {
    if (!user?.id) return

    try {
      const { data, error } = await supabase
        .from('business_goals')
        .select('goals, target_revenue, target_timeline')
        .eq('user_id', user.id)
        .maybeSingle()

      if (error && error.code !== 'PGRST116') throw error

      setBusinessGoals(data)
    } catch (error) {
      console.error('Error fetching business goals:', error)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const getTotalPortfolioValue = () => {
    return investments.reduce((sum, inv) => sum + inv.total_value, 0)
  }

  const getTotalDayChange = () => {
    return investments.reduce((sum, inv) => sum + (inv.day_change || 0), 0)
  }

  const getTotalCashBalance = () => {
    return investments.reduce((sum, inv) => sum + (inv.cash_balance || 0), 0)
  }

  // Get user-specific accounts balance from localStorage and connected accounts
  const getConnectedAccounts = () => {
    if (!user) return []
    
    const userKey = `connectedAccounts_${user.id}`
    const deletedKey = `deletedAccounts_${user.id}`
    
    const deletedAccounts = JSON.parse(localStorage.getItem(deletedKey) || '[]')
    const savedAccounts = JSON.parse(localStorage.getItem(userKey) || '[]')
    return savedAccounts.filter((account: any) => !deletedAccounts.includes(account.id))
  }

  const connectedAccounts = demoMode
    ? DEMO_DFO_ACCOUNTS
    : connectedAccountsData.length ? connectedAccountsData : getConnectedAccounts()

  const isInvestmentAccount = (account: any) => {
    const t = (account.account_type || account.type || '').toLowerCase()
    return t === 'brokerage' || t === 'investment'
  }

  const getAccountsBalance = () => {
    if (demoMode) return DEMO_DFO_ACCOUNTS.reduce((sum, account) => sum + account.balance, 0)
    const connectedLocalTotal = connectedAccounts.reduce((sum: number, account: any) => sum + (account.balance || 0), 0)
    // Use Supabase balance if user is authenticated, otherwise use localStorage
    return user ? connectedAccountsBalanceTotal : connectedLocalTotal
  }

  // Cash & Bank excludes brokerage/investment accounts so they are not counted twice
  const getCashBalance = () => {
    if (demoMode) return DEMO_DFO_ACCOUNTS.filter((a) => !isInvestmentAccount(a)).reduce((sum, account) => sum + account.balance, 0)
    return connectedAccounts.filter((a: any) => !isInvestmentAccount(a)).reduce((sum: number, account: any) => sum + (account.balance || 0), 0)
  }

  // Calculate combined totals for comprehensive overview
  const getTotalNetWorth = () => {
    return (demoMode ? 1250000 : getTotalPortfolioValue()) + getCashBalance()
  }

  // Get active accounts count for current user
  const getActiveAccountsCount = () => {
    if (!user) return 0
    
    const userKey = `connectedAccounts_${user.id}`
    const deletedKey = `deletedAccounts_${user.id}`
    
    const deletedAccounts = JSON.parse(localStorage.getItem(deletedKey) || '[]')
    const savedAccounts = JSON.parse(localStorage.getItem(userKey) || '[]')
    return savedAccounts.filter((account: any) => !deletedAccounts.includes(account.id) && account.status === 'connected').length
  }

  // Generate AI insights based on portfolio performance and business goals
  // Educational prompts only. No specific securities, allocations, or return figures (not investment advice).
  const generateAIInsights = () => {
    const totalValue = getTotalNetWorth()
    const accountsBalance = getAccountsBalance()
    const insights: { type: string; message: string; priority: string }[] = []

    if (businessGoals?.goals) {
      insights.push({
        type: 'opportunity',
        message: `Your goal: ${businessGoals.goals}. Review your progress with your coach or advisor at your next check-in.`,
        priority: 'high'
      })
    }
    if (accountsBalance > 0 && totalValue > 0 && accountsBalance / totalValue > 0.5) {
      insights.push({
        type: 'tip',
        message: 'Most of your tracked wealth is in cash. Learn about emergency funds and diversification in the Classroom, then talk with a licensed financial advisor about what fits you.',
        priority: 'medium'
      })
    }
    insights.push({
      type: 'tip',
      message: 'Make sure each asset is titled the way your trust plan intends. Review titles and beneficiaries with your attorney once a year.',
      priority: 'low'
    })
    insights.push({
      type: 'tip',
      message: 'These tips are educational only and are not legal, tax, or investment advice.',
      priority: 'low'
    })
    return insights
  }

  const aiInsights = generateAIInsights()
  const totalNetWorth = getTotalNetWorth()

  if (!demoMode && (connectedAccountsBalanceTotal === 0 && investments.length === 0 && connectedAccounts.length === 0)) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <BarChart3 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">Financial Overview</h3>
            <p className="text-muted-foreground mb-4">
              Connect your accounts or add investment data to see your complete financial overview.
            </p>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Your portfolio performance, net worth, and account balances will appear here.
              </p>
              <p className="text-sm text-muted-foreground">
                Start by connecting accounts or manually adding investment data.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="h-full">
      {/* Charts — one at a time to keep the page short */}
      <Card className="h-full">
        <CardContent className="p-4 sm:p-6">
          <Tabs defaultValue="performance">
            <TabsList className="mb-4">
              <TabsTrigger value="performance">Performance</TabsTrigger>
              <TabsTrigger value="allocation">Allocation</TabsTrigger>
            </TabsList>
            <TabsContent value="performance">
              <InvestmentChart
                accountsData={connectedAccounts}
                totalValue={getTotalNetWorth()}
              />
            </TabsContent>
            <TabsContent value="allocation">
              <AssetAllocation
                accountsData={connectedAccounts}
                totalBalance={getAccountsBalance()}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

    </div>
  )
}
