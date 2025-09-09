
import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/integrations/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  TrendingUp, 
  TrendingDown, 
  PieChart, 
  Wallet, 
  BarChart3,
  Target,
  AlertTriangle,
  BrainCircuit,
  CreditCard
} from 'lucide-react'
import { InvestmentChart } from '@/components/dashboard/investment-chart'
import { AssetAllocation } from '@/components/dashboard/asset-allocation'

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

export function OverviewSection() {
  const { user } = useAuth()
  const [investments, setInvestments] = useState<Investment[]>([])
  const [connectedAccountsBalanceTotal, setConnectedAccountsBalanceTotal] = useState(0)
  const [connectedAccountsData, setConnectedAccountsData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchInvestments()
  }, [user])

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

  const connectedAccounts = connectedAccountsData.length ? connectedAccountsData : getConnectedAccounts()

  const getAccountsBalance = () => {
    const connectedLocalTotal = connectedAccounts.reduce((sum: number, account: any) => sum + (account.balance || 0), 0)
    // Use Supabase balance if user is authenticated, otherwise use localStorage
    return user ? connectedAccountsBalanceTotal : connectedLocalTotal
  }

  // Calculate combined totals for comprehensive overview
  const getTotalNetWorth = () => {
    return getTotalPortfolioValue() + getAccountsBalance()
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

  // Generate AI insights based on portfolio performance
  const generateAIInsights = () => {
    const totalValue = getTotalNetWorth()
    const dayChange = getTotalDayChange()
    const accountsBalance = getAccountsBalance()
    const insights = []

    // Connected accounts insights with specific investment recommendations
    if (accountsBalance > 0 && investments.length === 0) {
      const investmentAmount = Math.min(accountsBalance * 0.8, 10000) // Invest 80% or max $10k to start
      insights.push({
        type: 'opportunity',
        message: `Invest ${formatCurrency(investmentAmount)} immediately: 60% VTI (Total Stock Market ETF), 30% VXUS (International ETF), 10% BND (Bond ETF). Open Fidelity/Schwab account online, fund with ACH transfer, buy these ETFs. Expected 7-10% annual return.`,
        priority: 'high'
      })
    }

    // Performance-based insights with specific actions
    if (dayChange < -10000) {
      insights.push({
        type: 'alert',
        message: `Portfolio down ${formatCurrency(Math.abs(dayChange))} today. ACTION: Don't panic sell. If you have cash, consider buying more VTI/VXUS while prices are low (dollar-cost averaging). Set stop losses at -20% from peak if needed.`,
        priority: 'high'
      })
    } else if (dayChange > 20000) {
      insights.push({
        type: 'opportunity',
        message: `Strong gains (+${formatCurrency(dayChange)}) today. ACTION: Sell 25% of overperforming individual stocks, rebalance into VTI if concentration >10% in single stock. Consider taking profits on speculative positions.`,
        priority: 'medium'
      })
    }

    // Specific portfolio size strategies
    if (totalValue > 10000000) {
      insights.push({
        type: 'tip',
        message: 'With $10M+ net worth: Allocate 20% to REITs (VNQ), 15% to alternative investments via Fundrise/YieldStreet, consider private equity minimums. Hire fee-only financial advisor. Set up family trust.',
        priority: 'high'
      })
    } else if (totalValue > 1000000) {
      insights.push({
        type: 'tip',
        message: 'Millionaire strategy: 70% VTI, 20% VXUS, 10% BND. Add 5% crypto (BTC/ETH) via Coinbase. Max out 401k ($23,000), backdoor Roth IRA ($7,000). Open taxable account at Fidelity.',
        priority: 'medium'
      })
    } else if (totalValue > 100000) {
      insights.push({
        type: 'tip',
        message: 'Growing wealth strategy: Invest additional $1,000/month automatically. 80% VTI, 15% VXUS, 5% BND. Use M1 Finance for automatic rebalancing. Target: $1M in 7-10 years at this pace.',
        priority: 'medium'
      })
    } else if (totalValue > 10000) {
      insights.push({
        type: 'tip',
        message: 'Building foundation: Start with VTI only, add $500/month. Use Fidelity ZERO fee funds (FZROX). Emergency fund first: 3-6 months expenses in high-yield savings (Marcus/Ally at 4.5% APY).',
        priority: 'medium'
      })
    } else if (totalValue > 1000) {
      insights.push({
        type: 'tip',
        message: 'Getting started: Open Fidelity account, buy FZROX (zero fees). Start with $100/month automatic investment. Build to $10k, then diversify. Use Fidelity cashback credit card for 2% on all purchases.',
        priority: 'high'
      })
    }

    // Cash allocation with specific actions
    const cashBalance = getTotalCashBalance()
    const cashPercentage = totalValue > 0 ? (cashBalance / totalValue) * 100 : 0
    if (cashPercentage > 15) {
      const excessCash = cashBalance * 0.7 // Invest 70% of cash
      insights.push({
        type: 'opportunity',
        message: `You have ${cashPercentage.toFixed(1)}% in cash. INVEST ${formatCurrency(excessCash)} NOW: 70% VTI, 30% VXUS. Keep only 3-6 months expenses in high-yield savings (Ally Bank 4.5% APY). Opportunity cost: losing $${(excessCash * 0.07 / 12).toFixed(0)}/month.`,
        priority: 'high'
      })
    }

    // Specific tax optimization strategies
    if (totalValue > 50000) {
      insights.push({
        type: 'tip',
        message: 'Tax optimization: Max 401k ($23,000), Roth IRA backdoor conversion ($7,000), HSA if eligible ($4,300). Use tax-loss harvesting in taxable accounts. Hold VTI >1 year for long-term capital gains (15% vs 37%).',
        priority: 'medium'
      })
    }

    // Default specific insights if none generated
    if (insights.length === 0) {
      insights.push(
        {
          type: 'tip',
          message: 'Optimal allocation: 60% VTI (US Total Market), 30% VXUS (International), 10% BND (Bonds). Rebalance quarterly or when allocation drifts >5%. Use Fidelity/Schwab for $0 commissions.',
          priority: 'low'
        },
        {
          type: 'opportunity',
          message: 'Tax-loss harvesting: If any positions are down >$1,000, sell and buy similar ETF (VTI→SWTSX) to harvest losses. Offset up to $3,000 in ordinary income annually.',
          priority: 'low'
        }
      )
    }

    return insights
  }

  const aiInsights = generateAIInsights()
  const totalNetWorth = getTotalNetWorth()

  if ((connectedAccountsBalanceTotal === 0 && investments.length === 0 && connectedAccounts.length === 0)) {
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
    <div className="space-y-6">
      {/* Executive Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-2 gap-2 sm:gap-3 lg:gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <PieChart className="h-4 w-4" />
              Investment Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(getTotalPortfolioValue())}</div>
            <div className={`text-sm flex items-center gap-1 ${getTotalDayChange() >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {getTotalDayChange() >= 0 ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              {formatCurrency(getTotalDayChange())} today
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Cash & Bank
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(getAccountsBalance())}</div>
            <div className="text-xs text-muted-foreground">
              Available funds
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BrainCircuit className="h-5 w-5" />
            AI Financial Insights
          </CardTitle>
          <CardDescription>
            AI-powered insights to grow, reduce taxes & sustain your wealth
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {aiInsights.map((insight, index) => (
              <div key={index} className="flex items-start gap-3 p-3 rounded-lg border">
                <div className={`p-1 rounded-full ${
                  insight.priority === 'high' ? 'bg-red-100 text-red-600' :
                  insight.priority === 'medium' ? 'bg-yellow-100 text-yellow-600' :
                  'bg-blue-100 text-blue-600'
                }`}>
                  {insight.priority === 'high' ? (
                    <AlertTriangle className="h-4 w-4" />
                  ) : insight.type === 'opportunity' ? (
                    <Target className="h-4 w-4" />
                  ) : (
                    <BrainCircuit className="h-4 w-4" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm">{insight.message}</p>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    insight.priority === 'high' ? 'bg-red-100 text-red-600' :
                    insight.priority === 'medium' ? 'bg-yellow-100 text-yellow-600' :
                    'bg-blue-100 text-blue-600'
                  }`}>
                    {insight.priority} priority
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Portfolio Performance</CardTitle>
            <CardDescription>12-month account balance growth</CardDescription>
          </CardHeader>
          <CardContent>
            <InvestmentChart 
              accountsData={connectedAccounts} 
              totalValue={getTotalNetWorth()} 
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Account Allocation</CardTitle>
            <CardDescription>Current account distribution</CardDescription>
          </CardHeader>
          <CardContent>
            <AssetAllocation 
              accountsData={connectedAccounts}
              totalBalance={getAccountsBalance()} 
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
