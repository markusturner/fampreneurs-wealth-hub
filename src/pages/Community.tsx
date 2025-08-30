import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/integrations/supabase/client'
import localforage from 'localforage'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
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
  X,
  LifeBuoy,
  Building,
  Globe,
  ArrowUpRight,
  ExternalLink,
  Star,
  CheckCircle,
  ArrowRight,
  MessageSquare,
  Send,
  Search,
  UserCheck,
  Clock
} from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
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
  const [familyOfficeMembers, setFamilyOfficeMembers] = useState<any[]>([])
  const [loadingMembers, setLoadingMembers] = useState(true)

  useEffect(() => {
    fetchInvestments()
    fetchFamilyOfficeMembers()
  }, [])

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
        .not('office_role', 'is', null)
        .order('created_at', { ascending: false })

      if (error) throw error
      setFamilyOfficeMembers(data || [])
    } catch (error) {
      console.error('Error fetching family office members:', error)
    } finally {
      setLoadingMembers(false)
    }
  }

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
      
      <div className="container mx-auto px-4 py-6 space-y-6 max-w-7xl">
        <div className="animate-fade-in">
          <h1 className="text-3xl font-bold tracking-tight mb-2">Digital Family Office</h1>
          <p className="text-lg text-muted-foreground">
            Complete financial ecosystem management and wealth tracking
          </p>
        </div>

        <Tabs defaultValue="accounts" className="space-y-6 animate-fade-in">
          {/* Mobile-Optimized Tab Navigation */}
          <div className="w-full">
            {/* Single Row Horizontal Tabs */}
            <TabsList className="flex gap-2 p-2 min-w-max bg-muted rounded-xl overflow-x-auto scrollbar-hide">
              <TabsTrigger 
                value="accounts" 
                className="flex items-center gap-2 py-3 px-4 text-sm font-medium rounded-lg transition-all hover:bg-background data-[state=active]:bg-background data-[state=active]:shadow-md whitespace-nowrap"
              >
                <CreditCard className="h-4 w-4" />
                <span>Accounts</span>
              </TabsTrigger>
              <TabsTrigger 
                value="transactions" 
                className="flex items-center gap-2 py-3 px-4 text-sm font-medium rounded-lg transition-all hover:bg-background data-[state=active]:bg-background data-[state=active]:shadow-md whitespace-nowrap"
              >
                <ArrowUpRight className="h-4 w-4" />
                <span>Transactions</span>
              </TabsTrigger>
              <TabsTrigger 
                value="budget" 
                className="flex items-center gap-2 py-3 px-4 text-sm font-medium rounded-lg transition-all hover:bg-background data-[state=active]:bg-background data-[state=active]:shadow-md whitespace-nowrap"
              >
                <PieChart className="h-4 w-4" />
                <span>Budget</span>
              </TabsTrigger>
              <TabsTrigger 
                value="reports" 
                className="flex items-center gap-2 py-3 px-4 text-sm font-medium rounded-lg transition-all hover:bg-background data-[state=active]:bg-background data-[state=active]:shadow-md whitespace-nowrap"
              >
                <BarChart3 className="h-4 w-4" />
                <span>Reports</span>
              </TabsTrigger>
              <TabsTrigger 
                value="documents" 
                className="flex items-center gap-2 py-3 px-4 text-sm font-medium rounded-lg transition-all hover:bg-background data-[state=active]:bg-background data-[state=active]:shadow-md whitespace-nowrap"
              >
                <FileText className="h-4 w-4" />
                <span>Documents</span>
              </TabsTrigger>
              <TabsTrigger 
                value="messages" 
                className="flex items-center gap-2 py-3 px-4 text-sm font-medium rounded-lg transition-all hover:bg-background data-[state=active]:bg-background data-[state=active]:shadow-md whitespace-nowrap"
              >
                <MessageSquare className="h-4 w-4" />
                <span>Messages</span>
              </TabsTrigger>
              <TabsTrigger 
                value="services" 
                className="flex items-center gap-2 py-3 px-4 text-sm font-medium rounded-lg transition-all hover:bg-background data-[state=active]:bg-background data-[state=active]:shadow-md whitespace-nowrap"
              >
                <Briefcase className="h-4 w-4" />
                <span>Services</span>
              </TabsTrigger>
            </TabsList>
          </div>


          <TabsContent value="accounts" className="space-y-4 sm:space-y-6 animate-fade-in">
            <AccountIntegration />
          </TabsContent>

          <TabsContent value="transactions" className="space-y-4 sm:space-y-6 animate-fade-in">
            <TransactionMonitoring />
          </TabsContent>

          <TabsContent value="budget" className="space-y-4 sm:space-y-6 animate-fade-in">
            <BudgetingAnalytics />
          </TabsContent>

          <TabsContent value="reports" className="space-y-4 sm:space-y-6 animate-fade-in">
            <Card className="hover-scale">
              <CardContent className="p-6 sm:p-8">
                <div className="text-center">
                  <FileText className="h-16 w-16 sm:h-20 sm:w-20 mx-auto mb-6 text-muted-foreground" />
                  <h3 className="text-xl sm:text-2xl font-semibold mb-4">Financial Reports</h3>
                  <p className="text-muted-foreground text-base sm:text-lg max-w-md mx-auto">
                    Comprehensive reports will be available once you connect accounts or add investment data.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="documents" className="space-y-6 animate-fade-in">
            <DocumentsContent />
          </TabsContent>

          <TabsContent value="messages" className="space-y-6 animate-fade-in">
            <MessagesContent familyOfficeMembers={familyOfficeMembers} loadingMembers={loadingMembers} />
          </TabsContent>

          <TabsContent value="services" className="space-y-6 animate-fade-in">
            <ServicesContent />
          </TabsContent>
        </Tabs>
      </div>
      
      {/* Mobile Bottom Navigation Spacing */}
      <div className="pb-20" />
    </div>
  )
}

