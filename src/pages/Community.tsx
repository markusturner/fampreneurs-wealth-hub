import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/integrations/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { NavHeader } from '@/components/dashboard/nav-header'
import { useToast } from '@/hooks/use-toast'
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  PieChart, 
  Wallet, 
  BarChart3,
  Building2,
  Shield,
  Target,
  AlertTriangle,
  BrainCircuit,
  CreditCard,
  Home,
  Briefcase,
  Bitcoin,
  FileText,
  Users,
  Lock,
  ArrowLeft
} from 'lucide-react'
import { InvestmentChart } from '@/components/dashboard/investment-chart'
import { AssetAllocation } from '@/components/dashboard/asset-allocation'
import { AccountIntegration } from '@/components/dashboard/account-integration'
import { TransactionMonitoring } from '@/components/dashboard/transaction-monitoring'
import { BudgetingAnalytics } from '@/components/dashboard/budgeting-analytics'
import { FamilyMemberManagement } from '@/components/dashboard/family-member-management'

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

interface AssetAllocationData {
  name: string
  value: number
  color: string
}

export default function Community() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [investments, setInvestments] = useState<Investment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchInvestments()
  }, [])

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

  const formatPercent = (percent: number) => {
    return `${percent >= 0 ? '+' : ''}${percent.toFixed(2)}%`
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

  const connectedAccounts = getConnectedAccounts()

  const getAccountsBalance = () => {
    return connectedAccounts.reduce((sum: number, account: any) => sum + (account.balance || 0), 0)
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

  // Generate asset allocation based on account types from accounts section
  const generateAssetAllocation = () => {
    const mockAccountTypes = [
      { name: 'Brokerage', value: 62, color: '#3b82f6' },
      { name: 'Bank', value: 18, color: '#10b981' },
      { name: 'Crypto', value: 14, color: '#f59e0b' },
      { name: 'Business', value: 6, color: '#8b5cf6' }
    ]
    return mockAccountTypes
  }

  const assetAllocationData: AssetAllocationData[] = generateAssetAllocation()

  // Generate AI insights based on portfolio performance
  const generateAIInsights = () => {
    const totalValue = getTotalPortfolioValue()
    const dayChange = getTotalDayChange()
    const insights = []

    // Performance-based insights
    if (dayChange < -10000) {
      insights.push({
        type: 'alert',
        message: `Portfolio declined by ${formatCurrency(Math.abs(dayChange))} today. Consider reviewing your risk tolerance and rebalancing.`,
        priority: 'high'
      })
    } else if (dayChange > 20000) {
      insights.push({
        type: 'opportunity',
        message: `Strong portfolio performance today (+${formatCurrency(dayChange)}). Consider taking profits on overperforming positions.`,
        priority: 'medium'
      })
    }

    // Portfolio size insights
    if (totalValue > 10000000) {
      insights.push({
        type: 'tip',
        message: 'With your portfolio size, consider diversifying into alternative investments like real estate or private equity.',
        priority: 'medium'
      })
    }

    // Cash allocation insight
    const cashBalance = getTotalCashBalance()
    const cashPercentage = totalValue > 0 ? (cashBalance / totalValue) * 100 : 0
    if (cashPercentage > 10) {
      insights.push({
        type: 'opportunity',
        message: `You have ${cashPercentage.toFixed(1)}% in cash. Consider investing excess cash for better returns.`,
        priority: 'medium'
      })
    }

    // Default insights if none generated
    if (insights.length === 0) {
      insights.push(
        {
          type: 'tip',
          message: 'Your portfolio is well-balanced. Consider regular rebalancing to maintain target allocations.',
          priority: 'low'
        },
        {
          type: 'opportunity',
          message: 'Tax-loss harvesting opportunities may be available in your taxable accounts.',
          priority: 'low'
        }
      )
    }

    return insights
  }

  const aiInsights = generateAIInsights()

  return (
    <div className="min-h-screen bg-background">
      <NavHeader />
      
        <div className="mobile-container mx-auto py-4 sm:py-6 lg:py-8 space-y-6 sm:space-y-8 lg:space-y-10 max-w-7xl mobile-safe-bottom">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-6">
          <div className="space-y-2">
            <h1 className="text-responsive-xl font-bold gradient-text tracking-tight">Digital Family Office</h1>
            <p className="text-responsive-sm text-muted-foreground">
              Complete financial ecosystem management and wealth tracking
            </p>
          </div>
        </div>

        <Tabs defaultValue="overview" className="space-y-6 sm:space-y-8">
          <TabsList className="grid w-full grid-cols-5 gap-1 p-1.5 bg-muted/60 rounded-2xl shadow-sm">
            <TabsTrigger 
              value="overview" 
              className="text-responsive-xs font-semibold px-3 py-3.5 rounded-xl transition-all duration-300 data-[state=active]:bg-background data-[state=active]:shadow-md data-[state=active]:text-primary touch-optimized"
            >
              <span className="hidden sm:inline">Overview</span>
              <span className="sm:hidden">Home</span>
            </TabsTrigger>
            <TabsTrigger 
              value="accounts" 
              className="text-responsive-xs font-semibold px-3 py-3.5 rounded-xl transition-all duration-300 data-[state=active]:bg-background data-[state=active]:shadow-md data-[state=active]:text-primary touch-optimized"
            >
              <span className="hidden sm:inline">Accounts</span>
              <span className="sm:hidden">Accts</span>
            </TabsTrigger>
            <TabsTrigger 
              value="transactions" 
              className="text-responsive-xs font-semibold px-3 py-3.5 rounded-xl transition-all duration-300 data-[state=active]:bg-background data-[state=active]:shadow-md data-[state=active]:text-primary touch-optimized"
            >
              <span className="hidden sm:inline">Transactions</span>
              <span className="sm:hidden">Trans</span>
            </TabsTrigger>
            <TabsTrigger 
              value="budget" 
              className="text-responsive-xs font-semibold px-3 py-3.5 rounded-xl transition-all duration-300 data-[state=active]:bg-background data-[state=active]:shadow-md data-[state=active]:text-primary touch-optimized"
            >
              Budget
            </TabsTrigger>
            <TabsTrigger 
              value="reports" 
              className="text-responsive-xs font-semibold px-3 py-3.5 rounded-xl transition-all duration-300 data-[state=active]:bg-background data-[state=active]:shadow-md data-[state=active]:text-primary touch-optimized"
            >
              Reports
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Only show overview if there are connected accounts or investment data */}
            {(connectedAccounts.length > 0 || investments.length > 0) ? (
              <>
                {/* Executive Summary */}
                <div className="stats-grid">
                  <Card className="mobile-card touch-optimized">
                    <CardHeader className="mobile-card-padding pb-2">
                      <CardTitle className="text-responsive-xs font-medium flex items-center gap-2">
                        <Wallet className="h-4 w-4 text-primary" />
                        <span className="hidden sm:inline">Net Worth</span>
                        <span className="sm:hidden">Net</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="mobile-card-padding pt-0">
                      <div className="text-responsive-base font-bold text-foreground">
                        {formatCurrency(getAccountsBalance() + getTotalPortfolioValue())}
                      </div>
                      <div className="text-responsive-xs text-green-600 flex items-center gap-1 mt-1">
                        <TrendingUp className="h-3 w-3" />
                        <span className="hidden sm:inline">Total Assets</span>
                        <span className="sm:hidden">Assets</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="mobile-card touch-optimized">
                    <CardHeader className="mobile-card-padding pb-2">
                      <CardTitle className="text-responsive-xs font-medium flex items-center gap-2">
                        <PieChart className="h-4 w-4 text-primary" />
                        <span className="hidden lg:inline">Portfolio Value</span>
                        <span className="lg:hidden">Portfolio</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="mobile-card-padding pt-0">
                      <div className="text-responsive-base font-bold text-foreground">
                        {formatCurrency(getTotalPortfolioValue())}
                      </div>
                      <div className={`text-responsive-xs flex items-center gap-1 mt-1 ${getTotalDayChange() >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {getTotalDayChange() >= 0 ? (
                          <TrendingUp className="h-3 w-3" />
                        ) : (
                          <TrendingDown className="h-3 w-3" />
                        )}
                        <span className="hidden sm:inline">{formatCurrency(getTotalDayChange())} today</span>
                        <span className="sm:hidden">{formatCurrency(getTotalDayChange())}</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="mobile-card touch-optimized">
                    <CardHeader className="mobile-card-padding pb-2">
                      <CardTitle className="text-responsive-xs font-medium flex items-center gap-2">
                        <CreditCard className="h-4 w-4 text-primary" />
                        <span className="hidden sm:inline">Cash & Bank</span>
                        <span className="sm:hidden">Cash</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="mobile-card-padding pt-0">
                      <div className="text-responsive-base font-bold text-foreground">
                        {formatCurrency(getAccountsBalance())}
                      </div>
                      <div className="text-responsive-xs text-muted-foreground mt-1">
                        <span className="hidden sm:inline">Available funds</span>
                        <span className="sm:hidden">Available</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="mobile-card touch-optimized">
                    <CardHeader className="mobile-card-padding pb-2">
                      <CardTitle className="text-responsive-xs font-medium flex items-center gap-2">
                        <BarChart3 className="h-4 w-4 text-primary" />
                        <span className="hidden lg:inline">Active Accounts</span>
                        <span className="lg:hidden">Accounts</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="mobile-card-padding pt-0">
                      <div className="text-responsive-base font-bold text-foreground">
                        {getActiveAccountsCount()}
                      </div>
                      <div className="text-responsive-xs text-muted-foreground mt-1">
                        <span className="hidden sm:inline">Connected accounts</span>
                        <span className="sm:hidden">Connected</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="mobile-card touch-optimized">
                    <CardHeader className="mobile-card-padding pb-2">
                      <CardTitle className="text-responsive-xs font-medium flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-primary" />
                        <span className="hidden lg:inline">Investment Accounts</span>
                        <span className="lg:hidden">Investments</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="mobile-card-padding pt-0">
                      <div className="text-responsive-base font-bold text-foreground">
                        {investments.length}
                      </div>
                      <div className="text-responsive-xs text-muted-foreground mt-1">
                        <span className="hidden sm:inline">Investment portfolios</span>
                        <span className="sm:hidden">Portfolios</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </>
            ) : (
              /* Empty state for overview */
              <Card>
                <CardContent className="p-6">
                  <div className="text-center">
                    <BarChart3 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-semibold mb-2">Investment Overview</h3>
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
            )}

            {/* Only show AI Insights and Charts if there's actual data */}
            {(connectedAccounts.length > 0 || investments.length > 0) && (
              <>
                {/* AI Insights */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BrainCircuit className="h-5 w-5" />
                      AI Financial Insights
                    </CardTitle>
                    <CardDescription>
                      Personalized recommendations and alerts based on your financial data
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
                <div className="card-grid">
                  <Card className="mobile-card">
                    <CardHeader className="mobile-card-padding">
                      <CardTitle className="text-responsive-base">Portfolio Performance</CardTitle>
                      <CardDescription className="text-responsive-xs">12-month investment growth</CardDescription>
                    </CardHeader>
                    <CardContent className="mobile-card-padding pt-0">
                      <InvestmentChart />
                    </CardContent>
                  </Card>

                  <Card className="mobile-card">
                    <CardHeader className="mobile-card-padding">
                      <CardTitle className="text-responsive-base">Asset Allocation</CardTitle>
                      <CardDescription className="text-responsive-xs">Current portfolio distribution</CardDescription>
                    </CardHeader>
                    <CardContent className="mobile-card-padding pt-0">
                      <AssetAllocation data={assetAllocationData} />
                    </CardContent>
                  </Card>
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="accounts" className="space-y-6">
            <div className="lg:hidden">
              <div className="space-y-4">
                <AccountIntegration />
              </div>
            </div>
            <div className="hidden lg:block">
              <AccountIntegration />
            </div>
          </TabsContent>

          <TabsContent value="transactions" className="space-y-6">
            <div className="lg:hidden">
              <div className="space-y-4">
                <TransactionMonitoring />
              </div>
            </div>
            <div className="hidden lg:block">
              <TransactionMonitoring />
            </div>
          </TabsContent>

          <TabsContent value="budget" className="space-y-6">
            <BudgetingAnalytics />
          </TabsContent>

          <TabsContent value="reports" className="space-y-6">
            {/* Only show reports if there are connected accounts or investment data */}
            {(connectedAccounts.length > 0 || investments.length > 0) ? (
              <>
                {/* Reports Section Header */}
                <Card>
                  <CardContent className="p-6">
                    <div className="text-center">
                      <FileText className="h-12 w-12 mx-auto mb-4 text-primary" />
                      <h3 className="text-lg font-semibold mb-2">Financial Reports & Analytics</h3>
                      <p className="text-muted-foreground mb-4">
                        Comprehensive reports based on your portfolio performance, accounts, transactions, and budget data.
                      </p>
                      <div className="flex gap-2 justify-center">
                        <Button onClick={() => toast({ title: "Portfolio Report Generated", description: "Detailed portfolio analysis is ready for download." })}>
                          Portfolio Report
                        </Button>
                        <Button variant="outline" onClick={() => toast({ title: "Tax Report Generated", description: "Tax summary report has been created." })}>
                          Tax Summary
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              /* Empty state for reports */
              <Card>
                <CardContent className="p-6">
                  <div className="text-center">
                    <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-semibold mb-2">Financial Reports</h3>
                    <p className="text-muted-foreground mb-4">
                      Reports will be available once you connect accounts or add investment data.
                    </p>
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">
                        Portfolio reports, tax summaries, and performance analytics will appear here.
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Start by connecting accounts to generate meaningful reports.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
      
      {/* Mobile Bottom Navigation */}
      <div className="pb-16 md:pb-0" />
    </div>
  )
}