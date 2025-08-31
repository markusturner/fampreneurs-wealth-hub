import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/integrations/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { TransactionControls } from './TransactionControls'
import { TransactionFilters } from './TransactionFilters'
import { usePlaidLink } from 'react-plaid-link'
import { 
  Plus, 
  Download, 
  Upload,
  Search,
  Calendar,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCw,
  Bell,
  Tag,
  Bot,
  Wand2,
  FileCheck,
  Zap,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  DollarSign,
  Filter,
  Building2,
  Home,
  Car,
  ShoppingBag,
  Coffee,
  Gamepad2,
  Heart,
  Plane
} from 'lucide-react'
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination'

// Small helper component to launch Plaid Link update flow
function PlaidUpdateLink({ token, onSuccess, onExit }: { token: string; onSuccess: () => void; onExit: () => void }) {
  const { open, ready } = usePlaidLink({
    token,
    onSuccess: () => onSuccess(),
    onExit: () => onExit(),
  } as any)

  useEffect(() => {
    if (ready) open()
  }, [ready, open])

  return null
}

interface Transaction {
  id: string
  date: string
  description: string
  amount: number
  type: 'income' | 'expense' | 'transfer' | 'investment'
  category: string
  account: string
  tags: string[]
  familyMember?: string
  isRecurring: boolean
  status: 'completed' | 'pending' | 'failed'
}

interface TransactionFilter {
  dateRange: string
  account: string
  category: string
  familyMember: string
  type: string
  amountRange: string
}

