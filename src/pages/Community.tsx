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
  Sparkles,
  Clock,
  Calendar,
  MessageSquare,
  GraduationCap,
  Award,
  CheckCircle2,
  Mail,
  Linkedin,
  Search,
  Send,
  ArrowRight,
  UserCheck,
  Check
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { InvestmentChart } from '@/components/dashboard/investment-chart'
import { AssetAllocation } from '@/components/dashboard/asset-allocation'
import { AccountIntegration } from '@/components/dashboard/account-integration'
import { TransactionMonitoring } from '@/components/dashboard/transaction-monitoring'
import { FinancialReports } from '@/components/dashboard/financial-reports'
import { FamilyMemberManagement } from '@/components/dashboard/family-member-management'
import { MessagesContentAI } from '@/components/community/MessagesContentAI'

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
        .in('status', ['active', 'invited'])
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
          {/* Responsive Tab Navigation */}
          <div className="w-full">
            <TabsList>
              <TabsTrigger value="accounts">
                <CreditCard className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="hidden md:inline">Accounts</span>
              </TabsTrigger>
              <TabsTrigger value="reports">
                <BarChart3 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="hidden md:inline">Reports</span>
              </TabsTrigger>
              <TabsTrigger value="transactions">
                <ArrowUpRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="hidden md:inline">Transactions</span>
              </TabsTrigger>
              <TabsTrigger value="documents">
                <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="hidden md:inline">Documents</span>
              </TabsTrigger>
              <TabsTrigger value="messages">
                <BrainCircuit className="h-3.5 w-3.5 sm:h-4 sm:w-4" style={{ color: '#2eb2ff' }} />
                <span className="hidden md:inline">AI Experts</span>
              </TabsTrigger>
            </TabsList>
          </div>


          <TabsContent value="accounts" className="space-y-4 sm:space-y-6 animate-fade-in">
            <AccountIntegration />
          </TabsContent>

          <TabsContent value="reports" className="space-y-4 sm:space-y-6 animate-fade-in">
            <FinancialReports />
          </TabsContent>

          <TabsContent value="transactions" className="space-y-4 sm:space-y-6 animate-fade-in">
            <TransactionMonitoring />
          </TabsContent>



          <TabsContent value="documents" className="space-y-6 animate-fade-in">
            <DocumentsContent />
          </TabsContent>

          <TabsContent value="messages" className="space-y-6 animate-fade-in" data-value="messages">
            <MessagesContentAI />
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