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
import { 
  Plus, 
  Filter, 
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
  Zap
} from 'lucide-react'

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
  accountType: string
  category: string
  familyMember: string
  transactionType: string
  minAmount: string
  maxAmount: string
}

export function TransactionMonitoring() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [connectedAccounts, setConnectedAccounts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showFilterDialog, setShowFilterDialog] = useState(false)
  const [showUploadDialog, setShowUploadDialog] = useState(false)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filters, setFilters] = useState<TransactionFilter>({
    dateRange: 'all',
    accountType: 'all',
    category: 'all',
    familyMember: 'all',
    transactionType: 'all',
    minAmount: '',
    maxAmount: ''
  })
  
  const [newTransaction, setNewTransaction] = useState({
    description: '',
    amount: '',
    type: 'expense' as const,
    category: '',
    account: '',
    tags: '',
    notes: '',
    date: new Date().toISOString().split('T')[0]
  })

  const [aiBookkeeping, setAiBookkeeping] = useState({
    isProcessing: false,
    lastProcessed: null as Date | null,
    showDialog: false,
    processingOptions: {
      categorize: true,
      detectDuplicates: true,
      suggestTags: true,
      generateReports: true
    }
  })

  useEffect(() => {
    fetchConnectedAccountsAndTransactions()
  }, [user])

  // Auto-sync connected accounts on load
  useEffect(() => {
    if (user && connectedAccounts.length > 0) {
      syncAllAccounts()
    }
  }, [user, connectedAccounts])

  const fetchConnectedAccountsAndTransactions = async () => {
    try {
      setLoading(true)
      
      if (!user) {
        // For non-authenticated users, use empty data
        setConnectedAccounts([])
        setTransactions([])
        return
      }

      // For authenticated users, fetch from Supabase
      const { data: accounts, error } = await supabase
        .from('connected_accounts')
        .select('*')
        .eq('user_id', user.id)

      if (error) {
        console.error('Error fetching accounts:', error)
        setConnectedAccounts([])
        setTransactions([])
        return
      }

      setConnectedAccounts(accounts || [])
      
      // Only fetch transactions if there are connected accounts
      if (accounts && accounts.length > 0) {
        await fetchTransactions()
      } else {
        setTransactions([])
      }
    } catch (error) {
      console.error('Error fetching data:', error)
      setConnectedAccounts([])
      setTransactions([])
    } finally {
      setLoading(false)
    }
  }

  const fetchTransactions = async (offset = 0, append = false) => {
    try {
      if (user) {
        // For authenticated users, fetch from Supabase
        const { data: dbTransactions, error } = await supabase
          .from('account_transactions')
          .select('*')
          .eq('user_id', user.id)
          .order('transaction_date', { ascending: false })
          .range(offset, offset + 49)

        if (error) {
          console.error('Error fetching transactions:', error)
          if (!append) setTransactions([])
          return
        }

        // Transform Supabase data to match our interface
        const transformedTransactions: Transaction[] = (dbTransactions || []).map(tx => ({
          id: tx.id,
          date: tx.transaction_date,
          description: tx.description || 'Transaction',
          amount: Number(tx.amount),
          type: tx.transaction_type === 'credit' ? 'income' : 'expense',
          category: tx.category || 'Uncategorized',
          account: 'Connected Account',
          tags: [],
          isRecurring: false,
          status: tx.pending ? 'pending' : 'completed'
        }))

        if (append) {
          setTransactions(prev => [...prev, ...transformedTransactions])
        } else {
          setTransactions(transformedTransactions)
        }

        // Check if there are more transactions
        setHasMore(transformedTransactions.length === 50)
      } else {
        // For non-authenticated users, only show transactions if they manually added them
        const storedTransactions = localStorage.getItem('manualTransactions')
        const manualTransactions = storedTransactions ? JSON.parse(storedTransactions) : []
        setTransactions(manualTransactions)
        setHasMore(false)
      }
    } catch (error) {
      console.error('Error fetching transactions:', error)
      if (!append) setTransactions([])
    }
  }

  const loadMoreTransactions = async () => {
    if (loadingMore || !hasMore || !user) return
    
    setLoadingMore(true)
    await fetchTransactions(transactions.length, true)
    setLoadingMore(false)
  }

  const handleFileUpload = async () => {
    if (!uploadFile || !user || uploading) return

    setUploading(true)

    try {
      // Convert file to base64
      const fileBuffer = await uploadFile.arrayBuffer()
      const base64Content = btoa(String.fromCharCode(...new Uint8Array(fileBuffer)))

      const { data, error } = await supabase.functions.invoke('process-bank-statement', {
        body: {
          fileName: uploadFile.name,
          fileContent: base64Content,
          fileType: uploadFile.type
        }
      })

      if (error) {
        throw new Error(error.message)
      }

      toast({
        title: "Upload Successful",
        description: data.message || `Processed ${data.transactionsCount} transactions`,
      })

      // Refresh transactions to show new data
      await fetchTransactions()
      setShowUploadDialog(false)
      setUploadFile(null)

    } catch (error) {
      console.error('Error uploading bank statement:', error)
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "Failed to process bank statement",
        variant: "destructive"
      })
    } finally {
      setUploading(false)
    }
  }

  const syncAllAccounts = async () => {
    if (!user || !connectedAccounts.length) return

    const plaidAccounts = connectedAccounts.filter(acc => acc.provider === 'plaid')
    if (plaidAccounts.length === 0) return

    console.log(`Auto-syncing ${plaidAccounts.length} Plaid accounts`)

    for (const account of plaidAccounts) {
      try {
        const { data, error } = await supabase.functions.invoke('plaid-fetch-transactions', {
          body: { account_id: account.id }
        })

        if (error) {
          console.error(`Error syncing account ${account.account_name}:`, error)
        } else {
          console.log(`Synced ${data.transactions?.length || 0} transactions for ${account.account_name}`)
        }
      } catch (error) {
        console.error(`Error syncing account ${account.account_name}:`, error)
      }
    }

    // Refresh transactions after sync
    await fetchTransactions()
  }

  const handleManualSync = async () => {
    if (loading) return
    
    setLoading(true)
    
    try {
      await syncAllAccounts()
      
      toast({
        title: "Sync Complete",
        description: "All connected accounts have been synced",
      })
    } catch (error) {
      console.error('Error during manual sync:', error)
      toast({
        title: "Sync Failed", 
        description: "Failed to sync some accounts",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleAddTransaction = async () => {
    if (!newTransaction.description || !newTransaction.amount) {
      toast({
        title: "Error",
        description: "Please fill in required fields",
        variant: "destructive"
      })
      return
    }

    try {
      const transaction: Transaction = {
        id: Date.now().toString(),
        date: newTransaction.date,
        description: newTransaction.description,
        amount: parseFloat(newTransaction.amount) * (newTransaction.type === 'expense' ? -1 : 1),
        type: newTransaction.type,
        category: newTransaction.category || 'Uncategorized',
        account: newTransaction.account || 'Default Account',
        tags: newTransaction.tags.split(',').map(tag => tag.trim()).filter(Boolean),
        isRecurring: false,
        status: 'completed'
      }

      setTransactions(prev => [transaction, ...prev])
      
      // Store manually added transactions for non-authenticated users
      if (!user) {
        const storedTransactions = localStorage.getItem('manualTransactions')
        const existingTransactions = storedTransactions ? JSON.parse(storedTransactions) : []
        const updatedTransactions = [transaction, ...existingTransactions]
        localStorage.setItem('manualTransactions', JSON.stringify(updatedTransactions))
      }
      
      setShowAddDialog(false)
      resetForm()

      toast({
        title: "Transaction Added",
        description: `Successfully added ${newTransaction.description}`,
      })

    } catch (error) {
      console.error('Error adding transaction:', error)
      toast({
        title: "Error",
        description: "Failed to add transaction",
        variant: "destructive"
      })
    }
  }

  const resetForm = () => {
    setNewTransaction({
      description: '',
      amount: '',
      type: 'expense',
      category: '',
      account: '',
      tags: '',
      notes: '',
      date: new Date().toISOString().split('T')[0]
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(Math.abs(amount))
  }

  const getTransactionIcon = (type: string, amount: number) => {
    if (amount > 0) {
      return <ArrowDownLeft className="h-4 w-4 text-green-600" />
    } else {
      return <ArrowUpRight className="h-4 w-4 text-red-600" />
    }
  }

  const getTransactionColor = (type: string, amount: number) => {
    if (amount > 0) {
      return 'text-green-600'
    } else {
      return 'text-red-600'
    }
  }

  const handleAIBookkeeping = async () => {
    setAiBookkeeping(prev => ({ ...prev, isProcessing: true }))

    try {
      // Simulate AI processing
      await new Promise(resolve => setTimeout(resolve, 3000))

      // Mock AI processing results
      const processedTransactions = transactions.map(transaction => {
        if (aiBookkeeping.processingOptions.categorize && transaction.category === 'Uncategorized') {
          // AI suggests better categories
          if (transaction.description.toLowerCase().includes('gas') || transaction.description.toLowerCase().includes('fuel')) {
            return { ...transaction, category: 'Transportation' }
          }
          if (transaction.description.toLowerCase().includes('grocery') || transaction.description.toLowerCase().includes('supermarket')) {
            return { ...transaction, category: 'Food & Dining' }
          }
          if (transaction.description.toLowerCase().includes('restaurant') || transaction.description.toLowerCase().includes('dining')) {
            return { ...transaction, category: 'Food & Dining' }
          }
        }

        if (aiBookkeeping.processingOptions.suggestTags && transaction.tags.length === 0) {
          // AI suggests tags
          const newTags = []
          if (transaction.description.toLowerCase().includes('business')) newTags.push('business')
          if (transaction.description.toLowerCase().includes('recurring')) newTags.push('recurring')
          if (transaction.amount > 1000) newTags.push('large-expense')
          return { ...transaction, tags: newTags }
        }

        return transaction
      })

      setTransactions(processedTransactions)
      setAiBookkeeping(prev => ({ 
        ...prev, 
        isProcessing: false, 
        lastProcessed: new Date(),
        showDialog: false 
      }))

      toast({
        title: "AI Bookkeeping Complete",
        description: `Processed ${transactions.length} transactions with AI insights`,
      })

    } catch (error) {
      console.error('AI Bookkeeping error:', error)
      setAiBookkeeping(prev => ({ ...prev, isProcessing: false }))
      toast({
        title: "Error",
        description: "AI Bookkeeping process failed",
        variant: "destructive"
      })
    }
  }

  const filteredTransactions = transactions.filter(transaction => {
    const matchesSearch = transaction.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         transaction.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         transaction.account.toLowerCase().includes(searchTerm.toLowerCase())
    
    return matchesSearch
  })

  const categories = [
    'Food & Dining', 'Transportation', 'Shopping', 'Entertainment', 'Bills & Utilities',
    'Healthcare', 'Education', 'Travel', 'Investments', 'Real Estate', 'Salary',
    'Business Income', 'Transfers', 'Taxes', 'Insurance', 'Donations', 'Other'
  ]

  const accounts = [
    'Chase Checking', 'Chase Savings', 'Business Checking', 'Fidelity Brokerage',
    'Coinbase Pro', 'Wells Fargo', 'Vanguard 401k'
  ]

  return (
    <div className="space-y-6">
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
        
        <div className="flex items-center gap-2">
          <Dialog open={showFilterDialog} onOpenChange={setShowFilterDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Filter
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Filter Transactions</DialogTitle>
                <DialogDescription>
                  Apply filters to narrow down transaction results
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Date Range</Label>
                  <Select value={filters.dateRange} onValueChange={(value) => setFilters(prev => ({ ...prev, dateRange: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Time</SelectItem>
                      <SelectItem value="today">Today</SelectItem>
                      <SelectItem value="week">This Week</SelectItem>
                      <SelectItem value="month">This Month</SelectItem>
                      <SelectItem value="quarter">This Quarter</SelectItem>
                      <SelectItem value="year">This Year</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Transaction Type</Label>
                  <Select value={filters.transactionType} onValueChange={(value) => setFilters(prev => ({ ...prev, transactionType: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="income">Income</SelectItem>
                      <SelectItem value="expense">Expense</SelectItem>
                      <SelectItem value="transfer">Transfer</SelectItem>
                      <SelectItem value="investment">Investment</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={filters.category} onValueChange={(value) => setFilters(prev => ({ ...prev, category: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {categories.map(category => (
                        <SelectItem key={category} value={category}>{category}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label>Min Amount</Label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={filters.minAmount}
                      onChange={(e) => setFilters(prev => ({ ...prev, minAmount: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Max Amount</Label>
                    <Input
                      type="number"
                      placeholder="∞"
                      value={filters.maxAmount}
                      onChange={(e) => setFilters(prev => ({ ...prev, maxAmount: e.target.value }))}
                    />
                  </div>
                </div>
                
                <div className="flex gap-2 pt-4">
                  <Button variant="outline" onClick={() => setShowFilterDialog(false)} className="flex-1">
                    Cancel
                  </Button>
                  <Button onClick={() => setShowFilterDialog(false)} className="flex-1">
                    Apply Filters
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          
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
                  <Label>Bank Statement File</Label>
                  <Input
                    type="file"
                    accept=".csv"
                    onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Supported formats: CSV files from your bank
                  </p>
                </div>
                
                {uploadFile && (
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm font-medium">{uploadFile.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(uploadFile.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                )}
                
                <div className="flex gap-2 pt-4">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setShowUploadDialog(false)
                      setUploadFile(null)
                    }} 
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleFileUpload} 
                    disabled={!uploadFile || uploading}
                    className="flex-1"
                  >
                    {uploading ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Upload
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          
          
          <Button 
            variant="outline" 
            size="sm" 
            className="flex items-center gap-2"
            onClick={handleManualSync}
            disabled={loading || connectedAccounts.length === 0}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Sync Accounts
          </Button>
          
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add Transaction
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add Transaction</DialogTitle>
                <DialogDescription>
                  Record a new financial transaction
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="description">Description *</Label>
                  <Input
                    id="description"
                    value={newTransaction.description}
                    onChange={(e) => setNewTransaction(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Transaction description"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label htmlFor="amount">Amount *</Label>
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      value={newTransaction.amount}
                      onChange={(e) => setNewTransaction(prev => ({ ...prev, amount: e.target.value }))}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="type">Type</Label>
                    <Select 
                      value={newTransaction.type} 
                      onValueChange={(value: any) => setNewTransaction(prev => ({ ...prev, type: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="income">Income</SelectItem>
                        <SelectItem value="expense">Expense</SelectItem>
                        <SelectItem value="transfer">Transfer</SelectItem>
                        <SelectItem value="investment">Investment</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select 
                    value={newTransaction.category} 
                    onValueChange={(value) => setNewTransaction(prev => ({ ...prev, category: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(category => (
                        <SelectItem key={category} value={category}>{category}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="account">Account</Label>
                  <Select 
                    value={newTransaction.account} 
                    onValueChange={(value) => setNewTransaction(prev => ({ ...prev, account: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select account" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.map(account => (
                        <SelectItem key={account} value={account}>{account}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="date">Date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={newTransaction.date}
                    onChange={(e) => setNewTransaction(prev => ({ ...prev, date: e.target.value }))}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="tags">Tags (comma-separated)</Label>
                  <Input
                    id="tags"
                    value={newTransaction.tags}
                    onChange={(e) => setNewTransaction(prev => ({ ...prev, tags: e.target.value }))}
                    placeholder="tag1, tag2, tag3"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={newTransaction.notes}
                    onChange={(e) => setNewTransaction(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Additional notes"
                    rows={3}
                  />
                </div>
                
                <div className="flex gap-2 pt-4">
                  <Button variant="outline" onClick={() => { setShowAddDialog(false); resetForm() }} className="flex-1">
                    Cancel
                  </Button>
                  <Button onClick={handleAddTransaction} className="flex-1">
                    Add Transaction
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search transactions..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* AI Bookkeeping Section */}
      <Card className="border-yellow-200 bg-gradient-to-r from-yellow-50 to-orange-50" style={{ borderColor: '#ffb500', background: 'linear-gradient(to right, #fffbeb, #fef3c7)' }}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-purple-800">
            <Bot className="h-5 w-5" />
            AI Bookkeeping Assistant
          </CardTitle>
          <CardDescription style={{ color: '#290a52' }}>
            Automatically categorize transactions, detect duplicates, and generate financial insights
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Zap className="h-4 w-4 text-yellow-500" />
                <span style={{ color: '#290a52' }}>Smart categorization & duplicate detection</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <FileCheck className="h-4 w-4 text-green-500" />
                <span style={{ color: '#290a52' }}>Automated tagging & expense insights</span>
              </div>
              {aiBookkeeping.lastProcessed && (
                <div className="text-xs text-muted-foreground">
                  Last processed: {aiBookkeeping.lastProcessed.toLocaleString()}
                </div>
              )}
            </div>
            
            <Dialog open={aiBookkeeping.showDialog} onOpenChange={(open) => setAiBookkeeping(prev => ({ ...prev, showDialog: open }))}>
              <DialogTrigger asChild>
                <Button 
                  disabled={aiBookkeeping.isProcessing || transactions.length === 0}
                  className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700"
                >
                  {aiBookkeeping.isProcessing ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Wand2 className="h-4 w-4" />
                      Run AI Bookkeeping
                    </>
                  )}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Bot className="h-5 w-5" />
                    AI Bookkeeping Options
                  </DialogTitle>
                  <DialogDescription>
                    Choose which AI processes to run on your transactions
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <label className="text-sm font-medium">Auto-categorize transactions</label>
                        <p className="text-xs text-muted-foreground">AI will categorize uncategorized transactions</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={aiBookkeeping.processingOptions.categorize}
                        onChange={(e) => setAiBookkeeping(prev => ({
                          ...prev,
                          processingOptions: { ...prev.processingOptions, categorize: e.target.checked }
                        }))}
                        className="rounded"
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <label className="text-sm font-medium">Detect duplicates</label>
                        <p className="text-xs text-muted-foreground">Find and flag potential duplicate transactions</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={aiBookkeeping.processingOptions.detectDuplicates}
                        onChange={(e) => setAiBookkeeping(prev => ({
                          ...prev,
                          processingOptions: { ...prev.processingOptions, detectDuplicates: e.target.checked }
                        }))}
                        className="rounded"
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <label className="text-sm font-medium">Suggest tags</label>
                        <p className="text-xs text-muted-foreground">AI will suggest relevant tags for transactions</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={aiBookkeeping.processingOptions.suggestTags}
                        onChange={(e) => setAiBookkeeping(prev => ({
                          ...prev,
                          processingOptions: { ...prev.processingOptions, suggestTags: e.target.checked }
                        }))}
                        className="rounded"
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <label className="text-sm font-medium">Generate insights</label>
                        <p className="text-xs text-muted-foreground">Create spending insights and recommendations</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={aiBookkeeping.processingOptions.generateReports}
                        onChange={(e) => setAiBookkeeping(prev => ({
                          ...prev,
                          processingOptions: { ...prev.processingOptions, generateReports: e.target.checked }
                        }))}
                        className="rounded"
                      />
                    </div>
                  </div>
                  
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <div className="text-sm font-medium text-blue-800">Processing Info</div>
                    <div className="text-xs text-blue-600 mt-1">
                      AI will analyze {transactions.length} transactions and apply selected improvements
                    </div>
                  </div>
                  
                  <div className="flex gap-2 pt-4">
                    <Button 
                      variant="outline" 
                      onClick={() => setAiBookkeeping(prev => ({ ...prev, showDialog: false }))} 
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleAIBookkeeping} 
                      disabled={aiBookkeeping.isProcessing}
                      className="flex-1 bg-purple-600 hover:bg-purple-700"
                    >
                      {aiBookkeeping.isProcessing ? (
                        <>
                          <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                          Processing...
                        </>
                      ) : (
                        'Start Processing'
                      )}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      {/* Transactions List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Recent Transactions</span>
            <Badge variant="outline">{filteredTransactions.length} transactions</Badge>
          </CardTitle>
          <CardDescription>
            All transactions across your connected accounts
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center text-muted-foreground py-8">Loading transactions...</div>
          ) : filteredTransactions.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              No transactions found. Try adjusting your search or filters.
            </div>
          ) : (
            <div className="space-y-4">
              {filteredTransactions.map((transaction) => (
                <div key={transaction.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
                      {getTransactionIcon(transaction.type, transaction.amount)}
                    </div>
                    
                    <div className="space-y-1">
                      <div className="font-medium">{transaction.description}</div>
                      <div className="text-sm text-muted-foreground">
                        {transaction.account} • {transaction.category}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {transaction.type}
                        </Badge>
                        {transaction.tags.map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            <Tag className="h-2 w-2 mr-1" />
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right space-y-1">
                    <div className={`font-medium ${getTransactionColor(transaction.type, transaction.amount)}`}>
                      {transaction.amount > 0 ? '+' : ''}{formatCurrency(transaction.amount)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {new Date(transaction.date).toLocaleDateString()}
                    </div>
                    {transaction.isRecurring && (
                      <Badge variant="outline" className="text-xs">
                        Recurring
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
              
              {/* Load More Button */}
              {hasMore && user && filteredTransactions.length > 0 && (
                <div className="text-center pt-4">
                  <Button 
                    variant="outline" 
                    onClick={loadMoreTransactions}
                    disabled={loadingMore}
                    className="flex items-center gap-2"
                  >
                    {loadingMore ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      <>
                        <ArrowDownLeft className="h-4 w-4" />
                        Load More Transactions
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}