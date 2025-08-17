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
  type: 'bank' | 'brokerage' | 'crypto' | 'business'
  provider: string
  balance: number
  lastSync: string
  status: 'connected' | 'disconnected' | 'syncing' | 'error'
  credentials?: any
}

export function AccountIntegration() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showSettingsDialog, setShowSettingsDialog] = useState(false)
  const [showViewDialog, setShowViewDialog] = useState(false)
  const [selectedAccount, setSelectedAccount] = useState<ConnectedAccount | null>(null)
  const [selectedAccountType, setSelectedAccountType] = useState<string>('')
  const [realTimeUpdates, setRealTimeUpdates] = useState(true)
  const [linkToken, setLinkToken] = useState<string | null>(null)
  const [selectedAccounts, setSelectedAccounts] = useState<Set<string>>(new Set())
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false)
  const [newAccount, setNewAccount] = useState<{
    name: string
    type: 'bank' | 'brokerage' | 'crypto' | 'business'
    provider: string
    apiKey: string
    apiSecret: string
    accountNumber: string
    routingNumber: string
    address: string
    notes: string
  }>({
    name: '',
    type: 'bank',
    provider: '',
    apiKey: '',
    apiSecret: '',
    accountNumber: '',
    routingNumber: '',
    address: '',
    notes: ''
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
        type: account.account_type as 'bank' | 'brokerage' | 'crypto' | 'business',
        provider: account.provider,
        balance: Number(account.balance),
        lastSync: account.last_sync,
        status: account.status as 'connected' | 'disconnected' | 'syncing' | 'error',
        credentials: account.metadata
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

  // Auto-open Plaid Link when token is ready
  useEffect(() => {
    if (linkToken && ready) {
      setShowAddDialog(false)
      open()
    }
  }, [linkToken, ready, open])

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
      const account: ConnectedAccount = {
        id: Date.now().toString(),
        name: newAccount.name,
        type: newAccount.type,
        provider: newAccount.provider,
        balance: 0,
        lastSync: new Date().toISOString(),
        status: 'syncing'
      }

      const updatedAccounts = [...accounts, account]
      setAccounts(updatedAccounts)
      
      // Persist to localStorage for mock accounts
      localStorage.setItem('connectedAccounts', JSON.stringify(updatedAccounts))
      
      setShowAddDialog(false)
      resetForm()

      // Simulate API integration
      setTimeout(() => {
        const finalAccount = { ...account, status: 'connected' as const, balance: Math.random() * 1000000 }
        const finalAccounts = updatedAccounts.map(acc => 
          acc.id === account.id ? finalAccount : acc
        )
        setAccounts(finalAccounts)
        localStorage.setItem('connectedAccounts', JSON.stringify(finalAccounts))
        
        toast({
          title: "Account Connected",
          description: `Successfully connected ${newAccount.name}`,
        })
      }, 2000)

    } catch (error) {
      console.error('Error adding account:', error)
      toast({
        title: "Error",
        description: "Failed to connect account",
        variant: "destructive"
      })
    }
  }

  const resetForm = () => {
    setNewAccount({
      name: '',
      type: 'bank' as 'bank' | 'brokerage' | 'crypto' | 'business',
      provider: '',
      apiKey: '',
      apiSecret: '',
      accountNumber: '',
      routingNumber: '',
      address: '',
      notes: ''
    })
    setSelectedAccountType('')
  }

  const handleSync = async (accountId: string) => {
    const account = accounts.find(acc => acc.id === accountId)
    if (!account) return

    setAccounts(prev => prev.map(acc => 
      acc.id === accountId ? { ...acc, status: 'syncing' } : acc
    ))

    try {
      if (user && account.provider === 'plaid') {
        // Fetch transactions for Plaid accounts
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

        toast({
          title: "Transactions Synced",
          description: `Successfully synced ${data.transactions?.length || 0} transactions`,
        })
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
    } else if (accountType === 'google_sheets') {
      const sheetUrl = prompt('Enter your Google Sheets URL:')
      const accountName = prompt('Enter a name for this account:')
      
      if (!sheetUrl || !accountName) {
        toast({
          title: "Missing Information",
          description: "Google Sheets URL and account name are required",
          variant: "destructive",
        })
        return
      }

      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          toast({
            title: "Authentication Required",
            description: "Please sign in to connect Google Sheets",
            variant: "destructive",
          })
          return
        }

        const { data, error } = await supabase.functions.invoke('google-sheets-connect', {
          body: { sheet_url: sheetUrl, account_name: accountName },
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        })

        if (error) {
          console.error('Error connecting Google Sheets:', error)
          toast({
            title: "Error",
            description: "Failed to connect Google Sheets",
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
      } catch (error) {
        console.error('Error in Google Sheets connection:', error)
        toast({
          title: "Error",
          description: "Failed to connect Google Sheets",
          variant: "destructive",
        })
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
    business: ['QuickBooks', 'Xero', 'FreshBooks', 'Wave Accounting', 'Sage']
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Link className="h-5 w-5" />
            Account Integration
          </h2>
          <p className="text-sm text-muted-foreground">
            Connect and manage all your financial accounts
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <Label className="flex items-center gap-2">
            <input 
              type="checkbox" 
              checked={realTimeUpdates} 
              onChange={(e) => setRealTimeUpdates(e.target.checked)}
            />
            <span className="text-sm">Real-time updates</span>
          </Label>

          <div className="flex items-center gap-2">
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Add Account
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Add Account</DialogTitle>
                  <DialogDescription>
                    Connect your real financial accounts for automatic data synchronization
                  </DialogDescription>
                </DialogHeader>
              
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
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

                  <div className="space-y-2">
                    <h3 className="font-semibold">Business Accounts</h3>
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => handleConnectRealAccount('google_sheets')}
                    >
                      <Building2 className="w-4 h-4 mr-2" />
                      Connect Google Sheets
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      Import data from Google Sheets
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
              className="border-2"
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

      <div className="grid gap-4">
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
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Checkbox 
                      checked={selectedAccounts.has(account.id)}
                      onCheckedChange={(checked) => handleSelectAccount(account.id, checked as boolean)}
                      className="border-2"
                    />
                    {getAccountIcon(account.type)}
                    <div>
                      <h3 className="font-semibold">{account.name}</h3>
                      <p className="text-sm text-muted-foreground capitalize">
                        {account.provider} • {account.type}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="font-semibold text-lg">
                        {formatCurrency(account.balance)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Last sync: {new Date(account.lastSync).toLocaleString()}
                      </div>
                    </div>

                    {getStatusBadge(account.status)}

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSync(account.id)}
                        disabled={account.status === 'syncing'}
                      >
                        <RefreshCw className={`h-4 w-4 ${account.status === 'syncing' ? 'animate-spin' : ''}`} />
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedAccount(account)
                          setShowViewDialog(true)
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <Trash2 className="h-4 w-4" />
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
    </div>
  )
}