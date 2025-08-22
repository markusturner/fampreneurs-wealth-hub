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
  Crown
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

export default function FamilyOffice() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [investments, setInvestments] = useState<Investment[]>([])
  const [loading, setLoading] = useState(true)
  const [familyOfficeMembers, setFamilyOfficeMembers] = useState<any[]>([])
  const [loadingMembers, setLoadingMembers] = useState(true)

  useEffect(() => {
    fetchInvestments()
    fetchFamilyOfficeMembers()
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

  const fetchFamilyOfficeMembers = async () => {
    if (!user?.id) {
      setLoadingMembers(false)
      return
    }
    
    try {
      const { data, error } = await supabase
        .from('family_members')
        .select('*')
        .eq('added_by', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })

      if (error) throw error
      setFamilyOfficeMembers(data || [])
    } catch (error) {
      console.error('Error fetching family office members:', error)
    } finally {
      setLoadingMembers(false)
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
          <div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">Digital Family Office</h1>
              <p className="text-sm sm:text-base text-muted-foreground">
                Complete financial ecosystem management and wealth tracking
              </p>
            </div>
          </div>
        </div>

        <Tabs defaultValue="accounts" className="space-y-4 sm:space-y-6">
          <TabsList className="grid w-full grid-cols-7 text-xs sm:text-sm gap-1 sm:gap-0 p-1">
            <TabsTrigger value="accounts" className="px-1 sm:px-2 lg:px-4 text-xs sm:text-sm">
              Accounts
            </TabsTrigger>
            <TabsTrigger value="transactions" className="px-1 sm:px-2 lg:px-4 text-xs sm:text-sm">
              Transactions
            </TabsTrigger>
            <TabsTrigger value="budget" className="px-1 sm:px-2 lg:px-4 text-xs sm:text-sm">
              Budget
            </TabsTrigger>
            <TabsTrigger value="reports" className="px-1 sm:px-2 lg:px-4 text-xs sm:text-sm">
              Reports
            </TabsTrigger>
            <TabsTrigger value="documents" className="px-1 sm:px-2 lg:px-4 text-xs sm:text-sm">
              Documents
            </TabsTrigger>
            <TabsTrigger value="messages" className="px-1 sm:px-2 lg:px-4 text-xs sm:text-sm">
              Messages
            </TabsTrigger>
            <TabsTrigger value="services" className="px-1 sm:px-2 lg:px-4 text-xs sm:text-sm">
              Services
            </TabsTrigger>
          </TabsList>

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
            <Card>
              <CardContent className="p-6">
                <div className="text-center">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">Financial Reports</h3>
                  <p className="text-muted-foreground mb-4">
                    Reports will be available once you connect accounts or add investment data.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="documents" className="space-y-6">
            <DocumentsContent />
          </TabsContent>

          <TabsContent value="messages" className="space-y-6">
            <MessagesContent familyOfficeMembers={familyOfficeMembers} loadingMembers={loadingMembers} />
          </TabsContent>

          <TabsContent value="services" className="space-y-6">
            <ServicesContent />
          </TabsContent>
        </Tabs>
      </div>
      
    </div>
  )
}

// Documents content component (moved from Documents page)
function DocumentsContent() {
  const [uploadingDocument, setUploadingDocument] = useState<string | null>(null)

  const handleUpload = (documentName: string) => {
    setUploadingDocument(documentName)
    // TODO: Implement actual upload logic
    setTimeout(() => {
      setUploadingDocument(null)
    }, 2000)
  }

  const handleDownload = (documentName: string) => {
    // TODO: Implement actual download logic
    console.log("Downloading:", documentName)
  }

  const documentCategories = [
    {
      title: "Trust Documents",
      icon: Landmark,
      documents: [
        { name: "Family Trust Document", icon: FileText, type: "file" },
        { name: "Business Trust Document", icon: Building2, type: "file" },
        { name: "Tax-Exempt Trust Document", icon: Shield, type: "file" },
        { name: "Power of Attorney Document", icon: FileText, type: "file" }
      ]
    },
    {
      title: "Certificates & Legal",
      icon: Shield,
      documents: [
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
        {documentCategories.map((category) => {
          const CategoryIcon = category.icon
          
          return (
            <Card key={category.title} className="shadow-soft">
              <CardHeader className="pb-3 sm:pb-6">
                <CardTitle className="flex items-center space-x-2 text-base sm:text-lg">
                  <CategoryIcon className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                  <span>{category.title}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid gap-2 sm:gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {category.documents.map((document) => {
                    const DocumentIcon = document.icon
                    const isUploading = uploadingDocument === document.name
                    
                    return (
                      <div
                        key={document.name}
                        className="flex items-center justify-between p-2 sm:p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0">
                          <DocumentIcon className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
                          <span className="text-xs sm:text-sm font-medium truncate">
                            {document.name}
                          </span>
                        </div>
                        
                        <div className="flex items-center space-x-1 sm:space-x-2">
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
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDownload(document.name)}
                            className="h-7 px-2 sm:h-8 sm:px-3"
                            title="Download"
                          >
                            <Download className="h-2 w-2 sm:h-3 sm:w-3" />
                          </Button>
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
    </div>
  )
}

// Messages content component
function MessagesContent({ familyOfficeMembers, loadingMembers }: { familyOfficeMembers: any[], loadingMembers: boolean }) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="text-center">
          <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">Family Messages</h3>
          <p className="text-muted-foreground mb-4">
            Communication hub for family office members
          </p>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Message board and notifications will appear here
            </p>
            <p className="text-sm text-muted-foreground">
              {loadingMembers ? 'Loading members...' : `${familyOfficeMembers.length} family members`}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Services content component
function ServicesContent() {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="text-center">
          <Briefcase className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">Family Office Services</h3>
          <p className="text-muted-foreground mb-4">
            Professional services and support for your family office
          </p>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Investment advisory, tax planning, and legal services
            </p>
            <p className="text-sm text-muted-foreground">
              Connect with certified professionals
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}