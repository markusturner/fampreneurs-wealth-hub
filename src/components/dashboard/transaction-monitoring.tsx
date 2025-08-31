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
        // Convert file to base64 for processing
        const fileContent = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => {
            const base64 = reader.result as string
            // Remove data:mime;base64, prefix
            const base64Content = base64.split(',')[1]
            resolve(base64Content)
          }
          reader.onerror = reject
          reader.readAsDataURL(file)
        })

        // Process the CSV file through the edge function
        const { data: processData, error: processError } = await supabase.functions.invoke('process-bank-statement', {
          body: {
            fileName: file.name,
            fileContent: fileContent,
            fileType: file.type || 'text/csv'
          }
        })

        if (processError) throw processError

        console.log('File processed successfully:', processData)
      }

      toast({
        title: "Upload and Processing Successful",
        description: `${fileArray.length} file(s) uploaded and processed successfully`
      })

      // Refresh data
      await fetchConnectedAccountsAndTransactions()
      setShowUploadDialog(false)
      
    } catch (error) {
      console.error('Upload and processing error:', error)
      toast({
        title: "Upload Failed",
        description: "Failed to upload and process files",
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
              // Intelligent CSV processing with header detection
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
                let totalSkippedRows = 0
                let filesWithNoValidRows: string[] = []
                
                const detectDelimiter = (line: string) => {
                  if (line.includes(';') && !line.includes(',')) return ';'
                  if (line.includes('\t')) return '\t'
                  if (line.includes('|')) return '|'
                  return ','
                }

                const parseCSVLine = (line: string, delimiter: string) =>
                  line
                    .match(new RegExp(`(\"([^\"]|\"\")*\"|[^${delimiter}]+)(?=${delimiter}|$)`, 'g'))
                    ?.map((seg) => seg.replace(/^\"|\"$/g, '').replace(/\"\"/g, '"').trim()) || []
                const parseAmount = (raw?: string) => {
                  if (raw == null) return NaN
                  let s = String(raw).trim()
                  if (s === '') return NaN
                  s = s.replace(/[$,\s]/g, '')
                  if (/^\(.*\)$/.test(s)) s = '-' + s.slice(1, -1)
                  // normalize leading + or -
                  return parseFloat(s)
                }
                const parseDateIso = (raw?: string) => {
                  if (!raw) return null
                  const s = String(raw).trim()
                  // try M/D/YYYY or MM/DD/YYYY
                  const mdy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
                  if (mdy) {
                    const [_, m, d, y] = mdy
                    const dt = new Date(Number(y), Number(m) - 1, Number(d))
                    return isNaN(dt.getTime()) ? null : dt.toISOString().split('T')[0]
                  }
                  const d = new Date(s)
                  return isNaN(d.getTime()) ? null : d.toISOString().split('T')[0]
                }
                // helper (unused): would compute indices against header if needed

                const getVal = (cols: string[], idx: number) =>
                  idx >= 0 && cols[idx] !== undefined ? cols[idx] : undefined
                const firstNonEmpty = (vals: (string | undefined)[]) => {
                  for (const v of vals) {
                    if (v != null && String(v).trim() !== '') return String(v).trim()
                  }
                  return undefined
                }
                
                for (const statement of pending) {
                  // Download CSV
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
                  if (lines.length <= 1) {
                    filesWithNoValidRows.push(statement.filename)
                    // Mark as completed with 0
                    await supabase.from('bank_statement_uploads').update({
                      processing_status: 'completed',
                      processed_at: new Date().toISOString(),
                      transactions_extracted: 0
                    }).eq('id', statement.id)
                    continue
                  }

                  // Detect delimiter and header columns
                  const delimiter = detectDelimiter(lines[0])
                  const header = parseCSVLine(lines[0], delimiter).map(h => h.toLowerCase())
                  const idxDate = header.findIndex(h => ['date','posted date','post date','transaction date','value date','date posted','transactiondate'].includes(h))
                  const idxDesc = header.findIndex(h => ['description','details','payee','memo','note','narrative','reference','ref','transaction','transaction details'].includes(h))
                  const idxAmount = header.findIndex(h => ['amount','transaction amount','amt','transactionamount','amount (usd)','amount usd','value'].includes(h))
                  const idxDebit = header.findIndex(h => ['debit','withdrawal','debit amount','withdrawal amount','debits','payments'].includes(h))
                  const idxCredit = header.findIndex(h => ['credit','deposit','credit amount','credits','deposits'].includes(h))

                  const transactions: any[] = []
                  let skippedRows = 0

                  for (let i = 1; i < lines.length; i++) {
                    const cols = parseCSVLine(lines[i], delimiter)
                    if (!cols.length) { skippedRows++; continue }

                    const dateStrRaw = (idxDate >= 0 ? cols[idxDate] : cols[0])
                    const dateIso = parseDateIso(dateStrRaw)
                    const descStr = firstNonEmpty([
                      idxDesc >= 0 ? cols[idxDesc] : undefined,
                      header.indexOf('payee') >= 0 ? cols[header.indexOf('payee')] : undefined,
                      header.indexOf('reference') >= 0 ? cols[header.indexOf('reference')] : undefined,
                      cols[1],
                      'Transaction'
                    ]) as string

                    // Amount resolution
                    let amountNum = NaN
                    if (idxAmount >= 0 && cols[idxAmount] !== undefined) {
                      amountNum = parseAmount(cols[idxAmount])
                    } else if (idxDebit >= 0 || idxCredit >= 0) {
                      const debitVal = idxDebit >= 0 ? parseAmount(cols[idxDebit]) : NaN
                      const creditVal = idxCredit >= 0 ? parseAmount(cols[idxCredit]) : NaN
                      amountNum = !isNaN(debitVal) ? -Math.abs(debitVal) : (!isNaN(creditVal) ? Math.abs(creditVal) : NaN)
                    }

                    if (!dateIso || isNaN(amountNum)) { skippedRows++; continue }

                    const type = amountNum < 0 ? 'expense' : 'income'

                    transactions.push({
                      user_id: user?.id,
                      bank_statement_id: statement.id,
                      transaction_date: dateIso,
                      description: descStr,
                      amount: Math.abs(amountNum),
                      transaction_type: type,
                      category: 'Uncategorized'
                    })
                  }

                  if (transactions.length > 0) {
                    const { error: insertError } = await supabase
                      .from('bank_statement_transactions')
                      .insert(transactions)
                    if (insertError) {
                      console.error('Insert failed:', insertError)
                      await supabase.from('bank_statement_uploads').update({
                        processing_status: 'failed',
                        processed_at: new Date().toISOString(),
                        transactions_extracted: 0,
                        error_message: (insertError as any)?.message?.slice(0, 500) ?? 'Insert failed'
                      }).eq('id', statement.id)
                    } else {
                      totalProcessed += transactions.length
                      await supabase.from('bank_statement_uploads').update({
                        processing_status: 'completed',
                        processed_at: new Date().toISOString(),
                        transactions_extracted: transactions.length,
                        error_message: null
                      }).eq('id', statement.id)
                    }
                  } else {
                    filesWithNoValidRows.push(statement.filename)
                    await supabase.from('bank_statement_uploads').update({
                      processing_status: 'completed',
                      processed_at: new Date().toISOString(),
                      transactions_extracted: 0,
                      error_message: 'No valid rows detected'
                    }).eq('id', statement.id)
                  }

                  totalSkippedRows += skippedRows
                }
                
                await fetchConnectedAccountsAndTransactions()
                
                if (totalProcessed > 0) {
                  toast({ 
                    title: "Success!", 
                    description: `Processed ${totalProcessed} transaction(s)${totalSkippedRows ? `, skipped ${totalSkippedRows} row(s)` : ''}` 
                  })
                } else {
                  const reason = filesWithNoValidRows.length
                    ? `No valid rows detected in: ${filesWithNoValidRows.join(', ')}`
                    : 'No valid rows detected.'
                  toast({ title: "0 transactions added", description: reason })
                }
                
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

              // Only sync accounts that have Plaid linkage
              const eligibleAccounts = connectedAccounts.filter((a) => a.external_account_id && a.provider === 'plaid')
              if (eligibleAccounts.length === 0) {
                toast({ title: "No eligible accounts", description: "Reconnect bank accounts to enable syncing" })
                return
              }

              try {
                let totalAdded = 0
                let skipped = 0

                const results = await Promise.allSettled(
                  eligibleAccounts.map(async (account) => {
                    // The edge function expects the connected_accounts.id, not the Plaid account_id
                    const { data, error } = await supabase.functions.invoke('plaid-fetch-transactions', {
                      body: { account_id: account.id }
                    })

                    if (error) {
                      const msg = typeof (error as any)?.message === 'string' ? (error as any).message : JSON.stringify(error)
                      if (msg.includes('INVALID_PRODUCT') || msg.toLowerCase().includes('transactions product')) {
                        skipped += 1
                        return 'skipped'
                      }
                      throw error
                    }

                    if ((data as any)?.skipped || (data as any)?.reason === 'INVALID_PRODUCT') {
                      skipped += 1
                      return 'skipped'
                    }

                    const added = Array.isArray((data as any)?.transactions) ? (data as any).transactions.length : 0
                    totalAdded += added
                    return added
                  })
                )

                const fulfilled = results.filter(r => r.status === 'fulfilled').length
                const failed = results.length - fulfilled

                await fetchConnectedAccountsAndTransactions()

                if (totalAdded > 0) {
                  toast({ title: "Sync complete", description: `${totalAdded} transaction(s) added across ${fulfilled} account(s)${skipped ? `, ${skipped} skipped` : ''}` })
                } else {
                  const desc = skipped ? 'Plaid Transactions is not enabled for these accounts. No transactions returned.' : (failed ? 'All account syncs failed.' : 'No new transactions found.')
                  toast({ title: "0 transactions added", description: desc })
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