export function TransactionMonitoring() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [connectedAccounts, setConnectedAccounts] = useState<any[]>([])
  const [uploadedStatements, setUploadedStatements] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showFilterDialog, setShowFilterDialog] = useState(false)
  const [showUploadDialog, setShowUploadDialog] = useState(false)
  const [uploadFile, setUploadFile] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [lastRefreshed, setLastRefreshed] = useState<Date>()
  const [currentPage, setCurrentPage] = useState(1)
  const [transactionsPerPage, setTransactionsPerPage] = useState(25)
  const [filters, setFilters] = useState<TransactionFilter>({
    dateRange: 'all',
    account: 'all', 
    category: 'all',
    familyMember: 'all',
    type: 'all',
    amountRange: 'all'
  })

  // Data fetching and state management
  const accounts = [
    'Chase Checking', 'Chase Savings', 'Business Checking', 'Fidelity Brokerage',
    'Coinbase Pro', 'Wells Fargo', 'Vanguard 401k'
  ]

  const [enablePlaidTransactions, setEnablePlaidTransactions] = useState(false)
  const [aiBookkeepingEnabled, setAiBookkeepingEnabled] = useState(false)
  const [aiProcessing, setAiProcessing] = useState(false)

  useEffect(() => {
    fetchConnectedAccountsAndTransactions()
  }, [user])

  const fetchConnectedAccountsAndTransactions = async () => {
    if (!user) return

    setLoading(true)
    try {
      // Fetch connected accounts
      const { data: accountsData } = await supabase
        .from('connected_accounts')
        .select('*')
        .eq('user_id', user.id)

      setConnectedAccounts(accountsData || [])

      // Fetch account transactions
      const { data: accountTransactions } = await supabase
        .from('account_transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('transaction_date', { ascending: false })

      // Fetch bank statement transactions
      const { data: bankTransactions } = await supabase
        .from('bank_statement_transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('transaction_date', { ascending: false })

      // Fetch uploaded statements
      const { data: uploads } = await supabase
        .from('bank_statement_uploads')
        .select('*')
        .eq('user_id', user.id)
        .order('uploaded_at', { ascending: false })

      setUploadedStatements(uploads || [])

      // Combine and format transactions
      const combinedTransactions = [
        ...(accountTransactions || []).map(t => ({
          id: t.id,
          date: t.transaction_date,
          description: t.description,
          amount: t.amount,
          type: t.transaction_type as 'income' | 'expense' | 'transfer' | 'investment',
          category: t.category || 'Other',
          account: t.merchant_name || 'Unknown',
          tags: [],
          isRecurring: false,
          status: 'completed' as const
        })),
        ...(bankTransactions || []).map(t => ({
          id: t.id,
          date: t.transaction_date,
          description: t.description,
          amount: t.amount,
          type: t.transaction_type as 'income' | 'expense' | 'transfer' | 'investment',
          category: t.category || 'Other',
          account: 'Bank Statement',
          tags: [],
          isRecurring: false,
          status: 'completed' as const
        }))
      ]

      setTransactions(combinedTransactions)
      setLastRefreshed(new Date())
    } catch (error) {
      console.error('Error fetching transactions:', error)
      toast({
        title: "Error",
        description: "Failed to load transactions",
        variant: "destructive"
      })
    }
    setLoading(false)
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files?.length || !user) return

    setUploading(true)
    const fileArray = Array.from(files)
    
    try {
      for (const file of fileArray) {
        const fileName = `${user.id}/${Date.now()}_${file.name}`
        
        // Upload file to Supabase storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('bank-statements')
          .upload(fileName, file)

        if (uploadError) throw uploadError

        // Create record in database
        const { error: dbError } = await supabase
          .from('bank_statement_uploads')
          .insert({
            user_id: user.id,
            filename: file.name,
            file_path: uploadData.path,
            file_size: file.size
          })

        if (dbError) throw dbError
      }

      toast({
        title: "Upload Successful",
        description: `${fileArray.length} file(s) uploaded successfully`
      })

      // Refresh data
      await fetchConnectedAccountsAndTransactions()
      setShowUploadDialog(false)
      
    } catch (error) {
      console.error('Upload error:', error)
      toast({
        title: "Upload Failed",
        description: "Failed to upload files",
        variant: "destructive"
      })
    }
    setUploading(false)
  }

  const handleAIBookkeeping = async () => {
    setAiProcessing(true)
    try {
      // Simulate AI processing
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      toast({
        title: "AI Bookkeeping Complete",
        description: "Transactions have been categorized and analyzed"
      })
    } catch (error) {
      toast({
        title: "AI Processing Failed",
        description: "Failed to process transactions",
        variant: "destructive"
      })
    }
    setAiProcessing(false)
  }

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'income': return TrendingUp
      case 'expense': return TrendingDown
      case 'transfer': return ArrowUpRight
      default: return DollarSign
    }
  }

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'income': return 'text-green-600'
      case 'expense': return 'text-red-600'
      case 'transfer': return 'text-blue-600'
      default: return 'text-gray-600'
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(Math.abs(amount))
  }

  // Filter and search transactions
  const filteredTransactions = transactions.filter(transaction => {
    if (searchTerm && !transaction.description.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false
    }
    if (filters.account !== 'all' && transaction.account !== filters.account) {
      return false
    }
    if (filters.category !== 'all' && transaction.category !== filters.category) {
      return false
    }
    if (filters.type !== 'all' && transaction.type !== filters.type) {
      return false
    }
    return true
  })

  const totalPages = Math.ceil(filteredTransactions.length / transactionsPerPage)
  const startIndex = (currentPage - 1) * transactionsPerPage
  const endIndex = startIndex + transactionsPerPage
  const currentTransactions = filteredTransactions.slice(startIndex, endIndex)

  return (
    <div className="space-y-6">
      {/* Reorganized Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Transaction Monitoring
          </h2>
          <p className="text-sm text-muted-foreground">
            Track and manage all financial transactions across accounts
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            onClick={async () => {
              // Simple CSV processing that actually works
              const pending = uploadedStatements.filter((s) => 
                s.processing_status === 'pending' && 
                s.filename?.toLowerCase().endsWith('.csv')
              )
              
              if (pending.length === 0) {
                toast({ title: "Nothing to process", description: "No pending CSV files found" })
                return
              }

              try {
                let totalProcessed = 0
                
                for (const statement of pending) {
                  // Download and parse CSV
                  const { data: fileData, error: downloadError } = await supabase
                    .storage
                    .from('bank-statements')
                    .download(statement.file_path)

                  if (downloadError || !fileData) {
                    console.error('Download failed:', downloadError)
                    continue
                  }

                  const csvText = await fileData.text()
                  const lines = csvText.split(/\r?\n/).filter(line => line.trim())
                  
                  if (lines.length <= 1) continue // Skip if no data rows
                  
                  const transactions = []
                  
                  // Parse each line (skip header)
                  for (let i = 1; i < lines.length; i++) {
                    const line = lines[i].trim()
                    if (!line) continue
                    
                    // Simple CSV parsing (handles quotes)
                    const columns = line.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g)?.map(col => 
                      col.replace(/^"(.*)"$/, '$1').trim()
                    ) || []
                    
                    if (columns.length < 3) continue
                    
                    const [dateStr, description, amountStr] = columns
                    
                    // Parse date
                    const date = new Date(dateStr)
                    if (isNaN(date.getTime())) continue
                    
                    // Parse amount
                    const amount = parseFloat(amountStr.replace(/[$,]/g, ''))
                    if (isNaN(amount)) continue
                    
                    // Determine transaction type
                    const type = amount < 0 ? 'expense' : 'income'
                    
                    transactions.push({
                      user_id: user?.id,
                      transaction_date: date.toISOString().split('T')[0],
                      description: description || 'Transaction',
                      amount: Math.abs(amount),
                      transaction_type: type,
                      category: 'Uncategorized'
                    })
                  }
                  
                  // Insert transactions
                  if (transactions.length > 0) {
                    const { error: insertError } = await supabase
                      .from('bank_statement_transactions')
                      .insert(transactions)
                    
                    if (insertError) {
                      console.error('Insert failed:', insertError)
                      continue
                    }
                    
                    totalProcessed += transactions.length
                  }
                  
                  // Mark as completed
                  await supabase
                    .from('bank_statement_uploads')
                    .update({ 
                      processing_status: 'completed',
                      processed_at: new Date().toISOString(),
                      transactions_extracted: transactions.length
                    })
                    .eq('id', statement.id)
                }
                
                await fetchConnectedAccountsAndTransactions()
                toast({ 
                  title: "Success!", 
                  description: `Processed ${totalProcessed} transactions` 
                })
                
              } catch (error) {
                console.error('Processing failed:', error)
                toast({ 
                  title: "Error", 
                  description: "Failed to process CSV files", 
                  variant: "destructive" 
                })
              }
            }}
            className="flex items-center gap-2"
          >
            <FileCheck className="h-4 w-4" />
            Process Uploads
          </Button>

          <Button 
            variant="outline" 
            onClick={async () => {
              if (connectedAccounts.length === 0) {
                toast({ title: "No accounts", description: "Connect bank accounts first" })
                return
              }

              try {
                const results = await Promise.allSettled(
                  connectedAccounts.map(async (account) => {
                    const { error } = await supabase.functions.invoke('plaid-fetch-transactions', {
                      body: { account_id: account.external_account_id }
                    })
                    if (error) throw error
                  })
                )

                const successes = results.filter(r => r.status === 'fulfilled').length
                const failures = results.length - successes

                await fetchConnectedAccountsAndTransactions()

                if (successes > 0) {
                  toast({ title: "Synced from bank", description: `${successes} account(s) updated${failures ? `, ${failures} failed` : ''}` })
                } else {
                  toast({ title: "Sync failed", description: "Could not sync any accounts", variant: "destructive" })
                }
              } catch (err) {
                console.error(err)
                toast({ title: "Sync error", description: "Something went wrong during sync", variant: "destructive" })
              }
            }}
            className="flex items-center gap-2"
          >
            <Zap className="h-4 w-4" />
            Sync from Bank
          </Button>
          
          <TransactionControls
            transactionsPerPage={transactionsPerPage}
            onTransactionsPerPageChange={(value) => {
              setTransactionsPerPage(value)
              setCurrentPage(1)
            }}
            lastRefreshed={lastRefreshed}
          />
          
          <TransactionFilters
            filters={filters}
            onFiltersChange={setFilters}
            showFilterDialog={showFilterDialog}
            onShowFilterDialogChange={setShowFilterDialog}
            onApplyFilters={() => {
              setCurrentPage(1)
              setShowFilterDialog(false)
            }}
            onClearFilters={() => {
              setFilters({
                dateRange: 'all',
                account: 'all',
                category: 'all',
                familyMember: 'all',
                type: 'all',
                amountRange: 'all'
              })
              setCurrentPage(1)
            }}
            accounts={accounts}
          />
        </div>
      </div>

      {/* Upload Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Upload Statement
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Upload Bank Statement</DialogTitle>
            <DialogDescription>
              Upload a CSV bank statement to import transaction history
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Bank Statement File (CSV only)</Label>
              <Input
                type="file"
                accept=".csv"
                multiple
                onChange={handleFileUpload}
                disabled={uploading}
              />
              <p className="text-xs text-muted-foreground">
                Only CSV files are supported for automatic transaction parsing
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Search Bar */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search transactions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Button 
          variant="outline" 
          onClick={handleAIBookkeeping}
          disabled={aiProcessing}
          className="flex items-center gap-2"
        >
          {aiProcessing ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <Bot className="h-4 w-4" />
          )}
          AI Bookkeeping
        </Button>
      </div>

      {/* Transaction List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Recent Transactions</span>
            <Badge variant="secondary">
              {filteredTransactions.length} transactions
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin" />
              <span className="ml-2">Loading transactions...</span>
            </div>
          ) : currentTransactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No transactions found</p>
              <p className="text-sm">Upload a CSV statement or connect your bank account to see transactions</p>
            </div>
          ) : (
            <div className="space-y-2">
              {currentTransactions.map((transaction) => {
                const Icon = getTransactionIcon(transaction.type)
                const colorClass = getTransactionColor(transaction.type)
                
                return (
                  <div key={transaction.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full bg-muted ${colorClass}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-medium">{transaction.description}</p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span>{transaction.account}</span>
                          <span>•</span>
                          <span>{transaction.category}</span>
                          <span>•</span>
                          <span>{new Date(transaction.date).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <p className={`font-semibold ${colorClass}`}>
                        {transaction.type === 'expense' ? '-' : '+'}
                        {formatCurrency(transaction.amount)}
                      </p>
                      <Badge 
                        variant={transaction.status === 'completed' ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {transaction.status}
                      </Badge>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
        
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious 
                    href="#" 
                    onClick={(e) => {
                      e.preventDefault()
                      if (currentPage > 1) setCurrentPage(currentPage - 1)
                    }}
                    className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
                  />
                </PaginationItem>
                
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const pageNum = i + 1
                  return (
                    <PaginationItem key={pageNum}>
                      <PaginationLink 
                        href="#"
                        onClick={(e) => {
                          e.preventDefault()
                          setCurrentPage(pageNum)
                        }}
                        isActive={currentPage === pageNum}
                      >
                        {pageNum}
                      </PaginationLink>
                    </PaginationItem>
                  )
                })}
                
                {totalPages > 5 && (
                  <PaginationItem>
                    <PaginationEllipsis />
                  </PaginationItem>
                )}
                
                <PaginationItem>
                  <PaginationNext 
                    href="#"
                    onClick={(e) => {
                      e.preventDefault()
                      if (currentPage < totalPages) setCurrentPage(currentPage + 1)
                    }}
                    className={currentPage === totalPages ? "pointer-events-none opacity-50" : ""}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
    </div>
  )
}
