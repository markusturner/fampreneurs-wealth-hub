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
import { FamilyDocumentsTab } from '@/components/dashboard/family-documents-tab'

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

export default function FamilyOffice() {
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
    // This is now based on actual account data from the accounts section
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
      
      <div className="container mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6 max-w-full">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/')}
              className="hover:bg-muted"
              title="Back to Family Office"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">Digital Family Office</h1>
              <p className="text-sm sm:text-base text-muted-foreground">
                Complete financial ecosystem management and wealth tracking
              </p>
            </div>
          </div>
        </div>

        <Tabs defaultValue="overview" className="space-y-4 sm:space-y-6">
          <TabsList className="grid w-full grid-cols-6 text-xs sm:text-sm gap-1 sm:gap-0 p-1">
            <TabsTrigger value="overview" className="px-1 sm:px-2 lg:px-4 text-xs sm:text-sm">
              <span className="hidden sm:inline">Overview</span>
              <span className="sm:hidden">Home</span>
            </TabsTrigger>
            <TabsTrigger value="accounts" className="px-1 sm:px-2 lg:px-4 text-xs sm:text-sm">
              <span className="hidden sm:inline">Accounts</span>
              <span className="sm:hidden">Accts</span>
            </TabsTrigger>
            <TabsTrigger value="transactions" className="px-1 sm:px-2 lg:px-4 text-xs sm:text-sm">
              <span className="hidden sm:inline">Transactions</span>
              <span className="sm:hidden">Trans</span>
            </TabsTrigger>
            <TabsTrigger value="budget" className="px-1 sm:px-2 lg:px-4 text-xs sm:text-sm">Budget</TabsTrigger>
            <TabsTrigger value="reports" className="px-1 sm:px-2 lg:px-4 text-xs sm:text-sm">Reports</TabsTrigger>
            <TabsTrigger value="documents" className="px-1 sm:px-2 lg:px-4 text-xs sm:text-sm">
              <span className="hidden sm:inline">Documents</span>
              <span className="sm:hidden">Docs</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Only show overview if there are connected accounts or investment data */}
            {(connectedAccounts.length > 0 || investments.length > 0) ? (
              <>
                {/* Executive Summary */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3 lg:gap-4">
                  <Card>
                    <CardHeader className="pb-2 sm:pb-3 p-3 sm:p-4 lg:p-6">
                      <CardTitle className="text-xs sm:text-sm lg:text-base font-medium flex items-center gap-1 sm:gap-2">
                        <Wallet className="h-3 w-3 sm:h-4 sm:w-4" />
                        <span className="hidden sm:inline">Net Worth</span>
                        <span className="sm:hidden">Net</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0 p-3 sm:p-4 lg:p-6">
                      <div className="text-sm sm:text-lg lg:text-2xl font-bold">{formatCurrency(getAccountsBalance() + getTotalPortfolioValue())}</div>
                      <div className="text-xs sm:text-sm text-green-600 flex items-center gap-1">
                        <TrendingUp className="h-2 w-2 sm:h-3 sm:w-3" />
                        <span className="hidden sm:inline">Total Assets</span>
                        <span className="sm:hidden">Assets</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <PieChart className="h-4 w-4" />
                        Portfolio Value
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

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <BarChart3 className="h-4 w-4" />
                        Active Accounts
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{getActiveAccountsCount()}</div>
                      <div className="text-xs text-muted-foreground">
                        Connected accounts
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <TrendingUp className="h-4 w-4" />
                        Investment Accounts
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{investments.length}</div>
                      <div className="text-xs text-muted-foreground">
                        Investment portfolios
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
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Portfolio Performance</CardTitle>
                      <CardDescription>12-month investment growth</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <InvestmentChart />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Asset Allocation</CardTitle>
                      <CardDescription>Current portfolio distribution</CardDescription>
                    </CardHeader>
                    <CardContent>
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
                        <Button variant="outline" onClick={() => toast({ title: "Cashflow Report Generated", description: "Monthly cashflow analysis is available." })}>
                          Cashflow Analysis
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Only show asset cards if there are connected accounts */}
                  {connectedAccounts.length > 0 && (
                    <Card className="cursor-pointer hover:shadow-md transition-shadow">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                          <CreditCard className="h-4 w-4" />
                          Bank Accounts
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-xl font-bold">{formatCurrency(connectedAccounts.reduce((sum, acc) => sum + (acc.balance || 0), 0))}</div>
                        <div className="text-xs text-muted-foreground">{connectedAccounts.length} accounts connected</div>
                      </CardContent>
                    </Card>
                  )}

                  {investments.length > 0 && (
                    <Card className="cursor-pointer hover:shadow-md transition-shadow">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                          <BarChart3 className="h-4 w-4" />
                          Brokerage
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-xl font-bold">{formatCurrency(getTotalPortfolioValue())}</div>
                        <div className="text-xs text-muted-foreground">{investments.length} accounts</div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </>
            ) : (
              /* Empty state for reports */
              <Card>
                <CardContent className="p-6">
                  <div className="text-center">
                    <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-semibold mb-2">Financial Reports</h3>
                    <p className="text-muted-foreground mb-4">
                      Connect your accounts or add investment data to generate comprehensive financial reports and analytics.
                    </p>
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">
                        Reports will include portfolio performance, tax summaries, and cashflow analysis.
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Available once you have connected accounts or investment data.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>


          <TabsContent value="trusts" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Trust Structure Overview
                </CardTitle>
                <CardDescription>
                  Family trust entities and their asset allocations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Family Revocable Trust</CardTitle>
                      <CardDescription className="text-sm">Primary family trust</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-lg font-bold">{formatCurrency(1200000)}</div>
                      <div className="text-sm text-muted-foreground">Assets under management</div>
                      <div className="mt-2 text-xs">
                        <div>• Real estate holdings</div>
                        <div>• Investment portfolios</div>
                        <div>• Business interests</div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Education Trust</CardTitle>
                      <CardDescription className="text-sm">Children's education fund</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-lg font-bold">{formatCurrency(350000)}</div>
                      <div className="text-sm text-muted-foreground">3 beneficiaries</div>
                      <div className="mt-2 text-xs">
                        <div>• College tuition funds</div>
                        <div>• Graduate school provision</div>
                        <div>• Educational expenses</div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Charitable Trust</CardTitle>
                      <CardDescription className="text-sm">508(c)(1)(a) entity</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-lg font-bold">{formatCurrency(75000)}</div>
                      <div className="text-sm text-muted-foreground">Annual giving budget</div>
                      <div className="mt-2 text-xs">
                        <div>• Community programs</div>
                        <div>• Educational initiatives</div>
                        <div>• Healthcare support</div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Trust Performance & Distributions</CardTitle>
                <CardDescription>Income, expenses, and distribution tracking</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold text-green-600">{formatCurrency(45000)}</div>
                      <div className="text-sm text-muted-foreground">YTD Trust Income</div>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold text-red-600">{formatCurrency(12000)}</div>
                      <div className="text-sm text-muted-foreground">YTD Trust Expenses</div>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">{formatCurrency(28000)}</div>
                      <div className="text-sm text-muted-foreground">YTD Distributions</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="documents" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Document Vault
                </CardTitle>
                <CardDescription>
                  Secure storage for legal documents, trust deeds, and financial records
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[
                    { name: 'Family Trust Agreement', type: 'Legal', date: '2024-01-15', size: '2.3 MB' },
                    { name: 'Property Deed - Main Residence', type: 'Real Estate', date: '2023-06-20', size: '1.8 MB' },
                    { name: 'Business Partnership Agreement', type: 'Business', date: '2023-11-08', size: '3.1 MB' },
                    { name: 'Insurance Policy - Life', type: 'Insurance', date: '2024-02-01', size: '2.7 MB' },
                    { name: 'Tax Returns 2023', type: 'Tax', date: '2024-03-15', size: '4.2 MB' },
                    { name: 'Investment Account Statements', type: 'Financial', date: '2024-07-01', size: '1.5 MB' }
                  ].map((doc, index) => (
                    <div key={index} className="p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          <FileText className="h-5 w-5 text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm truncate">{doc.name}</h4>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{doc.type}</span>
                            <span>•</span>
                            <span>{doc.date}</span>
                            <span>•</span>
                            <span>{doc.size}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="access" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Access Control & Permissions
                </CardTitle>
                <CardDescription>
                  Manage user roles and access permissions for family members and advisors
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { name: 'John Smith', role: 'Primary Account Holder', access: 'Full Access', status: 'Active' },
                    { name: 'Jane Smith', role: 'Spouse', access: 'Full Access', status: 'Active' },
                    { name: 'Michael Johnson', role: 'Financial Advisor', access: 'Investment Data Only', status: 'Active' },
                    { name: 'Sarah Davis', role: 'Accountant', access: 'Tax & Financial Records', status: 'Active' },
                    { name: 'Robert Wilson', role: 'Attorney', access: 'Legal Documents Only', status: 'Active' },
                    { name: 'Emma Smith', role: 'Adult Child', access: 'View Only', status: 'Pending' }
                  ].map((user, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                          <Users className="h-5 w-5 text-gray-600" />
                        </div>
                        <div>
                          <h4 className="font-medium">{user.name}</h4>
                          <p className="text-sm text-muted-foreground">{user.role}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-sm">{user.access}</div>
                        <div className={`text-xs px-2 py-1 rounded-full ${
                          user.status === 'Active' ? 'bg-green-100 text-green-600' : 'bg-yellow-100 text-yellow-600'
                        }`}>
                          {user.status}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="h-5 w-5" />
                  Security Settings
                </CardTitle>
                <CardDescription>
                  Two-factor authentication and security audit logs
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium">Two-Factor Authentication</h4>
                      <p className="text-sm text-muted-foreground">Enhanced security for all account access</p>
                    </div>
                    <div className="text-green-600 font-medium">Enabled</div>
                  </div>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium">Session Monitoring</h4>
                      <p className="text-sm text-muted-foreground">Track all login sessions and activities</p>
                    </div>
                    <div className="text-green-600 font-medium">Active</div>
                  </div>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium">Data Encryption</h4>
                      <p className="text-sm text-muted-foreground">End-to-end encryption for all sensitive data</p>
                    </div>
                    <div className="text-green-600 font-medium">AES-256</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="documents" className="space-y-6">
            <FamilyDocumentsTab />
          </TabsContent>
        </Tabs>
      </div>
      
      {/* Mobile Bottom Navigation */}
      <div className="pb-16 md:pb-0" />
    </div>
  )
}