// Documents content component (moved from Documents page)
function DocumentsContent() {
  const { toast } = useToast()
  const [uploadingDocument, setUploadingDocument] = useState<string | null>(null)
  const [uploadedDocuments, setUploadedDocuments] = useState<{[key: string]: {storageKey: string, name: string, type: string}}>(() => {
    // Load lightweight metadata index from localStorage
    const saved = localStorage.getItem('uploadedDocuments')
    if (!saved) return {}
    try {
      const parsed = JSON.parse(saved)
      const normalized: {[key: string]: {storageKey: string, name: string, type: string}} = {}
      Object.keys(parsed).forEach((k) => {
        const v = parsed[k]
        normalized[k] = {
          storageKey: v.storageKey || '',
          name: v.name,
          type: v.type,
        }
      })
      return normalized
    } catch {
      return {}
    }
  })
  const [previewDocument, setPreviewDocument] = useState<{name: string, url: string, type: string} | null>(null)

  const handleUpload = (documentName: string) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.pdf,.doc,.docx,.png,.jpg,.jpeg,.mp4,.mov'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) {
        setUploadingDocument(documentName)
        try {
          const storageKey = `uploadedDocuments/${documentName}`
          // Store the file blob in IndexedDB via localforage (avoids localStorage quota issues)
          await localforage.setItem(storageKey, file)
          const meta = { storageKey, name: file.name, type: file.type || 'application/octet-stream' }
          setUploadedDocuments(prev => {
            const updated = { ...prev, [documentName]: meta }
            try {
              localStorage.setItem('uploadedDocuments', JSON.stringify(updated))
            } catch (err) {
              console.error('Failed to persist metadata to localStorage', err)
              toast({
                title: 'Storage limit reached',
                description: 'Saved file locally but could not persist metadata. You may need to clear space.',
                variant: 'destructive',
              })
            }
            return updated
          })
        } catch (err) {
          console.error('Failed to save file', err)
          toast({
            title: 'Upload failed',
            description: 'We could not save this file locally. Try a smaller file or contact support.',
            variant: 'destructive',
          })
        } finally {
          setUploadingDocument(null)
        }
      }
    }
    input.click()
  }

  const handleDownload = async (documentName: string) => {
    const meta = uploadedDocuments[documentName]
    if (!meta?.storageKey) {
      toast({ title: 'File unavailable', description: 'Please re-upload this document to download it.' })
      return
    }
    const blob = await localforage.getItem<Blob>(meta.storageKey)
    if (blob) {
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = meta.name
      document.body.appendChild(link)
      link.click()
      link.remove()
      setTimeout(() => URL.revokeObjectURL(url), 0)
    } else {
      toast({ title: 'File not found', description: 'Please re-upload this document.' })
    }
  }

  const handleReplace = (documentName: string) => {
    handleUpload(documentName) // Reuse upload logic to replace
  }

  const handleDelete = async (documentName: string) => {
    const meta = uploadedDocuments[documentName]
    if (meta?.storageKey) {
      try {
        // Remove from IndexedDB
        await localforage.removeItem(meta.storageKey)
        // Remove from state and localStorage
        setUploadedDocuments(prev => {
          const updated = { ...prev }
          delete updated[documentName]
          try {
            localStorage.setItem('uploadedDocuments', JSON.stringify(updated))
          } catch (err) {
            console.error('Failed to update localStorage after delete', err)
          }
          return updated
        })
        toast({
          title: 'Document deleted',
          description: 'The document has been successfully removed.',
        })
      } catch (err) {
        console.error('Failed to delete file', err)
        toast({
          title: 'Delete failed',
          description: 'Could not delete the document. Please try again.',
          variant: 'destructive',
        })
      }
    }
  }

  const handlePreview = async (documentName: string) => {
    const meta = uploadedDocuments[documentName]
    if (!meta?.storageKey) {
      toast({ title: 'Preview unavailable', description: 'Please re-upload this document to preview it.' })
      return
    }
    const blob = await localforage.getItem<Blob>(meta.storageKey)
    if (blob) {
      const url = URL.createObjectURL(blob)
      setPreviewDocument({ name: documentName, url, type: meta.type })
    } else {
      toast({ title: 'File not found', description: 'Please re-upload this document.' })
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
        { name: "Trademark Certificate", icon: Crown, type: "file" }
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
        { name: "Sorry I Died On You Letter", icon: Heart, type: "file" },
        { name: "Family Constitution", icon: Scroll, type: "file" },
        { name: "Family Identity Manual", icon: FileText, type: "file" },
        { name: "Family Crest", icon: Crown, type: "file" },
        { name: "Family Corporate Seal", icon: Shield, type: "file" }
      ]
    }
  ]

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="animate-fade-in">
        <h3 className="text-2xl sm:text-3xl font-bold mb-3">Family Documents</h3>
        <p className="text-muted-foreground text-base sm:text-lg">
          Manage your trust and family documents securely
        </p>
      </div>
      
      <div className="grid gap-6 sm:gap-8">
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
            <Card key={category.title} className="hover-scale animate-fade-in border-2 hover:border-primary/20 transition-all duration-300">
              <CardHeader className="pb-4 sm:pb-6">
                <CardTitle className="flex items-center space-x-3 text-lg sm:text-xl">
                  <CategoryIcon className={`h-6 w-6 sm:h-7 sm:w-7 ${iconColor}`} />
                  <span>{category.title}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid gap-4 sm:gap-6 sm:grid-cols-1 lg:grid-cols-2">
                  {category.documents.map((document) => {
                    const DocumentIcon = document.icon
                    const isUploading = uploadingDocument === document.name
                    const isUploaded = uploadedDocuments[document.name]
                    
                    return (
                      <div
                        key={document.name}
                        className={`flex items-center justify-between p-4 sm:p-5 rounded-xl border-2 transition-all duration-300 hover-scale ${
                          isUploaded 
                            ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200 hover:border-green-300' 
                            : 'bg-card hover:bg-accent/30 border-border hover:border-primary/30'
                        }`}
                      >
                        <div className="flex items-center space-x-4 flex-1 min-w-0">
                          <DocumentIcon className={`h-5 w-5 sm:h-6 sm:w-6 flex-shrink-0 ${
                            isUploaded ? 'text-green-600' : 'text-muted-foreground'
                          }`} />
                          <div className="min-w-0 flex-1">
                            <span className="text-sm sm:text-base font-medium block truncate">
                              {document.name}
                            </span>
                            {isUploaded && (
                              <span className="text-xs sm:text-sm text-green-600 truncate block mt-1">
                                {uploadedDocuments[document.name].name}
                              </span>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2 sm:space-x-3 flex-shrink-0">
                          {isUploaded ? (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handlePreview(document.name)}
                                className="h-9 w-9 sm:h-10 sm:w-10 p-0 rounded-lg hover:bg-primary/10"
                                title="Preview"
                              >
                                <Eye className="h-4 w-4 sm:h-5 sm:w-5" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleReplace(document.name)}
                                className="h-9 w-9 sm:h-10 sm:w-10 p-0 rounded-lg border-2"
                                title="Replace"
                              >
                                <Upload className="h-4 w-4 sm:h-5 sm:w-5" />
                              </Button>
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => handleDownload(document.name)}
                                className="h-9 w-9 sm:h-10 sm:w-10 p-0 rounded-lg"
                                title="Download"
                              >
                                <Download className="h-4 w-4 sm:h-5 sm:w-5" />
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleDelete(document.name)}
                                className="h-9 w-9 sm:h-10 sm:w-10 p-0 rounded-lg"
                                title="Delete"
                              >
                                <X className="h-4 w-4 sm:h-5 sm:w-5" />
                              </Button>
                            </>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleUpload(document.name)}
                              disabled={isUploading}
                              className="h-10 px-4 sm:h-11 sm:px-6 rounded-lg border-2 hover:border-primary/50 font-medium"
                              title="Upload"
                            >
                              {isUploading ? (
                                <div className="h-4 w-4 sm:h-5 sm:w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                              ) : (
                                <>
                                  <Upload className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                                  <span className="hidden sm:inline">Upload</span>
                                </>
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

      {/* Enhanced Preview Dialog */}
      <Dialog open={!!previewDocument} onOpenChange={(open) => { if (!open) { if (previewDocument?.url?.startsWith('blob:')) { URL.revokeObjectURL(previewDocument.url) } setPreviewDocument(null) } }}>
        <DialogContent className="sm:max-w-5xl max-h-[90vh] flex flex-col bg-background border-2 animate-scale-in">
          <DialogHeader className="pb-6">
            <DialogTitle className="flex items-center gap-3 text-xl font-bold">
              <Eye className="h-6 w-6 text-primary" />
              {previewDocument?.name}
            </DialogTitle>
            <DialogDescription className="text-base text-muted-foreground">
              Preview of uploaded document: {previewDocument?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-auto min-h-0 bg-muted/20 border-2 rounded-lg p-4">
            {previewDocument && (
              <div className="w-full h-full">
                {previewDocument.type.startsWith('image/') ? (
                  <img 
                    src={previewDocument.url} 
                    alt={previewDocument.name}
                    className="max-w-full h-auto mx-auto rounded-lg shadow-lg"
                  />
                ) : previewDocument.type.startsWith('video/') ? (
                  <video 
                    src={previewDocument.url} 
                    controls
                    className="max-w-full h-auto mx-auto rounded-lg shadow-lg"
                  />
                ) : previewDocument.type === 'application/pdf' ? (
                  <embed 
                    src={previewDocument.url} 
                    type="application/pdf"
                    className="w-full h-full min-h-[600px] rounded-lg"
                  />
                ) : (
                  <div className="text-center py-20">
                    <FileText className="h-20 w-20 mx-auto mb-6 text-muted-foreground" />
                    <p className="text-lg text-muted-foreground mb-6">
                      Preview not available for this file type. Use the download button to view the file.
                    </p>
                    <Button 
                      onClick={() => handleDownload(previewDocument.name)}
                      className="px-8 py-3 text-base"
                      size="lg"
                    >
                      <Download className="h-5 w-5 mr-2" />
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

// Messages content component for family office members
function MessagesContent({ familyOfficeMembers, loadingMembers }: { familyOfficeMembers: any[], loadingMembers: boolean }) {
  const { user, profile } = useAuth()
  const { toast } = useToast()
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null)
  const [messageInput, setMessageInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [chatMode, setChatMode] = useState<'real' | 'ai'>('real')
  const [showAIMemberSelector, setShowAIMemberSelector] = useState(false)
  const [selectedAIMember, setSelectedAIMember] = useState<string | null>(null)

  // Predefined AI chatbot experts
  const aiChatbotExperts = [
    { id: 'ai-financial-advisor', name: 'Sarah Chen', role: 'Senior Financial Advisor', avatar: 'SC' },
    { id: 'ai-tax-specialist', name: 'Michael Rodriguez', role: 'Tax Planning Specialist', avatar: 'MR' },
    { id: 'ai-estate-planner', name: 'Jennifer Williams', role: 'Estate Planning Attorney', avatar: 'JW' },
    { id: 'ai-investment-manager', name: 'David Thompson', role: 'Portfolio Manager', avatar: 'DT' },
    { id: 'ai-insurance-expert', name: 'Lisa Park', role: 'Insurance Specialist', avatar: 'LP' },
    { id: 'ai-business-consultant', name: 'Robert Johnson', role: 'Business Strategy Consultant', avatar: 'RJ' },
    { id: 'ai-trust-officer', name: 'Amanda Foster', role: 'Trust Officer', avatar: 'AF' },
    { id: 'ai-crypto-advisor', name: 'Alex Kumar', role: 'Digital Assets Specialist', avatar: 'AK' }
  ]

  // Mock conversation data - in real app this would come from database
  const conversations: {[key: string]: Array<{id: string, sender: string, message: string, timestamp: string, isCurrentUser: boolean, isRead?: boolean}> } = {
    '1': [
      { id: '1', sender: 'John Smith', message: 'Hi! I wanted to discuss the quarterly trust review meeting.', timestamp: '2:30 PM', isCurrentUser: false, isRead: false },
      { id: '2', sender: 'You', message: 'Perfect timing. I was just reviewing the documents.', timestamp: '2:32 PM', isCurrentUser: true },
      { id: '3', sender: 'John Smith', message: 'Great! Should we schedule it for next week?', timestamp: '2:35 PM', isCurrentUser: false, isRead: false }
    ],
    '2': [
      { id: '1', sender: 'Sarah Johnson', message: 'Thanks for updating the investment portfolio.', timestamp: 'Yesterday', isCurrentUser: false, isRead: false },
      { id: '2', sender: 'You', message: 'You\'re welcome! The new allocations look good.', timestamp: 'Yesterday', isCurrentUser: true }
    ],
    '3': [
      { id: '1', sender: 'Michael Davis', message: 'I need your signature on the trust amendment.', timestamp: '3 hours ago', isCurrentUser: false, isRead: false }
    ],
    '4': []
  }

  const [conversationMessages, setConversationMessages] = useState(conversations)

  // Convert family office members to the format expected by the component
  const formattedMembers = familyOfficeMembers.map((member, index) => {
    const memberConversations = conversationMessages[member.id] || []
    const lastMessage = memberConversations[memberConversations.length - 1]
    
    // Count unread messages (messages from other users - simplified logic)
    const unreadCount = memberConversations.filter(msg => !msg.isCurrentUser && !msg.isRead).length
    
    return {
      id: member.id,
      name: member.full_name,
      role: member.family_position || 'Family Member',
      avatar: member.full_name?.split(' ').map((n: string) => n[0]).join('').toUpperCase() || 'FM',
      lastSeen: lastMessage ? lastMessage.timestamp : 'No messages',
      status: unreadCount > 0 ? 'online' : 'offline',
      unreadCount: unreadCount,
      lastMessage: lastMessage?.message || 'No messages yet',
      hasUnread: unreadCount > 0
    }
  })

  // Build AI "members" from existing AI conversations
  const aiConversationMembers = aiChatbotExperts
    .filter((e) => (conversationMessages[e.id] || []).length > 0)
    .map((e) => {
      const msgs = conversationMessages[e.id] || []
      const last = msgs[msgs.length - 1]
      const unreadCount = msgs.filter((m) => !m.isCurrentUser && !m.isRead).length
      return {
        id: e.id,
        name: e.name,
        role: e.role,
        avatar: e.avatar,
        lastSeen: last ? last.timestamp : 'No messages',
        status: unreadCount > 0 ? 'online' : 'offline',
        unreadCount,
        lastMessage: last?.message || 'No messages yet',
        hasUnread: unreadCount > 0,
        isAI: true,
      }
    })

  // Combine real members and AI conversations
  const allMembersWithAI = [
    ...formattedMembers.map(m => ({ ...m, isAI: false })),
    ...aiConversationMembers,
  ]

  // Enhanced conversations with sample data for family members
  useEffect(() => {
    if (familyOfficeMembers.length === 0) return
    
    const enhancedConversations = { ...conversations }
    
    // Add sample conversations for the first few members if they don't have any
    if (familyOfficeMembers.length > 0 && !enhancedConversations[familyOfficeMembers[0]?.id]) {
      enhancedConversations[familyOfficeMembers[0]?.id] = [
        { id: `${familyOfficeMembers[0].id}_1`, sender: familyOfficeMembers[0].full_name, message: 'Good morning! I wanted to discuss the quarterly review.', timestamp: '9:15 AM', isCurrentUser: false, isRead: false },
        { id: `${familyOfficeMembers[0].id}_2`, sender: 'You', message: 'Perfect timing. I just reviewed the documents.', timestamp: '9:18 AM', isCurrentUser: true },
        { id: `${familyOfficeMembers[0].id}_3`, sender: familyOfficeMembers[0].full_name, message: 'Great! Should we schedule the meeting for next week?', timestamp: '9:20 AM', isCurrentUser: false, isRead: false }
      ]
    }

    if (familyOfficeMembers.length > 1 && !enhancedConversations[familyOfficeMembers[1]?.id]) {
      enhancedConversations[familyOfficeMembers[1]?.id] = [
        { id: `${familyOfficeMembers[1].id}_1`, sender: familyOfficeMembers[1].full_name, message: 'The investment portfolio updates are ready for your review.', timestamp: 'Yesterday', isCurrentUser: false, isRead: false },
        { id: `${familyOfficeMembers[1].id}_2`, sender: 'You', message: 'Thank you! I\'ll review them this afternoon.', timestamp: 'Yesterday', isCurrentUser: true },
        { id: `${familyOfficeMembers[1].id}_3`, sender: familyOfficeMembers[1].full_name, message: 'Also, we have some new investment opportunities to discuss.', timestamp: '2 hours ago', isCurrentUser: false, isRead: false }
      ]
    }

    setConversationMessages(prev => ({
      ...prev,
      ...enhancedConversations
    }))
  }, [familyOfficeMembers.length])

  const generateExpertGreeting = (expert: any) => {
    const greetings = {
      'ai-financial-advisor': "Hello! I'm Sarah Chen, your Senior Financial Advisor. I specialize in comprehensive wealth management, portfolio optimization, and strategic financial planning. How can I assist you with your financial goals today?",
      'ai-tax-specialist': "Greetings! Michael Rodriguez here, your Tax Planning Specialist. I help families navigate complex tax strategies, optimize tax efficiency, and ensure compliance with all regulations. What tax matters can I help you with?",
      'ai-estate-planner': "Good day! I'm Jennifer Williams, your Estate Planning Attorney. I focus on wealth transfer strategies, trust structures, and legacy planning. How can I help you protect and transfer your family's wealth?",
      'ai-investment-manager': "Hello! David Thompson, Portfolio Manager at your service. I specialize in investment strategy, risk management, and market analysis for high-net-worth families. What investment questions can I help you with?",
      'ai-insurance-expert': "Hi there! Lisa Park, Insurance Specialist. I help families protect their wealth through comprehensive insurance strategies including life, property, and liability coverage. How can I assist with your insurance needs?",
      'ai-business-consultant': "Welcome! Robert Johnson, Business Strategy Consultant. I advise on business operations, succession planning, and strategic growth initiatives. What business challenges can I help you address?",
      'ai-trust-officer': "Hello! Amanda Foster, Trust Officer. I manage trust administration, fiduciary services, and family governance structures. How can I assist you with your trust and family office needs?",
      'ai-crypto-advisor': "Greetings! Alex Kumar, Digital Assets Specialist. I help families navigate cryptocurrency investments, blockchain technology, and digital asset management. What digital asset questions do you have?"
    }
    return greetings[expert.id] || `Hello! I'm ${expert.name}, your ${expert.role}. How can I help you today?`
  }

  const initializeExpertConversation = (expert: any) => {
    // Check if conversation already exists
    if (conversationMessages[expert.id] && conversationMessages[expert.id].length > 0) {
      return // Don't reinitialize if already exists
    }

    const greeting = generateExpertGreeting(expert)
    const initialMessage = {
      id: `${expert.id}_greeting`,
      sender: expert.name,
      message: greeting,
      timestamp: 'now',
      isCurrentUser: false,
      isRead: false
    }
    
    setConversationMessages(prev => ({
      ...prev,
      [expert.id]: [initialMessage]
    }))
  }

  const filteredMembers = allMembersWithAI.filter(member => 
    member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.role.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const sendMessage = async () => {
    if (!messageInput.trim() || !selectedConversation) return
    
    const messageContent = messageInput.trim()
    setMessageInput('')

    const timestamp = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    
    if (chatMode === 'ai') {
      const selectedExpert = aiChatbotExperts.find(e => e.id === selectedConversation)
      if (!selectedExpert) return

      // Add user's message to the thread immediately
      setConversationMessages(prev => ({
        ...prev,
        [selectedConversation]: [
          ...(prev[selectedConversation] || []),
          {
            id: `${selectedConversation}_user_${Date.now()}`,
            sender: 'You',
            message: messageContent,
            timestamp,
            isCurrentUser: true,
          }
        ]
      }))
      
      try {
        toast({ title: 'AI Processing', description: 'AI assistant is analyzing your message...' })
        
        const { data, error } = await supabase.functions.invoke('ai-chat', {
          body: { 
            message: `Acting as ${selectedExpert.name}, a ${selectedExpert.role} in our family office: ${messageContent}`,
            context: `You are ${selectedExpert.name}, a professional ${selectedExpert.role} in a family office. Provide expert advice and assistance based on your role and expertise.` 
          }
        })

        if (error) throw error

        const aiReply = (data as any)?.response || "I'm here to help. Could you share more details?"

        // Append AI response
        setConversationMessages(prev => ({
          ...prev,
          [selectedConversation]: [
            ...(prev[selectedConversation] || []),
            {
              id: `${selectedConversation}_ai_${Date.now()}`,
              sender: selectedExpert.name,
              message: aiReply,
              timestamp: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
              isCurrentUser: false,
              isRead: false
            }
          ]
        }))

        toast({ title: 'AI Response Ready', description: `${selectedExpert.name} (AI) has responded to your message.` })
      } catch (error) {
        console.error('AI chat error:', error)
        toast({ title: 'AI Error', description: 'Sorry, the AI assistant is unavailable. Please try again later.', variant: 'destructive' })
      }
    } else {
      // Real member chat - append user message locally for now
      setConversationMessages(prev => ({
        ...prev,
        [selectedConversation]: [
          ...(prev[selectedConversation] || []),
          {
            id: `${selectedConversation}_user_${Date.now()}`,
            sender: 'You',
            message: messageContent,
            timestamp,
            isCurrentUser: true,
          }
        ]
      }))
      toast({ title: 'Message Sent', description: 'Your message has been sent to the family office member.' })
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-500'
      case 'away': return 'bg-yellow-500'
      case 'offline': return 'bg-gray-400'
      default: return 'bg-gray-400'
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold mb-2 flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Family Office Messages
        </h3>
        <p className="text-muted-foreground text-sm mb-6">
          Secure messaging between family office members and administrators
        </p>
        
        {/* Chat Mode Toggle */}
        <div className="flex items-center gap-4 mb-6 p-4 bg-muted/20 rounded-lg border">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Chat Mode:</span>
          </div>
          <div className="flex gap-2">
            <Button
              variant={chatMode === 'real' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setChatMode('real')}
              className="text-xs"
            >
              <UserCheck className="h-3 w-3 mr-2" />
              Real Member
            </Button>
            <Popover open={showAIMemberSelector} onOpenChange={setShowAIMemberSelector}>
              <PopoverTrigger asChild>
                <Button
                  variant={chatMode === 'ai' ? 'default' : 'outline'}
                  size="sm"
                  className="text-xs"
                >
                  <BrainCircuit className="h-3 w-3 mr-2" />
                  AI Expert
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-0" side="bottom" align="end">
                <div className="p-4 border-b">
                  <h4 className="font-medium text-sm mb-1">Select AI Assistant</h4>
                  <p className="text-xs text-muted-foreground">
                    Choose a family office member for AI simulation
                  </p>
                </div>
                <div className="max-h-60 overflow-y-auto">
                  {aiChatbotExperts.length > 0 ? (
                    aiChatbotExperts.map((expert) => (
                      <div
                        key={expert.id}
                        className="flex items-center p-3 hover:bg-accent cursor-pointer border-b last:border-0"
                        onClick={() => {
                          console.log('Selecting AI expert:', expert.name, expert.id)
                          setSelectedAIMember(expert.id)
                          setChatMode('ai')
                          setSelectedConversation(expert.id)
                          initializeExpertConversation(expert)
                          setShowAIMemberSelector(false)
                          console.log('AI expert selected, conversation should be initialized')
                        }}
                      >
                        <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-medium text-sm mr-3">
                          {expert.avatar}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{expert.name}</p>
                          <p className="text-xs text-muted-foreground">{expert.role}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <BrainCircuit className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">AI</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-center text-muted-foreground">
                      <BrainCircuit className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">AI Experts Available</p>
                      <p className="text-xs">Select an AI specialist to chat with</p>
                    </div>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>

      {loadingMembers ? (
        <div className="grid md:grid-cols-3 gap-6 h-[600px]">
          <div className="md:col-span-3 flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <div className="h-8 w-8 animate-spin rounded-full border border-current border-t-transparent mx-auto mb-4" />
              <p>Loading family office members...</p>
            </div>
          </div>
        </div>
      ) : (chatMode === 'real' && familyOfficeMembers.length === 0) ? (
        <div className="grid md:grid-cols-3 gap-6 h-[600px]">
          <div className="md:col-span-3 flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">No Family Office Members</p>
              <p className="text-sm">Add family office members to enable messaging functionality.</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid md:grid-cols-3 gap-6 h-[600px]">
          {/* Members List */}
          <div className="md:col-span-1 border rounded-lg">
            <div className="p-4 border-b">
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search members..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                  disabled={allMembersWithAI.length === 0}
                />
              </div>
            </div>
            
            <div className="overflow-y-auto max-h-[520px]">
              {filteredMembers.length > 0 ? (
                filteredMembers.map((member) => (
                   <div
                     key={member.id}
                     className={`p-4 border-b cursor-pointer transition-colors hover:bg-accent/50 ${
                       selectedConversation === member.id ? 'bg-accent' : ''
                     } ${member.hasUnread ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''}`}
                     onClick={() => {
                       // Mark messages as read by updating their isCurrentUser status
                       if (conversationMessages[member.id]) {
                         setConversationMessages(prev => ({
                           ...prev,
                           [member.id]: prev[member.id]?.map(msg => 
                             msg.isCurrentUser ? msg : { ...msg, isRead: true }
                           )
                         }))
                       }
                       
                       if ((member as any).isAI) {
                         const expert = aiChatbotExperts.find(e => e.id === member.id)
                         setChatMode('ai')
                         setSelectedAIMember(member.id)
                         setSelectedConversation(member.id)
                         if (expert) initializeExpertConversation(expert)
                       } else {
                         setChatMode('real')
                         setSelectedConversation(member.id)
                       }
                     }}
                   >
                     <div className="flex items-center space-x-3">
                       <div className="relative">
                         <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-medium">
                           {member.avatar}
                         </div>
                         <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-background ${getStatusColor(member.status)}`} />
                       </div>
                       <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <p className={`text-sm font-medium truncate ${member.hasUnread ? 'font-bold' : ''}`} style={{ color: !member.hasUnread ? '#290a52' : undefined }}>
                              {member.name}
                            </p>
                           {member.unreadCount > 0 && (
                             <Badge variant="secondary" className="text-xs bg-primary text-primary-foreground">
                               {member.unreadCount}
                             </Badge>
                           )}
                         </div>
                         <p className="text-xs text-muted-foreground truncate mb-1">{member.role}</p>
                          <p className={`text-xs truncate ${member.hasUnread ? 'font-medium text-foreground' : 'text-muted-foreground'}`} style={{ color: !member.hasUnread ? '#290a52' : undefined }}>
                            {member.lastMessage}
                          </p>
                         <p className="text-xs text-muted-foreground">{member.lastSeen}</p>
                       </div>
                     </div>
                  </div>
                ))
              ) : (
                <div className="p-4 text-center text-muted-foreground">
                  <p className="text-sm">No members found</p>
                </div>
              )}
            </div>
          </div>

        {/* Chat Area */}
        <div className="md:col-span-2 border rounded-lg flex flex-col">
          {selectedConversation ? (
            <>
               {/* Chat Header */}
               <div className="p-4 border-b flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="relative">
                      <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-medium text-sm">
                        {chatMode === 'ai' && selectedAIMember 
                          ? aiChatbotExperts.find(e => e.id === selectedConversation)?.avatar
                          : formattedMembers.find(m => m.id === selectedConversation)?.avatar}
                      </div>
                      <div className={`absolute -bottom-0 -right-0 w-2 h-2 rounded-full border border-background ${
                        chatMode === 'ai' ? 'bg-green-500' : 
                        getStatusColor(formattedMembers.find(m => m.id === selectedConversation)?.status || 'offline')
                      }`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">
                          {chatMode === 'ai' && selectedAIMember 
                            ? aiChatbotExperts.find(e => e.id === selectedConversation)?.name
                            : formattedMembers.find(m => m.id === selectedConversation)?.name}
                        </p>
                        {chatMode === 'ai' && (
                          <Badge variant="secondary" className="text-xs">
                            <BrainCircuit className="h-3 w-3 mr-1" />
                            AI Expert
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {chatMode === 'ai' && selectedAIMember
                          ? aiChatbotExperts.find(e => e.id === selectedConversation)?.role
                          : formattedMembers.find(m => m.id === selectedConversation)?.role
                        }
                      </p>
                    </div>
                  </div>
                 
                 {chatMode === 'ai' && (
                   <div className="flex items-center gap-2 text-xs text-muted-foreground">
                     <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                     <span>AI Mode</span>
                   </div>
                 )}
               </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {(() => {
                  const messages = conversationMessages[selectedConversation] || []
                  console.log('Displaying messages for conversation:', selectedConversation, 'Messages:', messages)
                  return messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.isCurrentUser ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[70%] p-3 rounded-lg ${
                          message.isCurrentUser
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        }`}
                      >
                        <p className="text-sm">{message.message}</p>
                        <p className={`text-xs mt-1 ${
                          message.isCurrentUser ? 'text-primary-foreground/70' : 'text-muted-foreground'
                        }`}>
                          {message.timestamp}
                        </p>
                      </div>
                    </div>
                  ))
                })()}
                
                {(!conversationMessages[selectedConversation] || conversationMessages[selectedConversation]?.length === 0) && (
                  <div className="text-center text-muted-foreground py-12">
                    <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No messages yet. Start the conversation!</p>
                  </div>
                )}
              </div>

              {/* Message Input */}
              <div className="p-4 border-t">
                <div className="flex space-x-2">
                  <Textarea
                    placeholder={
                      chatMode === 'ai' 
                        ? `Ask ${aiChatbotExperts.find(e => e.id === selectedConversation)?.name || 'the AI expert'}...`
                        : "Type your message..."
                    }
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        sendMessage()
                      }
                    }}
                    className="flex-1 min-h-[60px] resize-none"
                  />
                  <Button 
                    onClick={sendMessage}
                    disabled={!messageInput.trim()}
                    className="self-end"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
                {chatMode === 'ai' && (
                  <div className="mt-2 text-xs text-muted-foreground flex items-center gap-1">
                    <BrainCircuit className="h-3 w-3" />
                    <span>AI expert will provide professional guidance based on their expertise</span>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium mb-2">Select a conversation</p>
                <p className="text-sm">Choose a family office member to start messaging</p>
              </div>
            </div>
          )}
        </div>
        </div>
      )}

      {/* Security Notice */}
      <Card className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-start space-x-3">
            <Lock className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-900 mb-1">Secure Communications</h4>
              <p className="text-sm text-blue-800">
                All messages are encrypted end-to-end and only visible to authorized family office members and administrators.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Services content component
function ServicesContent() {
  const { user } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()
  const [familyOfficeMembers, setFamilyOfficeMembers] = useState<any[]>([])
  const [loadingMembers, setLoadingMembers] = useState(true)
  const [roleServicesMap, setRoleServicesMap] = useState<Record<string, string[]>>({})

  useEffect(() => {
    if (user?.id) {
      fetchFamilyOfficeMembers()
    }
  }, [user?.id])

  // Real-time subscriptions for family members and office roles changes
  useEffect(() => {
    if (!user?.id) return

    const familyMembersChannel = supabase
      .channel('family-members-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'family_members',
          filter: `added_by=eq.${user.id}`
        },
        () => {
          fetchFamilyOfficeMembers()
        }
      )
      .subscribe()

    const officeRolesChannel = supabase
      .channel('office-roles-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'office_roles_catalog',
          filter: `created_by=eq.${user.id}`
        },
        () => {
          fetchFamilyOfficeMembers()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(familyMembersChannel)
      supabase.removeChannel(officeRolesChannel)
    }
  }, [user?.id])

  const fetchFamilyOfficeMembers = async () => {
    if (!user?.id) {
      setLoadingMembers(false)
      return
    }
    
    setLoadingMembers(true)
    try {
      const { data, error } = await supabase
        .from('family_members')
        .select('*')
        .eq('added_by', user.id)
        .eq('status', 'active')
        .not('office_role', 'is', null)
        .order('created_at', { ascending: false })

      if (error) throw error
      setFamilyOfficeMembers(data || [])

      // Load role services mapping for fallback when member has role but no explicit services
      const { data: roles, error: rolesError } = await supabase
        .from('office_roles_catalog')
        .select('name, services')
        .eq('created_by', user.id)

      if (!rolesError && roles) {
        const map: Record<string, string[]> = {}
        roles.forEach((r: any) => {
          map[r.name] = Array.isArray(r.services) ? r.services : []
        })
        setRoleServicesMap(map)
      }
    } catch (error) {
      console.error('Error fetching family office members:', error)
    } finally {
      setLoadingMembers(false)
    }
  }

  // Function to check if a family office member exists for a specific service
  const findMemberForService = (serviceName: string) => {
    return familyOfficeMembers.find(member => {
      const services = Array.isArray(member.office_services) ? member.office_services : []
      return services.includes(serviceName)
    })
  }

  const handleServiceClick = (serviceName: string) => {
    const member = findMemberForService(serviceName)
    
    if (member) {
      // Create a message and navigate to messages tab
      const message = `Hi ${member.full_name}, I would like to request the "${serviceName}" service. Please let me know how we can proceed. Thank you!`
      
      // Store the message data temporarily
      sessionStorage.setItem('pendingMessage', JSON.stringify({
        memberId: member.id,
        memberName: member.full_name,
        serviceName: serviceName,
        message: message
      }))
      
      // Navigate to messages tab
      const url = new URL(window.location.href)
      url.searchParams.set('tab', 'messages')
      url.searchParams.set('member', member.id)
      window.history.pushState({}, '', url.toString())
      
      // Trigger tab change
      const tabElement = document.querySelector('[data-value="messages"]') as HTMLElement
      if (tabElement) {
        tabElement.click()
      }
      
      toast({
        title: "Redirected to Messages",
        description: `Opening conversation with ${member.full_name} for ${serviceName} service.`,
      })
    }
  }

  // Create dynamic service categories based on family office members' specialties
  const createDynamicServiceCategories = () => {
    const allServices = new Set<string>()
    
    // Collect all unique services from family office members
    familyOfficeMembers.forEach(member => {
      const explicit = Array.isArray(member.office_services) ? member.office_services : []
      explicit.forEach(service => allServices.add(service))
    })


    // Service to icon mapping
    const serviceIconMap: { [key: string]: any } = {
      'Investment Management': TrendingUp,
      'Tax Planning': Target,
      'Estate Planning': Scroll,
      'Legal Advisory': Building,
      'Family Governance': Crown,
      'Wealth Planning': DollarSign,
      'Risk Management': Shield,
      'Philanthropy Advisory': Heart,
      'Business Advisory': Briefcase,
      'Accounting Services': BarChart3,
      'Trust Administration': Landmark,
      'Family Education': Users,
      'Succession Planning': ArrowUpRight,
      'Insurance Planning': LifeBuoy,
      'Banking Services': CreditCard
    }

    // Service to description mapping  
    const serviceDescriptionMap: { [key: string]: string } = {
      'Investment Management': 'Professional portfolio management and investment strategies',
      'Tax Planning': 'Strategic tax planning and optimization services',
      'Estate Planning': 'Comprehensive estate planning and trust services',
      'Legal Advisory': 'Legal counsel and advisory services',
      'Family Governance': 'Family governance structure and decision-making processes',
      'Wealth Planning': 'Comprehensive wealth management and financial planning',
      'Risk Management': 'Risk assessment and mitigation strategies',
      'Philanthropy Advisory': 'Charitable giving and philanthropic planning',
      'Business Advisory': 'Business strategy and operational guidance',
      'Accounting Services': 'Financial reporting and accounting services',
      'Trust Administration': 'Trust management and administration services',
      'Family Education': 'Family financial education and literacy programs',
      'Succession Planning': 'Business and wealth succession strategies',
      'Insurance Planning': 'Insurance coverage analysis and planning',
      'Banking Services': 'Private banking and financial services'
    }

    // Group services by category
    const categoryMapping: { [key: string]: string[] } = {
      'Financial Services': ['Investment Management', 'Wealth Planning', 'Banking Services'],
      'Legal & Tax Services': ['Legal Advisory', 'Tax Planning', 'Estate Planning', 'Trust Administration'],
      'Risk & Insurance': ['Risk Management', 'Insurance Planning'],
      'Business Services': ['Business Advisory', 'Accounting Services', 'Succession Planning'],
      'Family Services': ['Family Governance', 'Family Education', 'Philanthropy Advisory']
    }

    const dynamicCategories = []

    // Create categories based on available services
    for (const [categoryName, categoryServices] of Object.entries(categoryMapping)) {
      const availableServices = categoryServices.filter(service => allServices.has(service))
      
      if (availableServices.length > 0) {
        const categoryIcon = categoryName === 'Financial Services' ? DollarSign :
                           categoryName === 'Legal & Tax Services' ? Building2 :
                           categoryName === 'Risk & Insurance' ? Shield :
                           categoryName === 'Business Services' ? Briefcase :
                           categoryName === 'Family Services' ? Crown : Users

        const categoryColor = categoryName === 'Financial Services' ? 'text-green-600' :
                             categoryName === 'Legal & Tax Services' ? 'text-blue-600' :
                             categoryName === 'Risk & Insurance' ? 'text-red-600' :
                             categoryName === 'Business Services' ? 'text-purple-600' :
                             categoryName === 'Family Services' ? 'text-orange-600' : 'text-gray-600'

        dynamicCategories.push({
          title: categoryName,
          icon: categoryIcon,
          color: categoryColor,
          services: availableServices.map(service => ({
            name: service,
            icon: serviceIconMap[service] || FileText,
            description: serviceDescriptionMap[service] || `Professional ${service.toLowerCase()} services`
          }))
        })
      }
    }

    // Add any uncategorized services
    const categorizedServices = new Set(Object.values(categoryMapping).flat())
    const uncategorizedServices = Array.from(allServices).filter(service => !categorizedServices.has(service))
    
    if (uncategorizedServices.length > 0) {
      dynamicCategories.push({
        title: 'Other Services',
        icon: Star,
        color: 'text-pink-600',
        services: uncategorizedServices.map(service => ({
          name: service,
          icon: serviceIconMap[service] || FileText,
          description: `Professional ${service.toLowerCase()} services`
        }))
      })
    }

    return dynamicCategories
  }

  const serviceCategories = createDynamicServiceCategories()

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in">
      <div>
        <h3 className="text-2xl sm:text-3xl font-bold mb-3">Family Office Services</h3>
        <p className="text-muted-foreground text-base sm:text-lg">
          Comprehensive services to support your family's financial and personal needs
        </p>
      </div>
      
      {loadingMembers ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-pulse text-muted-foreground">Loading services...</div>
        </div>
      ) : serviceCategories.length === 0 ? (
        <Card className="p-8 text-center">
          <CardContent>
            <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No Services Available</h3>
            <p className="text-muted-foreground mb-4">
              Add family office members with services in the Members tab to see available services here.
            </p>
            <Button 
              onClick={() => {
                const url = new URL(window.location.href)
                url.searchParams.set('tab', 'members')
                window.history.pushState({}, '', url.toString())
                const tabElement = document.querySelector('[data-value="members"]') as HTMLElement
                if (tabElement) tabElement.click()
              }}
              variant="outline"
            >
              Go to Members
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 sm:gap-8">{serviceCategories.map((category, categoryIndex) => {
          const CategoryIcon = category.icon
          
          return (
            <Card key={category.title} className="hover-scale border-2 hover:border-primary/20 transition-all duration-300 animate-fade-in">
              <CardHeader className="pb-4 sm:pb-6">
                <CardTitle className="flex items-center space-x-3 text-lg sm:text-xl">
                  <CategoryIcon className={`h-6 w-6 sm:h-7 sm:w-7 ${category.color}`} />
                  <span>{category.title}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid gap-4 sm:gap-6 sm:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
                  {category.services.map((service) => {
                    const ServiceIcon = service.icon
                    const member = findMemberForService(service.name)
                    const isAvailable = !!member && !loadingMembers
                    
                    return (
                      <div
                        key={service.name}
                        className={`group p-5 sm:p-6 rounded-xl border-2 transition-all duration-300 hover-scale ${
                          isAvailable 
                            ? 'hover:border-primary cursor-pointer hover:shadow-lg bg-gradient-to-br from-background to-muted/20' 
                            : 'opacity-60 cursor-not-allowed border-muted bg-muted/10'
                        }`}
                        onClick={() => isAvailable && handleServiceClick(service.name)}
                      >
                        <div className="flex items-start space-x-4">
                          <div className="flex-shrink-0">
                            <div className={`p-3 rounded-full ${isAvailable ? 'bg-primary/10' : 'bg-muted'} transition-all duration-300`}>
                              <ServiceIcon className={`h-6 w-6 sm:h-7 sm:w-7 ${category.color} ${
                                isAvailable ? 'group-hover:scale-110' : ''
                              } transition-transform duration-300`} />
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-base sm:text-lg mb-2 group-hover:text-primary transition-colors duration-300">
                              {service.name}
                            </h4>
                            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed mb-3">
                              {service.description}
                            </p>
                            {member && (
                              <div className="flex items-center gap-2 mb-3">
                                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                <p className="text-xs sm:text-sm text-green-600 font-medium">
                                  Available via {member.full_name}
                                </p>
                              </div>
                            )}
                            <div className={`flex items-center text-sm font-medium ${category.color} ${
                              isAvailable ? 'opacity-0 group-hover:opacity-100' : 'opacity-60'
                            } transition-all duration-300`}>
                              {isAvailable ? (
                                <>
                                  <span>Request Service</span>
                                  <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform duration-300" />
                                </>
                              ) : (
                                <>
                                  <span className="text-muted-foreground">Coming Soon</span>
                                  <Clock className="h-4 w-4 ml-2 text-muted-foreground" />
                                </>
                              )}
                            </div>
                          </div>
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
      )}

      {/* Enhanced Premium Services Notice */}
      <Card className="bg-gradient-to-r from-primary/10 via-primary/5 to-secondary/10 border-2 border-primary/20 hover-scale">
        <CardContent className="p-6 sm:p-8">
          <div className="flex items-start space-x-4 sm:space-x-6">
            <div className="flex-shrink-0">
              <div className="p-4 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-full">
                <Star className="h-8 w-8 sm:h-10 sm:w-10 text-primary" />
              </div>
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-xl sm:text-2xl mb-3">Premium Service Guarantee</h3>
              <p className="text-base sm:text-lg text-muted-foreground leading-relaxed mb-6">
                All services are provided by vetted professionals with extensive experience in high-net-worth family office management. 
                We guarantee white-glove service and complete confidentiality.
              </p>
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 text-base">
                <div className="flex items-center space-x-3">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="font-medium">24/7 Support Available</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Shield className="h-5 w-5 text-blue-600" />
                  <span className="font-medium">Fully Confidential</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Enhanced Family Office Members Status */}
      {!loadingMembers && (
        <Card className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 border-2 border-blue-200/50 hover-scale">
          <CardContent className="p-6 sm:p-8">
            <div className="flex items-start space-x-4">
              <div className="p-3 bg-blue-100 rounded-full">
                <UserCheck className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h4 className="font-semibold text-blue-900 mb-2 text-lg sm:text-xl">Family Office Team</h4>
                <p className="text-base text-blue-800 leading-relaxed">
                  {familyOfficeMembers.length > 0 
                    ? `${familyOfficeMembers.length} family office member(s) available to assist with services. Services without available members will show "Coming Soon".`
                    : 'No family office members added yet. Add family members to enable service requests.'
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}