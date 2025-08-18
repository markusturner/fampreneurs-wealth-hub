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
  ArrowLeft,
  Upload,
  Download,
  Hash,
  MapPin,
  Phone,
  Video,
  Heart,
  Scroll,
  Landmark,
  Crown,
  Eye,
  X
} from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
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
      
      <div className="container mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6 max-w-full">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
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

          <TabsContent value="documents" className="space-y-6">
            <DocumentsContent />
          </TabsContent>
        </Tabs>
      </div>
      
      {/* Mobile Bottom Navigation */}
      <div className="pb-16 md:pb-0" />
    </div>
  )
}

// Documents content component (moved from Documents page)
function DocumentsContent() {
  const [uploadingDocument, setUploadingDocument] = useState<string | null>(null)
  const [uploadedDocuments, setUploadedDocuments] = useState<{[key: string]: {url: string, name: string, type: string}}>(() => {
    // Load from localStorage on initialization
    const saved = localStorage.getItem('uploadedDocuments')
    return saved ? JSON.parse(saved) : {}
  })
  const [previewDocument, setPreviewDocument] = useState<{name: string, url: string, type: string} | null>(null)

  const handleUpload = (documentName: string) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.pdf,.doc,.docx,.png,.jpg,.jpeg,.mp4,.mov'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) {
        console.log('File selected for upload:', file.name, 'Type:', file.type)
        setUploadingDocument(documentName)

        // Read file as Data URL (base64) so it persists across navigation/reloads
        const reader = new FileReader()
        reader.onload = () => {
          const url = reader.result as string
          console.log('Created Data URL for file:', url?.slice(0, 64) + '...')
          const documentData = {
            url,
            name: file.name,
            type: file.type || 'application/octet-stream'
          }
          setUploadedDocuments(prev => {
            const updated = {
              ...prev,
              [documentName]: documentData
            }
            console.log('Updated uploaded documents:', updated)
            // Save to localStorage
            localStorage.setItem('uploadedDocuments', JSON.stringify(updated))
            return updated
          })
          setUploadingDocument(null)
          console.log('Upload completed for:', documentName)
        }
        reader.onerror = (err) => {
          console.error('Failed to read file', err)
          setUploadingDocument(null)
        }
        reader.readAsDataURL(file)
      }
    }
    input.click()
  }

  const handleDownload = (documentName: string) => {
    const documentData = uploadedDocuments[documentName]
    if (documentData) {
      const link = document.createElement('a')
      link.href = documentData.url
      link.download = documentData.name
      link.click()
    } else {
      console.log("No file uploaded for:", documentName)
    }
  }

  const handleReplace = (documentName: string) => {
    handleUpload(documentName) // Reuse upload logic to replace
  }

  const handlePreview = (documentName: string) => {
    const documentData = uploadedDocuments[documentName]
    if (documentData) {
      setPreviewDocument({
        name: documentName,
        url: documentData.url,
        type: documentData.type
      })
    }
  }

  const documentCategories = [
    {
      title: "Trust Documents",
      icon: Landmark,
      documents: [
        { name: "Family Trust Document", icon: FileText, type: "file" },
        { name: "Business Trust Document", icon: Building2, type: "file" },
        { name: "Tax-Exempt Trust Document", icon: Shield, type: "file" }
      ]
    },
    {
      title: "Certificates & Legal",
      icon: Shield,
      documents: [
        { name: "Power of Attorney Document", icon: FileText, type: "file" },
        { name: "Trademark Certificate", icon: Crown, type: "file" },
        { name: "Family Constitution", icon: Scroll, type: "file" },
        { name: "Family Crest", icon: Crown, type: "file" }
      ]
    },
    {
      title: "EIN Numbers",
      icon: Hash,
      documents: [
        { name: "Family Trust EIN Number", icon: Hash, type: "text" },
        { name: "Business Trust EIN Number", icon: Hash, type: "text" },
        { name: "Tax-Exempt EIN Number", icon: Hash, type: "text" }
      ]
    },
    {
      title: "Addresses",
      icon: MapPin,
      documents: [
        { name: "Family Trust Address", icon: MapPin, type: "text" },
        { name: "Business Trust Address", icon: MapPin, type: "text" },
        { name: "Tax-Exempt Address", icon: MapPin, type: "text" }
      ]
    },
    {
      title: "Phone Numbers",
      icon: Phone,
      documents: [
        { name: "Family Trust Phone Number", icon: Phone, type: "text" },
        { name: "Business Trust Phone Number", icon: Phone, type: "text" },
        { name: "Tax-Exempt Phone Number", icon: Phone, type: "text" }
      ]
    },
    {
      title: "Legacy Documents",
      icon: Heart,
      documents: [
        { name: "Legacy Video", icon: Video, type: "file" },
        { name: "The Life-Legacy Letter", icon: Heart, type: "file" },
        { name: "Sorry I Died On You Letter", icon: Heart, type: "file" }
      ]
    }
  ]

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold mb-2">Family Documents</h3>
        <p className="text-muted-foreground text-sm mb-6">
          Manage your trust and family documents securely
        </p>
      </div>
      
      <div className="grid gap-4 sm:gap-6">
        {documentCategories.map((category, categoryIndex) => {
          const CategoryIcon = category.icon
          const iconColors = [
            'text-blue-600',      // Trust Documents
            'text-green-600',     // Certificates & Legal  
            'text-purple-600',    // EIN Numbers
            'text-orange-600',    // Addresses
            'text-red-600',       // Phone Numbers
            'text-pink-600'       // Legacy Documents
          ]
          const iconColor = iconColors[categoryIndex] || 'text-primary'
          
          return (
            <Card key={category.title} className="shadow-soft">
              <CardHeader className="pb-3 sm:pb-6">
                <CardTitle className="flex items-center space-x-2 text-base sm:text-lg">
                  <CategoryIcon className={`h-4 w-4 sm:h-5 sm:w-5 ${iconColor}`} />
                  <span>{category.title}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid gap-2 sm:gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {category.documents.map((document) => {
                    const DocumentIcon = document.icon
                    const isUploading = uploadingDocument === document.name
                    const isUploaded = uploadedDocuments[document.name]
                    
                    return (
                      <div
                        key={document.name}
                        className={`flex items-center justify-between p-2 sm:p-3 rounded-lg border transition-colors ${
                          isUploaded 
                            ? 'bg-green-50 border-green-200 hover:bg-green-100' 
                            : 'bg-card hover:bg-accent/50'
                        }`}
                        style={isUploaded ? { color: '#290a52' } : {}}
                      >
                        <div className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0">
                          <DocumentIcon className={`h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0 ${
                            isUploaded ? 'text-green-600' : 'text-muted-foreground'
                          }`} />
                          <div className="min-w-0 flex-1">
                            <span className="text-xs sm:text-sm font-medium truncate block">
                              {document.name}
                            </span>
                            {isUploaded && (
                              <span className="text-xs text-green-600 truncate block">
                                {uploadedDocuments[document.name].name}
                              </span>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-1 sm:space-x-2">
                          {isUploaded ? (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handlePreview(document.name)}
                                className="h-7 px-2 sm:h-8 sm:px-3"
                                style={{ backgroundColor: '#290a52', color: 'white' }}
                                title="Preview"
                              >
                                <Eye className="h-2 w-2 sm:h-3 sm:w-3" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleReplace(document.name)}
                                className="h-7 px-2 sm:h-8 sm:px-3"
                                style={{ backgroundColor: '#290a52', color: 'white', borderColor: '#290a52' }}
                                title="Replace"
                              >
                                <Upload className="h-2 w-2 sm:h-3 sm:w-3" />
                              </Button>
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => handleDownload(document.name)}
                                className="h-7 px-2 sm:h-8 sm:px-3"
                                title="Download"
                              >
                                <Download className="h-2 w-2 sm:h-3 sm:w-3" />
                              </Button>
                            </>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleUpload(document.name)}
                              disabled={isUploading}
                              className="h-7 px-2 sm:h-8 sm:px-3"
                              title="Upload"
                            >
                              {isUploading ? (
                                <div className="h-2 w-2 sm:h-3 sm:w-3 animate-spin rounded-full border border-current border-t-transparent" />
                              ) : (
                                <Upload className="h-2 w-2 sm:h-3 sm:w-3" />
                              )}
                            </Button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Preview Dialog */}
      <Dialog open={!!previewDocument} onOpenChange={() => setPreviewDocument(null)}>
        <DialogContent className="sm:max-w-4xl h-[80vh] flex flex-col" >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              {previewDocument?.name}
            </DialogTitle>
            <DialogDescription>
              Preview of uploaded document: {previewDocument?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-auto min-h-0">
            {previewDocument && (
              <div className="w-full h-full">
                {previewDocument.type.startsWith('image/') ? (
                  <img 
                    src={previewDocument.url} 
                    alt={previewDocument.name}
                    className="max-w-full h-auto mx-auto"
                  />
                ) : previewDocument.type.startsWith('video/') ? (
                  <video 
                    src={previewDocument.url} 
                    controls
                    className="max-w-full h-auto mx-auto"
                  />
                ) : previewDocument.type === 'application/pdf' ? (
                  <embed 
                    src={previewDocument.url} 
                    type="application/pdf"
                    className="w-full h-full min-h-[600px]"
                  />
                ) : (
                  <div className="text-center py-12">
                    <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">
                      Preview not available for this file type. Use the download button to view the file.
                    </p>
                    <Button 
                      onClick={() => handleDownload(previewDocument.name)}
                      className="mt-4"
                    >
                      Download File
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}