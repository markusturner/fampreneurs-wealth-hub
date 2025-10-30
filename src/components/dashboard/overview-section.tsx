
import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/integrations/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
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
import { BusinessGoalsDialog } from '@/components/dashboard/business-goals-dialog'

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
  const [investments, setInvestments] = useState<Investment[]>([])
  const [connectedAccountsBalanceTotal, setConnectedAccountsBalanceTotal] = useState(0)
  const [connectedAccountsData, setConnectedAccountsData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [businessGoals, setBusinessGoals] = useState<BusinessGoals | null>(null)
  const [goalsKey, setGoalsKey] = useState(0)
  const [completedSteps, setCompletedSteps] = useState<number[]>([])

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

  // Generate AI insights based on portfolio performance and business goals
  const generateAIInsights = () => {
    const totalValue = getTotalNetWorth()
    const dayChange = getTotalDayChange()
    const accountsBalance = getAccountsBalance()
    const insights = []

    // If user has set business goals, ONLY show goal-aligned insights
    if (businessGoals?.goals) {
      const timelineLabel = businessGoals.target_timeline?.replace('_', ' ') || 'your timeline'
      const revenueGoal = businessGoals.target_revenue ? formatCurrency(businessGoals.target_revenue) : 'your target'
      
      insights.push({
        type: 'opportunity',
        message: `🎯 YOUR GOAL: ${businessGoals.goals}${businessGoals.target_revenue ? `\nRevenue Target: ${revenueGoal} in ${timelineLabel.replace('_', ' ')}` : ''}`,
        priority: 'high'
      })

      // Goal-aligned insights based on current financial position
      if (businessGoals.target_revenue) {
        const currentMonthlyIncome = totalValue * 0.007
        const targetMonthlyIncome = businessGoals.target_revenue / 12
        const gap = targetMonthlyIncome - currentMonthlyIncome
        const clientsNeeded = Math.ceil(gap / 5000)

        // STEP 1: Foundation Setup
        insights.push({
          type: 'opportunity',
          message: `📋 STEP 1 - BUSINESS SETUP for "${businessGoals.goals}":

TODAY - Banking:
• Open business checking at Chase/Bank of America (free, online, 15 mins)
• Get business debit card for expenses

THIS WEEK - Legal Structure:
• Register LLC for "${businessGoals.goals}" at your state portal ($100-300)
• Or use ZenBusiness/LegalZoom if you want help ($0 + state fees)
• Get EIN from IRS.gov/EIN (free, takes 5 minutes)

NEXT STEP: Open business credit card (Chase Ink Business Unlimited - 0% APR for 12 months) to fund operations`,
          priority: 'high'
        })

        if (gap > 0) {
          // STEP 2: Revenue Generation (when there's a gap)
          insights.push({
            type: 'opportunity',
            message: `💰 STEP 2 - FIRST REVENUE for "${businessGoals.goals}":

YOUR MATH: Need ${formatCurrency(gap)}/month to hit ${revenueGoal}
Strategy: Get ${clientsNeeded} clients/customers paying ~$5k each

THIS MONTH - Create Your Offer:
• Package your "${businessGoals.goals}" into a clear service/product
• Create 1-page sales document explaining what they get + price
• Set up Stripe or PayPal to accept payments (takes 1 day)

WEEKS 2-4 - Find Your First Customers:
• LinkedIn: Connect with 20 ideal customers/day, message your offer
• Post in 5 relevant Facebook/Reddit groups about your solution
• Email 50 potential customers/week (find emails with Hunter.io)

WEEKS 5-8 - Close Deals:
• Book 10 calls/week with interested people (use Calendly)
• Send simple proposals via email within 24 hours
• Goal: Close ${clientsNeeded} paying clients = ${formatCurrency(gap)}/month`,
            priority: 'high'
          })

          insights.push({
            type: 'tip',
            message: `⚡ STEP 3 - SCALE "${businessGoals.goals}" to ${revenueGoal}:

MONTH 3-4 - Stop Doing Everything:
• Hire VA from Upwork ($6/hr, 20hrs/week) to handle admin/emails
• Document your process in Loom videos (15 mins each)
• You focus ONLY on getting new customers

MONTH 5-6 - Build Team Around Your Goal:
• Hire contractor to deliver the work ($30-50/hr)
• You do 20+ sales calls per week (your only job)
• Raise prices 30% for new clients (you're proven now)

MONTH 7-${timelineLabel.replace('_', ' ')} - Multiple Income Streams:
• Add related offering to "${businessGoals.goals}" (upsells, consulting, etc)
• Hire commission-based salesperson (10% of deals they close)
• Target: ${formatCurrency(targetMonthlyIncome)}/month steady
RESULT: ${revenueGoal}/year achieved`,
            priority: 'high'
          })
        } else {
          // When on track or ahead
          insights.push({
            type: 'opportunity',
            message: `🎉 STEP 2 - MAINTAIN & GROW (Current: On Track)
You have enough income for ${revenueGoal}/year. Now secure it:

THIS MONTH:
• Document your sales process (what works, scripts, follow-ups)
• Build 3-month cash reserve in business savings (${formatCurrency(targetMonthlyIncome * 3)})
• Create recurring revenue stream (monthly retainers, subscriptions)

NEXT 3 MONTHS:
• Diversify clients (don't rely on 1-2 clients for 80%+ of revenue)
• Raise prices 20% for new clients
• Launch passive income product (course, template, or toolkit)
TARGET: ${formatCurrency(targetMonthlyIncome * 1.5)}/month with less effort`,
            priority: 'medium'
          })
        }
      }

      // STEP 4: Financial Optimization (always show)
      insights.push({
        type: 'tip',
        message: `💡 STEP 4 - KEEP MORE MONEY (Ongoing):

TAX SAVINGS (Do Monthly):
• Track ALL expenses in QuickBooks/Wave (deduct 20-30% from taxes)
• Pay yourself via S-Corp if making $60k+ (saves $5-15k/year in taxes)
• Quarterly estimated taxes to IRS (avoid penalties)

PROFIT FIRST METHOD (Every 2 Weeks):
• 50% Operating expenses (team, tools, ads)
• 30% Owner pay (your salary)
• 15% Taxes (set aside, don't touch)
• 5% Profit (emergency fund first, then invest)

WEALTH BUILDING (After $10k+/month steady):
• Max out SEP IRA ($66k/year tax deductible)
• Invest excess in VTI ETF (simple, 7-10% returns)
• Build to 6 months expenses saved = Freedom`,
        priority: 'medium'
      })

      // Return ONLY goal-aligned practical insights
      return insights
    }

    // Only show generic insights if NO goals are set (this code below won't run if goals exist)
    // Business and income level recommendations based on portfolio size
    const monthlyIncomeEstimate = totalValue * 0.007 // Rough 7% annual return / 12 months
    
    // Below $10k/month income level - Focus on business creation/acquisition
    if (monthlyIncomeEstimate < 10000) {
      if (totalValue >= 10000) {
        insights.push({
          type: 'opportunity',
          message: `Business Acquisition ($${totalValue.toLocaleString()} available): Buy laundromat ($50-150k, 20-35% ROI), car wash ($40-200k, 15-25% ROI), or vending route ($5-50k, 35-50% ROI). Use SBA 7(a) loan (90% financing, 11-13% rates). Search BizBuySell.com, contact broker immediately.`,
          priority: 'high'
        })
        insights.push({
          type: 'tip',
          message: 'Service Business Starter: Pressure washing ($2k startup, $150-300/day), lawn care ($5k startup, $40-80/hr), handyman service ($3k tools, $50-100/hr). Get LLC ($100), insurance ($300/year), start local marketing immediately.',
          priority: 'high'
        })
      } else {
        insights.push({
          type: 'opportunity',
          message: 'Digital Business Launch: Dropshipping ($500 startup, use Shopify + Facebook Ads), YouTube automation ($1k startup, faceless channels), or Amazon FBA ($3-5k startup). Goal: $3k/month profit within 6 months.',
          priority: 'high'
        })
        insights.push({
          type: 'tip',
          message: 'Skill-Based Business: Web design ($0 startup, $2-10k/project), social media management ($0 startup, $500-2k/client), virtual assistance ($0 startup, $15-50/hr). Build portfolio on Fiverr/Upwork first.',
          priority: 'high'
        })
      }
    }
    
    // $10k-30k/month income - Focus on scaling existing business
    else if (monthlyIncomeEstimate >= 10000 && monthlyIncomeEstimate < 30000) {
      insights.push({
        type: 'opportunity',
        message: 'Scale Current Business: Hire 2-3 employees ($40-60k/year each), implement systems (CRM: HubSpot $50/mo, accounting: QuickBooks $30/mo), expand to 3 new markets. Target: Double revenue in 12 months through delegation.',
        priority: 'high'
      })
      insights.push({
        type: 'tip',
        message: 'Business Expansion: Launch complementary service lines, create recurring revenue model (subscriptions/maintenance), build email list (10k+ subscribers), partner with 5 local businesses for referrals. Reinvest 70% of profits for growth.',
        priority: 'medium'
      })
    }
    
    // $30k+/month income - Advanced wealth building and business empire
    else if (monthlyIncomeEstimate >= 30000) {
      insights.push({
        type: 'opportunity',
        message: 'Business Empire Building: Acquire 2-3 complementary businesses ($500k-2M each using seller financing), hire CEO for main business ($120k/year), create holding company structure. Target: $1M+ monthly revenue across portfolio.',
        priority: 'high'
      })
      insights.push({
        type: 'tip',
        message: 'Advanced Wealth Strategy: Real estate syndications (min $50k, 15-20% IRR), private equity funds (min $250k, 20-25% returns), start family office, create trust structures. Diversify across 7+ asset classes.',
        priority: 'medium'
      })
    }

    // Connected accounts insights with specific investment recommendations based on income level
    if (accountsBalance > 0 && investments.length === 0) {
      if (monthlyIncomeEstimate < 10000) {
        // Low income - keep most cash for business opportunities, minimal investing
        const emergencyFund = 6000 // 6 months emergency fund
        const businessCash = Math.max(accountsBalance * 0.7, 5000) // Keep 70% or min $5k for business
        const investmentAmount = Math.max(0, accountsBalance - emergencyFund - businessCash)
        
        if (investmentAmount > 1000) {
          insights.push({
            type: 'tip',
            message: `Cash Strategy: Keep ${formatCurrency(emergencyFund)} emergency fund + ${formatCurrency(businessCash)} for business opportunities. Only invest ${formatCurrency(investmentAmount)} in VTI until income increases. Focus on business first, not stock market.`,
            priority: 'medium'
          })
        } else {
          insights.push({
            type: 'tip',
            message: `Cash First: Keep all ${formatCurrency(accountsBalance)} liquid. You need cash for business startup costs, emergencies, and opportunities. Don't invest in stocks until you have $10k+ monthly income from business.`,
            priority: 'high'
          })
        }
      } else {
        // Higher income - can invest more aggressively
        const investmentAmount = Math.min(accountsBalance * 0.8, 50000)
        insights.push({
          type: 'opportunity',
          message: `Invest ${formatCurrency(investmentAmount)} immediately: 60% VTI (Total Stock Market ETF), 30% VXUS (International ETF), 10% BND (Bond ETF). Open Fidelity/Schwab account online, fund with ACH transfer, buy these ETFs. Expected 7-10% annual return.`,
          priority: 'medium'
        })
      }
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
        priority: 'medium'
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
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <div className="flex-1 min-w-0">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <BrainCircuit className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                <span className="truncate">AI Financial Insights</span>
              </CardTitle>
              <CardDescription className="mt-1 text-xs sm:text-sm">
                {businessGoals ? 
                  'Personalized insights aligned with your business goals' :
                  'Set your business goals to get personalized insights'
                }
              </CardDescription>
            </div>
            <div className="flex-shrink-0">
              <BusinessGoalsDialog onGoalsUpdated={() => setGoalsKey(prev => prev + 1)} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {!businessGoals ? (
            // Show steps to set goals if not set
            <div className="space-y-4">
              <div className="text-center py-4">
                <Target className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-semibold mb-2">Set Your Business Goals First</h3>
                <p className="text-sm text-muted-foreground mb-6">
                  Get personalized AI financial insights by setting your business goals in 3 easy steps:
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-start gap-3 p-4 rounded-lg border bg-muted/30">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
                    1
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-sm mb-1">Click "Set Business Goals"</h4>
                    <p className="text-xs text-muted-foreground">
                      Click the button at the top right of this card to open the goals dialog
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 rounded-lg border bg-muted/30">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
                    2
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-sm mb-1">Describe Your Goals</h4>
                    <p className="text-xs text-muted-foreground">
                      Write your specific business objectives (e.g., "Reach $1M revenue", "Acquire 2 rental properties")
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 rounded-lg border bg-muted/30">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
                    3
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-sm mb-1">Set Target & Timeline</h4>
                    <p className="text-xs text-muted-foreground">
                      Add your target revenue and timeline, then save to get personalized AI insights
                    </p>
                  </div>
                </div>
              </div>

              <div className="text-center pt-4">
                <BusinessGoalsDialog onGoalsUpdated={() => setGoalsKey(prev => prev + 1)} />
              </div>
            </div>
          ) : (
            // Show AI insights when goals are set
            <div className="space-y-3">
              {aiInsights.slice(0, completedSteps.length + 4).map((insight, index) => {
                // First item is the goal header - no checkbox
                if (index === 0) {
                  return (
                    <div key={index} className="flex items-start gap-3 p-4 rounded-lg border bg-primary/5">
                      <div className="p-1 rounded-full bg-primary/10">
                        <Target className="h-5 w-5" style={{ color: '#ffb500' }} />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold whitespace-pre-line">
                          {insight.message}
                        </p>
                      </div>
                    </div>
                  )
                }
                
                // Other items have checkboxes
                return (
                  <div key={index} className={`flex items-start gap-3 p-3 rounded-lg border ${
                    insight.priority === 'high' ? 'bg-red-50 border-red-200' :
                    insight.priority === 'medium' ? 'bg-yellow-50 border-yellow-200' :
                    'bg-green-50 border-green-200'
                  }`}>
                    <Checkbox
                      checked={completedSteps.includes(index)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setCompletedSteps([...completedSteps, index])
                        } else {
                          setCompletedSteps(completedSteps.filter(i => i !== index))
                        }
                      }}
                      className="mt-1"
                    />
                    <div className={`p-1 rounded-full ${
                      insight.priority === 'high' ? 'bg-red-100 text-red-600' :
                      insight.priority === 'medium' ? 'bg-yellow-100 text-yellow-600' :
                      'bg-green-100 text-green-600'
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
                      <p className={`text-sm whitespace-pre-line ${completedSteps.includes(index) ? 'line-through opacity-60' : ''}`}>
                        {insight.message}
                      </p>
                      <span className={`text-xs px-2 py-1 rounded-full inline-block mt-1 ${
                        insight.priority === 'high' ? 'bg-red-100 text-red-600' :
                        insight.priority === 'medium' ? 'bg-yellow-100 text-yellow-600' :
                        'bg-green-100 text-green-600'
                      }`}>
                        {insight.priority} priority
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
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
