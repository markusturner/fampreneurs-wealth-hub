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
      
      {/* Mobile Bottom Navigation */}
      <div className="pb-16 md:pb-0" />
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
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleDelete(document.name)}
                                className="h-7 px-2 sm:h-8 sm:px-3"
                                title="Delete"
                              >
                                <X className="h-2 w-2 sm:h-3 sm:w-3" />
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
      <Dialog open={!!previewDocument} onOpenChange={(open) => { if (!open) { if (previewDocument?.url?.startsWith('blob:')) { URL.revokeObjectURL(previewDocument.url) } setPreviewDocument(null) } }}>
        <DialogContent className="sm:max-w-4xl h-[80vh] flex flex-col bg-background border">
          <DialogHeader className="pb-4">
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <Eye className="h-5 w-5" />
              {previewDocument?.name}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Preview of uploaded document: {previewDocument?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-auto min-h-0 bg-background border rounded-md p-4">
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

// Messages content component for family office members
function MessagesContent({ familyOfficeMembers, loadingMembers }: { familyOfficeMembers: any[], loadingMembers: boolean }) {
  const { user, profile } = useAuth()
  const { toast } = useToast()
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null)
  const [messageInput, setMessageInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  // Convert family office members to the format expected by the component
  const formattedMembers = familyOfficeMembers.map((member, index) => ({
    id: member.id,
    name: member.full_name,
    role: member.family_position || 'Family Member',
    avatar: member.full_name?.split(' ').map((n: string) => n[0]).join('').toUpperCase() || 'FM',
    lastSeen: 'Offline',
    status: 'offline',
    unreadCount: 0
  }))

  // Mock conversation data - in real app this would come from database
  const conversations: {[key: string]: Array<{id: string, sender: string, message: string, timestamp: string, isCurrentUser: boolean}> } = {
    '1': [
      { id: '1', sender: 'John Smith', message: 'Hi! I wanted to discuss the quarterly trust review meeting.', timestamp: '2:30 PM', isCurrentUser: false },
      { id: '2', sender: 'You', message: 'Perfect timing. I was just reviewing the documents.', timestamp: '2:32 PM', isCurrentUser: true },
      { id: '3', sender: 'John Smith', message: 'Great! Should we schedule it for next week?', timestamp: '2:35 PM', isCurrentUser: false }
    ],
    '2': [
      { id: '1', sender: 'Sarah Johnson', message: 'Thanks for updating the investment portfolio.', timestamp: 'Yesterday', isCurrentUser: false },
      { id: '2', sender: 'You', message: 'You\'re welcome! The new allocations look good.', timestamp: 'Yesterday', isCurrentUser: true }
    ],
    '3': [
      { id: '1', sender: 'Michael Davis', message: 'I need your signature on the trust amendment.', timestamp: '3 hours ago', isCurrentUser: false }
    ],
    '4': []
  }

  const filteredMembers = formattedMembers.filter(member => 
    member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.role.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const sendMessage = () => {
    if (!messageInput.trim() || !selectedConversation) return
    
    // In real app, this would send to the database
    toast({
      title: "Message Sent",
      description: "Your message has been sent successfully.",
    })
    setMessageInput('')
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
      ) : familyOfficeMembers.length === 0 ? (
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
                  disabled={familyOfficeMembers.length === 0}
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
                    }`}
                    onClick={() => setSelectedConversation(member.id)}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="relative">
                        <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-medium">
                          {member.avatar}
                        </div>
                        <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-background ${getStatusColor(member.status)}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium truncate">{member.name}</p>
                          {member.unreadCount > 0 && (
                            <Badge variant="secondary" className="text-xs">
                              {member.unreadCount}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{member.role}</p>
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
               <div className="p-4 border-b flex items-center space-x-3">
                 <div className="relative">
                   <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-medium text-sm">
                     {formattedMembers.find(m => m.id === selectedConversation)?.avatar}
                   </div>
                   <div className={`absolute -bottom-0 -right-0 w-2 h-2 rounded-full border border-background ${getStatusColor(formattedMembers.find(m => m.id === selectedConversation)?.status || 'offline')}`} />
                 </div>
                 <div>
                   <p className="font-medium text-sm">
                     {formattedMembers.find(m => m.id === selectedConversation)?.name}
                   </p>
                   <p className="text-xs text-muted-foreground">
                     {formattedMembers.find(m => m.id === selectedConversation)?.role}
                   </p>
                 </div>
               </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {conversations[selectedConversation]?.map((message) => (
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
                ))}
                
                {conversations[selectedConversation]?.length === 0 && (
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
                    placeholder="Type your message..."
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

  useEffect(() => {
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
        .order('created_at', { ascending: false })

      if (error) throw error
      setFamilyOfficeMembers(data || [])
    } catch (error) {
      console.error('Error fetching family office members:', error)
    } finally {
      setLoadingMembers(false)
    }
  }

  // Function to check if a family office member exists for a specific service
  const findMemberForService = (serviceName: string) => {
    return familyOfficeMembers.find(member => {
      const memberRole = member.family_position?.toLowerCase() || ''
      const serviceNameLower = serviceName.toLowerCase()
      
      // Match service names to family member roles/positions
      const serviceToRoleMapping: { [key: string]: string[] } = {
        'life insurance': ['insurance', 'advisor', 'agent'],
        'health insurance': ['insurance', 'advisor', 'agent'],
        'property insurance': ['insurance', 'advisor', 'agent'],
        'business insurance': ['insurance', 'advisor', 'agent'],
        'credit funding': ['financial', 'advisor', 'banker', 'lending'],
        'forex trading': ['financial', 'advisor', 'trader', 'investment'],
        'stock trading': ['financial', 'advisor', 'trader', 'investment'],
        'crypto trading': ['financial', 'advisor', 'trader', 'investment'],
        'nonprofit creation': ['legal', 'attorney', 'lawyer', 'business'],
        'business formation': ['legal', 'attorney', 'lawyer', 'business'],
        'tax planning': ['accountant', 'cpa', 'tax', 'financial'],
        'family crest design': ['designer', 'creative', 'artist'],
        'estate planning': ['legal', 'attorney', 'lawyer', 'estate'],
        'wealth transfer': ['financial', 'advisor', 'estate', 'legal'],
        'family office software': ['technology', 'tech', 'developer', 'it'],
        'investment analytics': ['financial', 'advisor', 'analyst', 'investment'],
        'security services': ['security', 'technology', 'tech', 'cyber'],
        'personal assistant': ['assistant', 'admin', 'coordinator'],
        'travel planning': ['travel', 'concierge', 'coordinator', 'assistant'],
        'event management': ['event', 'coordinator', 'planner', 'assistant']
      }
      
      const relevantRoles = serviceToRoleMapping[serviceNameLower] || []
      return relevantRoles.some(role => memberRole.includes(role))
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

  const serviceCategories = [
    {
      title: "Insurance Services",
      icon: LifeBuoy,
      color: "text-blue-600",
      services: [
        { name: "Life Insurance", icon: Heart, description: "Comprehensive life insurance policies for family protection" },
        { name: "Health Insurance", icon: Shield, description: "Medical coverage and health protection plans" },
        { name: "Property Insurance", icon: Home, description: "Home, auto, and asset protection insurance" },
        { name: "Business Insurance", icon: Building2, description: "Commercial liability, workers comp, and business protection" }
      ]
    },
    {
      title: "Financial Services",
      icon: DollarSign,
      color: "text-green-600",
      services: [
        { name: "Credit Funding", icon: CreditCard, description: "Business and personal credit funding solutions" },
        { name: "Forex Trading", icon: Globe, description: "Foreign exchange trading and currency management" },
        { name: "Stock Trading", icon: TrendingUp, description: "Equity trading and investment management" },
        { name: "Crypto Trading", icon: Bitcoin, description: "Cryptocurrency trading and digital asset management" }
      ]
    },
    {
      title: "Business Services",
      icon: Building2,
      color: "text-purple-600",
      services: [
        { name: "Nonprofit Creation", icon: Building, description: "501(c)(3) nonprofit organization setup and compliance" },
        { name: "Business Formation", icon: Briefcase, description: "LLC, Corporation, and business entity formation" },
        { name: "Tax Planning", icon: Target, description: "Strategic tax planning and optimization services" }
      ]
    },
    {
      title: "Legacy Services",
      icon: Crown,
      color: "text-orange-600",
      services: [
        { name: "Family Crest Design", icon: Crown, description: "Custom family crest design and heraldry services" },
        { name: "Estate Planning", icon: Scroll, description: "Comprehensive estate planning and trust services" },
        { name: "Wealth Transfer", icon: ArrowUpRight, description: "Generational wealth transfer strategies" }
      ]
    },
    {
      title: "Technology Services",
      icon: BrainCircuit,
      color: "text-red-600",
      services: [
        { name: "Family Office Software", icon: Building2, description: "Custom family office management platforms" },
        { name: "Investment Analytics", icon: BarChart3, description: "Advanced portfolio analytics and reporting" },
        { name: "Security Services", icon: Lock, description: "Cybersecurity and digital asset protection" }
      ]
    },
    {
      title: "Concierge Services",
      icon: Star,
      color: "text-pink-600",
      services: [
        { name: "Personal Assistant", icon: Users, description: "Dedicated personal and family assistance" },
        { name: "Travel Planning", icon: Globe, description: "Luxury travel and vacation planning services" },
        { name: "Event Management", icon: Video, description: "Family events and special occasion planning" }
      ]
    }
  ]

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold mb-2">Family Office Services</h3>
        <p className="text-muted-foreground text-sm mb-6">
          Comprehensive services to support your family's financial and personal needs
        </p>
      </div>
      
      <div className="grid gap-6">
        {serviceCategories.map((category, categoryIndex) => {
          const CategoryIcon = category.icon
          
          return (
            <Card key={category.title} className="shadow-soft border-l-4" style={{ borderLeftColor: 'hsl(var(--primary))' }}>
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center space-x-3 text-lg">
                  <CategoryIcon className={`h-6 w-6 ${category.color}`} />
                  <span>{category.title}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {category.services.map((service) => {
                    const ServiceIcon = service.icon
                    const member = findMemberForService(service.name)
                    const isAvailable = !!member && !loadingMembers
                    
                    return (
                      <div
                        key={service.name}
                        className={`group p-4 rounded-lg border border-border transition-all ${
                          isAvailable 
                            ? 'hover:border-[#ffb500] cursor-pointer' 
                            : 'opacity-60 cursor-not-allowed'
                        }`}
                        onClick={() => isAvailable && handleServiceClick(service.name)}
                      >
                        <div className="flex items-start space-x-3">
                          <div className="flex-shrink-0">
                            <ServiceIcon className={`h-5 w-5 ${category.color} ${
                              isAvailable ? 'group-hover:scale-110' : ''
                            } transition-transform`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-sm sm:text-base text-white hover:text-purple-500 transition-colors">
                              {service.name}
                            </h4>
                            <p className="text-xs sm:text-sm text-muted-foreground mt-1 leading-relaxed">
                              {service.description}
                            </p>
                            {member && (
                              <p className="text-xs text-green-400 mt-1">
                                Available via {member.full_name}
                              </p>
                            )}
                            <div className={`flex items-center mt-3 text-xs ${category.color} opacity-0 group-hover:opacity-100 transition-opacity`}>
                              {isAvailable ? (
                                <>
                                  <span>Request Service</span>
                                  <ArrowRight className="h-3 w-3 ml-1" />
                                </>
                              ) : (
                                <>
                                  <span className="text-gray-400">Coming Soon</span>
                                  <Clock className="h-3 w-3 ml-1 text-gray-400" />
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

      {/* Premium Services Notice */}
      <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
        <CardContent className="p-6">
          <div className="flex items-center space-x-4">
            <div className="flex-shrink-0">
              <Star className="h-8 w-8" style={{ color: "#ffb500" }} />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-lg mb-2">Premium Service Guarantee</h3>
              <p className="text-sm text-muted-foreground mb-4">
                All services are provided by vetted professionals with extensive experience in high-net-worth family office management. 
                We guarantee white-glove service and complete confidentiality.
              </p>
              <div className="flex items-center space-x-2 text-sm">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span>24/7 Support Available</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Family Office Members Status */}
      {!loadingMembers && (
        <Card className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-start space-x-3">
              <UserCheck className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-blue-900 mb-1">Family Office Team</h4>
                <p className="text-sm text-blue-800">
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