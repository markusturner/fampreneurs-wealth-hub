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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { useToast } from '@/hooks/use-toast'
import { usePlaidLink } from 'react-plaid-link'
import { 
  Plus, 
  CreditCard, 
  TrendingUp, 
  Bitcoin, 
  Building2, 
  Wallet,
  Link,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  Settings,
  Trash2,
  Eye,
  DollarSign,
  Calendar,
  MapPin,
  X
} from 'lucide-react'

interface ConnectedAccount {
  id: string
  name: string
  type: 'bank' | 'brokerage' | 'crypto' | 'business' | 'investment'
  provider: string
  balance: number
  lastSync: string
  status: 'connected' | 'disconnected' | 'syncing' | 'error'
  credentials?: any
  // Investment-specific fields
  account_subtype?: string  // 401k, IRA, Roth_IRA, Brokerage, HSA
  investment_type?: string  // stocks, bonds, mutual_funds, etf, crypto, real_estate
  holdings?: any[]
  total_shares?: number
  avg_cost_basis?: number
  day_change?: number
  day_change_percent?: number
  manual_balance_override?: boolean
  manual_balance_amount?: number
}

export function AccountIntegration() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showSettingsDialog, setShowSettingsDialog] = useState(false)
  const [showViewDialog, setShowViewDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [selectedAccount, setSelectedAccount] = useState<ConnectedAccount | null>(null)
  const [selectedAccountType, setSelectedAccountType] = useState<string>('')
  const [realTimeUpdates, setRealTimeUpdates] = useState(true)
  const [linkToken, setLinkToken] = useState<string | null>(null)
  const [updateLinkToken, setUpdateLinkToken] = useState<string | null>(null)
  const [selectedAccounts, setSelectedAccounts] = useState<Set<string>>(new Set())
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false)
  const [newAccount, setNewAccount] = useState<{
    name: string
    type: 'bank' | 'brokerage' | 'crypto' | 'business' | 'investment'
    provider: string
    apiKey: string
    apiSecret: string
    accountNumber: string
    routingNumber: string
    address: string
    notes: string
    // Investment-specific fields
    account_subtype: string
    investment_type: string
    manual_balance_amount: string
    manual_balance_override: boolean
  }>({
    name: '',
    type: 'bank',
    provider: '',
    apiKey: '',
    apiSecret: '',
    accountNumber: '',
    routingNumber: '',
    address: '',
    notes: '',
    account_subtype: '',
    investment_type: '',
    manual_balance_amount: '',
    manual_balance_override: false
  })

  useEffect(() => {
    fetchConnectedAccounts()
    
    // Set up real-time updates simulation for mock accounts only
    if (realTimeUpdates) {
      const interval = setInterval(() => {
        setAccounts(prev => prev.map(account => ({
          ...account,
          balance: account.provider === 'mock' ? account.balance + (Math.random() - 0.5) * 1000 : account.balance,
          lastSync: new Date().toISOString()
        })))
      }, 30000)
      
      return () => clearInterval(interval)
    }
  }, [realTimeUpdates])

  const fetchConnectedAccounts = async () => {
    try {
      if (!user) {
        // Fall back to localStorage for non-authenticated users
        const deletedAccounts = JSON.parse(localStorage.getItem('deletedAccounts') || '[]')
        const savedAccounts = JSON.parse(localStorage.getItem('connectedAccounts') || '[]')
        const validAccounts = savedAccounts.filter((account: ConnectedAccount) => 
          !deletedAccounts.includes(account.id)
        )
        setAccounts(validAccounts)
        setLoading(false)
        return
      }

      // Fetch from Supabase for authenticated users
      const { data: supabaseAccounts, error } = await supabase
        .from('connected_accounts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching accounts from Supabase:', error)
        toast({
          title: "Error",
          description: "Failed to fetch connected accounts",
          variant: "destructive",
        })
        setLoading(false)
        return
      }

      // Transform Supabase data to match our interface
      const transformedAccounts: ConnectedAccount[] = supabaseAccounts.map(account => ({
        id: account.id,
        name: account.account_name,
        type: account.account_type as 'bank' | 'brokerage' | 'crypto' | 'business' | 'investment',
        provider: account.provider,
        balance: account.manual_balance_override ? Number(account.manual_balance_amount || 0) : Number(account.balance),
        lastSync: account.last_sync,
        status: account.status as 'connected' | 'disconnected' | 'syncing' | 'error',
        credentials: account.metadata,
        account_subtype: account.account_subtype,
        investment_type: account.investment_type,
        holdings: account.holdings as any[] || [],
        total_shares: Number(account.total_shares || 0),
        avg_cost_basis: Number(account.avg_cost_basis || 0),
        day_change: Number(account.day_change || 0),
        day_change_percent: Number(account.day_change_percent || 0),
        manual_balance_override: account.manual_balance_override,
        manual_balance_amount: Number(account.manual_balance_amount || 0)
      }))

      setAccounts(transformedAccounts)
    } catch (error) {
      console.error('Error fetching accounts:', error)
      setAccounts([])
    } finally {
      setLoading(false)
    }
  }

  // Plaid Link Token Creation
  const createLinkToken = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        toast({
          title: "Authentication Required",
          description: "Please sign in to connect your accounts",
          variant: "destructive",
        })
        return
      }

      const { data, error } = await supabase.functions.invoke('plaid-link-token', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      })

      if (error) {
        console.error('Error creating link token:', error)
        toast({
          title: "Error", 
          description: "Failed to initialize Plaid connection",
          variant: "destructive",
        })
        return
      }

      setLinkToken(data.link_token)
    } catch (error) {
      console.error('Error creating link token:', error)
      toast({
        title: "Error",
        description: "Failed to initialize Plaid connection",
        variant: "destructive",
      })
    }
  }

  // Plaid Link Success Handler
  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess: async (public_token: string) => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return

        const { data, error } = await supabase.functions.invoke('plaid-exchange-token', {
          body: { public_token },
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        })

        if (error) {
          console.error('Error exchanging token:', error)
          toast({
            title: "Error",
            description: "Failed to connect accounts",
            variant: "destructive",
          })
          return
        }

        toast({
          title: "Success!",
          description: data.message,
        })

        // Refresh accounts list
        await fetchConnectedAccounts()
        setShowAddDialog(false)
        setLinkToken(null)
      } catch (error) {
        console.error('Error in Plaid success handler:', error)
        toast({
          title: "Error",
          description: "Failed to save connected accounts",
          variant: "destructive",
        })
      }
    },
    onExit: () => {
      setLinkToken(null)
    },
  })

  // Auto-open Plaid Link when token is ready (new connections)
  useEffect(() => {
    if (linkToken && ready) {
      setShowAddDialog(false)
      open()
    }
  }, [linkToken, ready, open])

  // Update-mode Plaid Link for upgrading existing items
  const { open: openUpdate, ready: readyUpdate } = usePlaidLink({
    token: updateLinkToken || undefined,
    onSuccess: () => {
      toast({
        title: 'Transactions Enabled',
        description: 'Connection updated. Now click Sync to fetch transactions.',
      })
      setUpdateLinkToken(null)
    },
    onExit: () => setUpdateLinkToken(null),
  })

  useEffect(() => {
    if (updateLinkToken && readyUpdate) {
      openUpdate()
    }
  }, [updateLinkToken, readyUpdate, openUpdate])

  // Bulk selection handlers
  const handleSelectAccount = (accountId: string, checked: boolean) => {
    const newSelected = new Set(selectedAccounts)
    if (checked) {
      newSelected.add(accountId)
    } else {
      newSelected.delete(accountId)
    }
    setSelectedAccounts(newSelected)
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedAccounts(new Set(accounts.map(acc => acc.id)))
    } else {
      setSelectedAccounts(new Set())
    }
  }

  const handleBulkDelete = async () => {
    try {
      const accountIds = Array.from(selectedAccounts)
      
      if (user) {
        // Delete from Supabase for authenticated users
        const { error } = await supabase
          .from('connected_accounts')
          .delete()
          .in('id', accountIds)
          .eq('user_id', user.id)

        if (error) {
          console.error('Error deleting accounts from Supabase:', error)
          toast({
            title: "Error",
            description: "Failed to delete some accounts",
            variant: "destructive",
          })
          return
        }
      } else {
        // For mock accounts, use localStorage deletion tracking
        const deletedAccounts = JSON.parse(localStorage.getItem('deletedAccounts') || '[]')
        deletedAccounts.push(...accountIds)
        localStorage.setItem('deletedAccounts', JSON.stringify(deletedAccounts))
      }
      
      setAccounts(prev => prev.filter(acc => !selectedAccounts.has(acc.id)))
      setSelectedAccounts(new Set())
      setShowBulkDeleteDialog(false)
      
      toast({
        title: "Accounts Deleted",
        description: `Successfully deleted ${accountIds.length} account(s)`,
      })
    } catch (error) {
      console.error('Error deleting accounts:', error)
      toast({
        title: "Error",
        description: "Failed to delete accounts",
        variant: "destructive",
      })
    }
  }

  const handleUpdateAccount = async () => {
    if (!selectedAccount) return

    try {
      if (user) {
        // Update in Supabase for authenticated users
        const updateData = {
          account_name: selectedAccount.name,
          provider: selectedAccount.provider,
          account_subtype: selectedAccount.account_subtype || null,
          investment_type: selectedAccount.investment_type || null,
          manual_balance_override: selectedAccount.manual_balance_override || false,
          manual_balance_amount: selectedAccount.manual_balance_override ? 
            (selectedAccount.manual_balance_amount || 0) : null
        }

        const { error } = await supabase
          .from('connected_accounts')
          .update(updateData)
          .eq('id', selectedAccount.id)
          .eq('user_id', user.id)

        if (error) {
          console.error('Error updating account in Supabase:', error)
          toast({
            title: "Error",
            description: "Failed to update account",
            variant: "destructive"
          })
          return
        }

        // Refresh accounts list
        await fetchConnectedAccounts()
      } else {
        // Update in localStorage for non-authenticated users
        const updatedAccounts = accounts.map(acc => 
          acc.id === selectedAccount.id ? selectedAccount : acc
        )
        setAccounts(updatedAccounts)
        localStorage.setItem('connectedAccounts', JSON.stringify(updatedAccounts))
      }
      
      setShowEditDialog(false)
      setSelectedAccount(null)

      toast({
        title: "Account Updated",
        description: "Successfully updated account information",
      })

    } catch (error) {
      console.error('Error updating account:', error)
      toast({
        title: "Error",
        description: "Failed to update account",
        variant: "destructive"
      })
    }
  }

  const handleAddAccount = async () => {
    if (!newAccount.name || !newAccount.provider) {
      toast({
        title: "Error",
        description: "Please fill in required fields",
        variant: "destructive"
      })
      return
    }

    try {
      if (user) {
        // Save to Supabase for authenticated users
        const accountData = {
          user_id: user.id,
          account_name: newAccount.name,
          account_type: newAccount.type,
          provider: newAccount.provider,
          balance: 0,
          status: 'connected',
          last_sync: new Date().toISOString(),
          account_subtype: newAccount.account_subtype || null,
          investment_type: newAccount.investment_type || null,
          manual_balance_override: newAccount.manual_balance_override,
          manual_balance_amount: newAccount.manual_balance_override ? parseFloat(newAccount.manual_balance_amount) || 0 : null,
          metadata: {
            apiKey: newAccount.apiKey,
            apiSecret: newAccount.apiSecret,
            accountNumber: newAccount.accountNumber,
            routingNumber: newAccount.routingNumber,
            address: newAccount.address,
            notes: newAccount.notes
          }
        }

        const { data, error } = await supabase
          .from('connected_accounts')
          .insert(accountData)
          .select()
          .single()

        if (error) {
          console.error('Error saving account to Supabase:', error)
          toast({
            title: "Error",
            description: "Failed to save account",
            variant: "destructive"
          })
          return
        }

        // Refresh accounts list
        await fetchConnectedAccounts()
      } else {
        // Fallback to localStorage for non-authenticated users
        const account: ConnectedAccount = {
          id: Date.now().toString(),
          name: newAccount.name,
          type: newAccount.type,
          provider: newAccount.provider,
          balance: newAccount.manual_balance_override ? parseFloat(newAccount.manual_balance_amount) || 0 : 0,
          lastSync: new Date().toISOString(),
          status: 'connected',
          account_subtype: newAccount.account_subtype,
          investment_type: newAccount.investment_type,
          manual_balance_override: newAccount.manual_balance_override,
          manual_balance_amount: parseFloat(newAccount.manual_balance_amount) || 0
        }

        const updatedAccounts = [...accounts, account]
        setAccounts(updatedAccounts)
        localStorage.setItem('connectedAccounts', JSON.stringify(updatedAccounts))
      }
      
      setShowAddDialog(false)
      resetForm()

      toast({
        title: "Account Added",
        description: `Successfully added ${newAccount.name}`,
      })

    } catch (error) {
      console.error('Error adding account:', error)
      toast({
        title: "Error",
        description: "Failed to add account",
        variant: "destructive"
      })
    }
  }

  const resetForm = () => {
    setNewAccount({
      name: '',
      type: 'bank',
      provider: '',
      apiKey: '',
      apiSecret: '',
      accountNumber: '',
      routingNumber: '',
      address: '',
      notes: '',
      account_subtype: '',
      investment_type: '',
      manual_balance_amount: '',
      manual_balance_override: false
    })
    setSelectedAccountType('')
  }

  const refreshAccountData = async () => {
    if (!user) return

    setLoading(true)
    try {
      // Invoke edge function to refresh balances from Plaid, then reload from DB
      const { error } = await supabase.functions.invoke('plaid-refresh-accounts', {
        body: {}
      })

      if (error) {
        console.error('plaid-refresh-accounts error:', error)
        throw error
      }

      await fetchConnectedAccounts()

      toast({
        title: 'Accounts Refreshed',
        description: 'Latest balances pulled from your institutions',
      })
    } catch (err) {
      console.error('Refresh error:', err)
      toast({
        title: 'Refresh Failed',
        description: 'Could not refresh account balances',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSync = async (accountId: string) => {
    const account = accounts.find(acc => acc.id === accountId)
    if (!account) return

    setAccounts(prev => prev.map(acc => 
      acc.id === accountId ? { ...acc, status: 'syncing' } : acc
    ))

    try {
      if (user && account.provider === 'plaid') {
        // Refresh latest balances for this account first
        await supabase.functions.invoke('plaid-refresh-accounts', { body: { account_id: accountId } })
        await fetchConnectedAccounts()
        
        // Then fetch transactions for Plaid accounts
        const { data, error } = await supabase.functions.invoke('plaid-fetch-transactions', {
          body: { account_id: accountId },
        })

        if (error) {
          console.error('Error syncing transactions:', error)
          toast({
            title: "Sync Failed",
            description: "Failed to sync transactions",
            variant: "destructive"
          })
          
          // Revert status
          setAccounts(prev => prev.map(acc =>
            acc.id === accountId ? { ...acc, status: 'connected' } : acc
          ))
          return
        }

        // Detect environments where Transactions isn't enabled
        if ((data as any)?.skipped && (data as any)?.reason === 'INVALID_PRODUCT') {
          toast({
            title: 'Transactions not enabled',
            description: 'Enable via Settings (gear) → Enable Transactions, then sync again.',
          })
        } else {
          toast({
            title: "Transactions Synced",
            description: `Successfully synced ${(data as any)?.transactions?.length || 0} transactions`,
          })
        }
      } else {
        // Simulate sync for non-Plaid accounts
        await new Promise(resolve => setTimeout(resolve, 2000))
        toast({
          title: "Sync Complete",
          description: "Account data has been updated",
        })
      }

      // Update sync status
      setAccounts(prev => prev.map(acc => 
        acc.id === accountId 
          ? { ...acc, status: 'connected', lastSync: new Date().toISOString() }
          : acc
      ))
      
    } catch (error) {
      console.error('Error during sync:', error)
      toast({
        title: "Sync Failed",
        description: "An error occurred while syncing",
        variant: "destructive"
      })
      
      // Revert status
      setAccounts(prev => prev.map(acc =>
        acc.id === accountId ? { ...acc, status: 'connected' } : acc
      ))
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

  const getAccountIcon = (type: string) => {
    switch (type) {
      case 'bank':
        return <CreditCard className="h-5 w-5 text-green-600" />
      case 'brokerage':
        return <TrendingUp className="h-5 w-5 text-blue-600" />
      case 'crypto':
        return <Bitcoin className="h-5 w-5 text-orange-600" />
      case 'business':
        return <Building2 className="h-5 w-5 text-purple-600" />
      default:
        return <Wallet className="h-5 w-5" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'connected':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Connected</Badge>
      case 'syncing':
        return <Badge variant="outline" className="bg-blue-100 text-blue-800"><RefreshCw className="h-3 w-3 mr-1 animate-spin" />Syncing</Badge>
      case 'error':
        return <Badge variant="destructive"><AlertCircle className="h-3 w-3 mr-1" />Error</Badge>
      default:
        return <Badge variant="outline">Disconnected</Badge>
    }
  }

  const handleDeleteAccount = async (accountId: string) => {
    try {
      if (user) {
        // Delete from Supabase for authenticated users
        const { error } = await supabase
          .from('connected_accounts')
          .delete()
          .eq('id', accountId)
          .eq('user_id', user.id)

        if (error) {
          console.error('Error deleting account from Supabase:', error)
          toast({
            title: "Error",
            description: "Failed to delete account",
            variant: "destructive",
          })
          return
        }
      } else {
        // For mock accounts, use localStorage deletion tracking
        const deletedAccounts = JSON.parse(localStorage.getItem('deletedAccounts') || '[]')
        deletedAccounts.push(accountId)
        localStorage.setItem('deletedAccounts', JSON.stringify(deletedAccounts))
      }
      
      setAccounts(prev => prev.filter(acc => acc.id !== accountId))
      toast({
        title: "Account Deleted",
        description: "Account has been permanently removed from your portfolio",
      })
    } catch (error) {
      console.error('Error deleting account:', error)
      toast({
        title: "Error",
        description: "Failed to delete account",
        variant: "destructive",
      })
    }
  }
 
  // Create an update-mode link token to enable Transactions on an existing Plaid item
  const enableTransactions = async (accountId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const { data, error } = await supabase.functions.invoke('plaid-link-update-token', {
        body: { account_id: accountId },
        headers: { Authorization: `Bearer ${session.access_token}` },
      })

      if (error) {
        console.error('Error creating update link token:', error)
        toast({ title: 'Error', description: 'Failed to initialize account update', variant: 'destructive' })
        return
      }

      setUpdateLinkToken((data as any).link_token)
    } catch (err) {
      console.error('enableTransactions error:', err)
      toast({ title: 'Error', description: 'Could not start update flow', variant: 'destructive' })
    }
  }
 
   const handleConnectRealAccount = async (accountType: string) => {
    if (accountType === 'plaid') {
      if (!linkToken) {
        await createLinkToken()
      }
      // Open Plaid Link immediately if token is ready
      if (linkToken && ready) {
        setShowAddDialog(false)
        open()
      }
    } else {
      // Fallback to mock account creation
      const mockAccount: ConnectedAccount = {
        id: Date.now().toString(),
        name: `Connected ${accountType} Account`,
        type: accountType as any,
        provider: accountType === 'brokerage' ? 'Fidelity' : 'Chase Bank',
        balance: Math.random() * 1000000,
        lastSync: new Date().toISOString(),
        status: 'connected'
      }

      setAccounts(prev => [...prev, mockAccount])
      toast({
        title: "Account Connected",
        description: `Successfully connected your ${accountType} account with real-time updates`,
      })
    }
  }

  const accountProviders = {
    bank: ['Chase Bank', 'Bank of America', 'Wells Fargo', 'Citibank', 'US Bank', 'PNC Bank'],
    brokerage: ['Fidelity', 'Charles Schwab', 'Vanguard', 'E*TRADE', 'TD Ameritrade', 'Interactive Brokers'],
    crypto: ['Coinbase', 'Binance', 'Kraken', 'Gemini', 'KuCoin', 'FTX'],
    business: ['QuickBooks', 'Xero', 'FreshBooks', 'Wave Accounting', 'Sage'],
    investment: ['Fidelity', 'Charles Schwab', 'Vanguard', 'E*TRADE', 'Interactive Brokers', 'TD Ameritrade', 'Robinhood', 'Webull']
  }

  return (
    <div 
      className="space-y-4 sm:space-y-6"
      onDragOver={(e) => {
        e.preventDefault();
        e.currentTarget.classList.add('bg-muted/50', 'border-2', 'border-dashed', 'border-primary/50', 'rounded-lg');
      }}
      onDragLeave={(e) => {
        e.currentTarget.classList.remove('bg-muted/50', 'border-2', 'border-dashed', 'border-primary/50', 'rounded-lg');
      }}
      onDrop={(e) => {
        e.preventDefault();
        e.currentTarget.classList.remove('bg-muted/50', 'border-2', 'border-dashed', 'border-primary/50', 'rounded-lg');
        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0) {
          console.log('Files dropped:', files);
          // Process CSV files here
        }
      }}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg sm:text-xl font-semibold flex items-center gap-2">
            <Link className="h-4 w-4 sm:h-5 sm:w-5" />
            Account Integration
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Connect and manage all your financial accounts
          </p>
          {accounts.length > 0 && (
            <div className="mt-2 p-3 bg-muted/50 rounded-lg">
              <div className="text-sm text-muted-foreground">Total Portfolio Value</div>
              <div className="text-xl font-bold text-foreground">
                {formatCurrency(accounts.reduce((sum, account) => sum + (account.balance || 0), 0))}
              </div>
            </div>
          )}
        </div>
        
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          <Label className="flex items-center gap-2">
            <input 
              type="checkbox" 
              checked={realTimeUpdates} 
              onChange={(e) => setRealTimeUpdates(e.target.checked)}
            />
            <span className="text-xs sm:text-sm">Real-time updates</span>
          </Label>

          <div className="flex items-center gap-2">
            <Button 
              onClick={refreshAccountData}
              variant="outline"
              disabled={loading}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              <span className="text-sm">Refresh All</span>
            </Button>
            
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2 w-full sm:w-auto">
                  <Plus className="h-4 w-4" />
                  <span className="text-sm">Add Account</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Add Account</DialogTitle>
                  <DialogDescription>
                    Connect your financial accounts for automatic data synchronization
                  </DialogDescription>
                </DialogHeader>
              
                <div className="grid grid-cols-1 gap-4 py-4">
                  <div className="space-y-2">
                    <h3 className="font-semibold">Bank & Investment Accounts</h3>
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => handleConnectRealAccount('plaid')}
                      disabled={loading}
                    >
                      <Building2 className="w-4 h-4 mr-2" />
                      Connect via Plaid
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      Securely connect bank and brokerage accounts
                    </p>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-2">Manual Account Setup</h3>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="type">Account Type</Label>
                      <Select 
                        value={newAccount.type} 
                        onValueChange={(value: any) => {
                          setNewAccount(prev => ({ ...prev, type: value, provider: '' }))
                          setSelectedAccountType(value)
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="bank">Bank Account</SelectItem>
                          <SelectItem value="brokerage">Brokerage Account</SelectItem>
                          <SelectItem value="crypto">Cryptocurrency</SelectItem>
                          <SelectItem value="business">Business Account</SelectItem>
                          <SelectItem value="investment">Investment Account</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {selectedAccountType && (
                      <div className="space-y-2">
                        <Label htmlFor="provider">Provider</Label>
                        <Select 
                          value={newAccount.provider} 
                          onValueChange={(value) => setNewAccount(prev => ({ ...prev, provider: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select provider" />
                          </SelectTrigger>
                          <SelectContent>
                            {accountProviders[newAccount.type as keyof typeof accountProviders]?.map((provider) => (
                              <SelectItem key={provider} value={provider}>{provider}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    
                    <div className="space-y-2">
                      <Label htmlFor="name">Account Name</Label>
                      <Input
                        id="name"
                        value={newAccount.name}
                        onChange={(e) => setNewAccount(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="e.g., Primary Checking, Investment Portfolio"
                      />
                    </div>
                    
                    {/* Bank Account Specific Fields */}
                    {newAccount.type === 'bank' && (
                      <>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="accountNumber">Account Number</Label>
                            <Input
                              id="accountNumber"
                              value={newAccount.accountNumber}
                              onChange={(e) => setNewAccount(prev => ({ ...prev, accountNumber: e.target.value }))}
                              placeholder="****1234"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="routingNumber">Routing Number</Label>
                            <Input
                              id="routingNumber"
                              value={newAccount.routingNumber}
                              onChange={(e) => setNewAccount(prev => ({ ...prev, routingNumber: e.target.value }))}
                              placeholder="123456789"
                            />
                          </div>
                        </div>
                      </>
                    )}
                    
                    {/* Brokerage Account Specific Fields */}
                    {newAccount.type === 'brokerage' && (
                      <>
                        <div className="space-y-2">
                          <Label htmlFor="accountNumber">Account Number</Label>
                          <Input
                            id="accountNumber"
                            value={newAccount.accountNumber}
                            onChange={(e) => setNewAccount(prev => ({ ...prev, accountNumber: e.target.value }))}
                            placeholder="Enter brokerage account number"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="apiKey">API Key (Optional)</Label>
                            <Input
                              id="apiKey"
                              type="password"
                              value={newAccount.apiKey}
                              onChange={(e) => setNewAccount(prev => ({ ...prev, apiKey: e.target.value }))}
                              placeholder="Enter API key if available"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="apiSecret">API Secret (Optional)</Label>
                            <Input
                              id="apiSecret"
                              type="password"
                              value={newAccount.apiSecret}
                              onChange={(e) => setNewAccount(prev => ({ ...prev, apiSecret: e.target.value }))}
                              placeholder="Enter API secret if available"
                            />
                          </div>
                        </div>
                      </>
                    )}
                    
                    {/* Crypto Account Specific Fields */}
                    {newAccount.type === 'crypto' && (
                      <>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="apiKey">API Key</Label>
                            <Input
                              id="apiKey"
                              type="password"
                              value={newAccount.apiKey}
                              onChange={(e) => setNewAccount(prev => ({ ...prev, apiKey: e.target.value }))}
                              placeholder="Enter API key"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="apiSecret">API Secret</Label>
                            <Input
                              id="apiSecret"
                              type="password"
                              value={newAccount.apiSecret}
                              onChange={(e) => setNewAccount(prev => ({ ...prev, apiSecret: e.target.value }))}
                              placeholder="Enter API secret"
                            />
                          </div>
                        </div>
                      </>
                    )}
                    
                    {/* Business Account Specific Fields */}
                    {newAccount.type === 'business' && (
                      <>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="accountNumber">Account Number</Label>
                            <Input
                              id="accountNumber"
                              value={newAccount.accountNumber}
                              onChange={(e) => setNewAccount(prev => ({ ...prev, accountNumber: e.target.value }))}
                              placeholder="Business account number"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="routingNumber">Routing Number</Label>
                            <Input
                              id="routingNumber"
                              value={newAccount.routingNumber}
                              onChange={(e) => setNewAccount(prev => ({ ...prev, routingNumber: e.target.value }))}
                              placeholder="Business routing number"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="address">Business Address</Label>
                          <Input
                            id="address"
                            value={newAccount.address}
                            onChange={(e) => setNewAccount(prev => ({ ...prev, address: e.target.value }))}
                            placeholder="Business address"
                          />
                        </div>
                      </>
                    )}
                    
                    {/* Investment Account Specific Fields */}
                    {newAccount.type === 'investment' && (
                      <>
                        <div className="space-y-2">
                          <Label htmlFor="accountSubtype">Account Subtype</Label>
                          <Select 
                            value={newAccount.account_subtype} 
                            onValueChange={(value) => setNewAccount(prev => ({ ...prev, account_subtype: value }))}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select account subtype" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="401k">401(k)</SelectItem>
                              <SelectItem value="IRA">Traditional IRA</SelectItem>
                              <SelectItem value="Roth_IRA">Roth IRA</SelectItem>
                              <SelectItem value="Brokerage">Taxable Brokerage</SelectItem>
                              <SelectItem value="HSA">HSA</SelectItem>
                              <SelectItem value="529">529 Education</SelectItem>
                              <SelectItem value="Trust">Trust Account</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="investmentType">Investment Type</Label>
                          <Select 
                            value={newAccount.investment_type} 
                            onValueChange={(value) => setNewAccount(prev => ({ ...prev, investment_type: value }))}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select investment type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="stocks">Stocks</SelectItem>
                              <SelectItem value="bonds">Bonds</SelectItem>
                              <SelectItem value="mutual_funds">Mutual Funds</SelectItem>
                              <SelectItem value="etf">ETFs</SelectItem>
                              <SelectItem value="crypto">Cryptocurrency</SelectItem>
                              <SelectItem value="real_estate">Real Estate</SelectItem>
                              <SelectItem value="mixed">Mixed Portfolio</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <Checkbox 
                              id="manualBalance"
                              checked={newAccount.manual_balance_override}
                              onCheckedChange={(checked) => setNewAccount(prev => ({ ...prev, manual_balance_override: checked as boolean }))}
                            />
                            <Label htmlFor="manualBalance">Enter balance manually</Label>
                          </div>
                        </div>

                        {newAccount.manual_balance_override && (
                          <div className="space-y-2">
                            <Label htmlFor="manualBalanceAmount">Account Balance</Label>
                            <Input
                              id="manualBalanceAmount"
                              type="number"
                              value={newAccount.manual_balance_amount}
                              onChange={(e) => setNewAccount(prev => ({ ...prev, manual_balance_amount: e.target.value }))}
                              placeholder="0.00"
                            />
                          </div>
                        )}

                        <div className="space-y-2">
                          <Label htmlFor="accountNumber">Account Number (Optional)</Label>
                          <Input
                            id="accountNumber"
                            value={newAccount.accountNumber}
                            onChange={(e) => setNewAccount(prev => ({ ...prev, accountNumber: e.target.value }))}
                            placeholder="Enter account number"
                          />
                        </div>
                      </>
                    )}
                    
                    {/* Notes field for all account types */}
                    <div className="space-y-2">
                      <Label htmlFor="notes">Notes (Optional)</Label>
                      <Input
                        id="notes"
                        value={newAccount.notes}
                        onChange={(e) => setNewAccount(prev => ({ ...prev, notes: e.target.value }))}
                        placeholder="Additional notes about this account"
                      />
                    </div>
                    
                    <div className="flex gap-2 pt-4">
                      <Button variant="outline" onClick={() => { setShowAddDialog(false); resetForm() }} className="flex-1">
                        Cancel
                      </Button>
                      <Button onClick={handleAddAccount} className="flex-1">
                        Connect Account
                      </Button>
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            
            {selectedAccounts.size > 0 && (
              <AlertDialog open={showBulkDeleteDialog} onOpenChange={setShowBulkDeleteDialog}>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="flex items-center gap-2">
                    <Trash2 className="h-4 w-4" />
                    Delete Selected ({selectedAccounts.size})
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Selected Accounts</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete {selectedAccounts.size} selected account(s)? This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleBulkDelete}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Delete {selectedAccounts.size} Account(s)
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>
      </div>

      {/* Bulk Selection Controls */}
      {accounts.length > 0 && (
        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-2">
            <Checkbox 
              checked={selectedAccounts.size === accounts.length}
              onCheckedChange={handleSelectAll}
              className={`border-2 border-white ${selectedAccounts.size === accounts.length && accounts.length > 0 ? 'data-[state=checked]:bg-[#ffb500] data-[state=checked]:border-[#ffb500] data-[state=checked]:text-[#290a52]' : ''}`}
            />
            <span className="text-sm font-medium">
              {selectedAccounts.size > 0 ? `${selectedAccounts.size} selected` : 'Select all'}
            </span>
          </div>
          
          {selectedAccounts.size > 0 && (
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setSelectedAccounts(new Set())}
              >
                <X className="h-4 w-4 mr-1" />
                Clear
              </Button>
            </div>
          )}
        </div>
      )}

      <div 
        className="grid gap-4"
        onDragOver={(e) => {
          e.preventDefault();
          e.currentTarget.classList.add('bg-muted/50', 'border-2', 'border-dashed', 'border-primary/50');
        }}
        onDragLeave={(e) => {
          e.currentTarget.classList.remove('bg-muted/50', 'border-2', 'border-dashed', 'border-primary/50');
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.currentTarget.classList.remove('bg-muted/50', 'border-2', 'border-dashed', 'border-primary/50');
          const files = Array.from(e.dataTransfer.files);
          if (files.length > 0) {
            // Handle file drop - you can process the files here
            console.log('Files dropped:', files);
          }
        }}
      >
        {loading ? (
          <Card>
            <CardContent className="p-6">
              <div className="text-center text-muted-foreground">Loading accounts...</div>
            </CardContent>
          </Card>
        ) : accounts.length === 0 ? (
          <Card>
            <CardContent className="p-6">
              <div className="text-center text-muted-foreground">
                No accounts connected yet. Click "Add Account" to get started.
              </div>
            </CardContent>
          </Card>
        ) : (
          accounts.map((account) => (
            <Card key={account.id} className={selectedAccounts.has(account.id) ? 'ring-2 ring-primary' : ''}>
              <CardContent className="p-4 sm:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  {/* Left section - Account info */}
                  <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                    <Checkbox 
                      checked={selectedAccounts.has(account.id)}
                      onCheckedChange={(checked) => handleSelectAccount(account.id, checked as boolean)}
                      className={`border-2 border-white flex-shrink-0 ${selectedAccounts.has(account.id) ? 'data-[state=checked]:bg-[#ffb500] data-[state=checked]:border-[#ffb500] data-[state=checked]:text-[#290a52]' : ''}`}
                    />
                    {getAccountIcon(account.type)}
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-sm sm:text-base truncate">{account.name}</h3>
                      <p className="text-xs sm:text-sm text-muted-foreground capitalize truncate">
                        {account.provider} • {account.type}
                      </p>
                    </div>
                  </div>

                  {/* Right section - Balance, status, and actions */}
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                    {/* Balance and status */}
                    <div className="flex justify-between items-center sm:flex-col sm:items-end sm:text-right">
                      <div>
                        <div className="font-semibold text-base sm:text-lg">
                          {formatCurrency(account.balance)}
                        </div>
                        <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                          Last sync: {new Date(account.lastSync).toLocaleString()}
                        </div>
                      </div>
                      <div className="sm:mt-2">
                        {getStatusBadge(account.status)}
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-1.5 sm:gap-2 flex-wrap sm:flex-nowrap">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSync(account.id)}
                        disabled={account.status === 'syncing'}
                        className="flex-1 sm:flex-none"
                        title="Sync account"
                      >
                        <RefreshCw className={`h-3 w-3 sm:h-4 sm:w-4 ${account.status === 'syncing' ? 'animate-spin' : ''}`} />
                      </Button>

                      {account.provider === 'plaid' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => enableTransactions(account.id)}
                          title="Enable Plaid Transactions for this account"
                          className="flex-1 sm:flex-none"
                        >
                          <Settings className="h-3 w-3 sm:h-4 sm:w-4" />
                        </Button>
                      )}

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedAccount(account)
                          setShowEditDialog(true)
                        }}
                        title="Edit account"
                        className="flex-1 sm:flex-none"
                      >
                        <Settings className="h-3 w-3 sm:h-4 sm:w-4" />
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedAccount(account)
                          setShowViewDialog(true)
                        }}
                        title="View details"
                        className="flex-1 sm:flex-none"
                      >
                        <Eye className="h-3 w-3 sm:h-4 sm:w-4" />
                      </Button>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm"
                            title="Delete account"
                            className="flex-1 sm:flex-none"
                          >
                            <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Account</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{account.name}"? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteAccount(account.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Account Details Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Account Details</DialogTitle>
          </DialogHeader>
          
          {selectedAccount && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                {getAccountIcon(selectedAccount.type)}
                <div>
                  <h3 className="font-semibold">{selectedAccount.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedAccount.provider} • {selectedAccount.type}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Balance:</span>
                  <span className="text-sm">{formatCurrency(selectedAccount.balance)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Status:</span>
                  <span className="text-sm">{getStatusBadge(selectedAccount.status)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Last Sync:</span>
                  <span className="text-sm">{new Date(selectedAccount.lastSync).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Account ID:</span>
                  <span className="text-sm font-mono">{selectedAccount.id.slice(0, 8)}...</span>
                </div>
                {selectedAccount.account_subtype && (
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Account Type:</span>
                    <span className="text-sm">{selectedAccount.account_subtype}</span>
                  </div>
                )}
                {selectedAccount.investment_type && (
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Investment Type:</span>
                    <span className="text-sm capitalize">{selectedAccount.investment_type.replace('_', ' ')}</span>
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowViewDialog(false)}
                  className="flex-1"
                >
                  Close
                </Button>
                <Button
                  onClick={() => {
                    handleSync(selectedAccount.id)
                    setShowViewDialog(false)
                  }}
                  className="flex-1"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Sync Now
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Account Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Account</DialogTitle>
            <DialogDescription>
              Update your account information
            </DialogDescription>
          </DialogHeader>
          
          {selectedAccount && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Account Name</Label>
                <Input
                  id="edit-name"
                  value={selectedAccount.name}
                  onChange={(e) => setSelectedAccount(prev => prev ? { ...prev, name: e.target.value } : null)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-provider">Provider</Label>
                <Input
                  id="edit-provider"
                  value={selectedAccount.provider}
                  onChange={(e) => setSelectedAccount(prev => prev ? { ...prev, provider: e.target.value } : null)}
                />
              </div>

              {(selectedAccount.type === 'investment' || selectedAccount.type === 'brokerage') && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="edit-subtype">Account Subtype</Label>
                    <Select 
                      value={selectedAccount.account_subtype || ''} 
                      onValueChange={(value) => setSelectedAccount(prev => prev ? { ...prev, account_subtype: value } : null)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select account subtype" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="401k">401(k)</SelectItem>
                        <SelectItem value="IRA">Traditional IRA</SelectItem>
                        <SelectItem value="Roth_IRA">Roth IRA</SelectItem>
                        <SelectItem value="Brokerage">Taxable Brokerage</SelectItem>
                        <SelectItem value="HSA">HSA</SelectItem>
                        <SelectItem value="529">529 Education</SelectItem>
                        <SelectItem value="Trust">Trust Account</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-investment-type">Investment Type</Label>
                    <Select 
                      value={selectedAccount.investment_type || ''} 
                      onValueChange={(value) => setSelectedAccount(prev => prev ? { ...prev, investment_type: value } : null)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select investment type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="stocks">Stocks</SelectItem>
                        <SelectItem value="bonds">Bonds</SelectItem>
                        <SelectItem value="mutual_funds">Mutual Funds</SelectItem>
                        <SelectItem value="etf">ETFs</SelectItem>
                        <SelectItem value="crypto">Cryptocurrency</SelectItem>
                        <SelectItem value="real_estate">Real Estate</SelectItem>
                        <SelectItem value="mixed">Mixed Portfolio</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="edit-manual-balance"
                        checked={selectedAccount.manual_balance_override || false}
                        onCheckedChange={(checked) => setSelectedAccount(prev => prev ? { 
                          ...prev, 
                          manual_balance_override: checked as boolean 
                        } : null)}
                      />
                      <Label htmlFor="edit-manual-balance">Override with manual balance</Label>
                    </div>
                  </div>

                  {selectedAccount.manual_balance_override && (
                    <div className="space-y-2">
                      <Label htmlFor="edit-manual-amount">Manual Balance Amount</Label>
                      <Input
                        id="edit-manual-amount"
                        type="number"
                        value={selectedAccount.manual_balance_amount || 0}
                        onChange={(e) => setSelectedAccount(prev => prev ? { 
                          ...prev, 
                          manual_balance_amount: parseFloat(e.target.value) || 0 
                        } : null)}
                        placeholder="0.00"
                      />
                    </div>
                  )}
                </>
              )}

              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowEditDialog(false)
                    setSelectedAccount(null)
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => handleUpdateAccount()}
                  className="flex-1"
                >
                  Save Changes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
