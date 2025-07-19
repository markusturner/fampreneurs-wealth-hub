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
import { useToast } from '@/hooks/use-toast'
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
  MapPin
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
    
    // Set up real-time updates simulation
    if (realTimeUpdates) {
      const interval = setInterval(() => {
        setAccounts(prev => prev.map(account => ({
          ...account,
          balance: account.balance + (Math.random() - 0.5) * 1000, // Simulate market fluctuations
          lastSync: new Date().toISOString()
        })))
      }, 30000) // Update every 30 seconds
      
      return () => clearInterval(interval)
    }
  }, [realTimeUpdates])

  const fetchConnectedAccounts = async () => {
    try {
      // Get persistent data from localStorage or Supabase
      const deletedAccounts = JSON.parse(localStorage.getItem('deletedAccounts') || '[]')
      const savedAccounts = JSON.parse(localStorage.getItem('connectedAccounts') || '[]')
      
      // Only show saved accounts that haven't been deleted
      const validAccounts = savedAccounts.filter((account: ConnectedAccount) => 
        !deletedAccounts.includes(account.id)
      )
      
      setAccounts(validAccounts)
    } catch (error) {
      console.error('Error fetching accounts:', error)
    } finally {
      setLoading(false)
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
      
      // Persist to localStorage
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
    setAccounts(prev => prev.map(acc => 
      acc.id === accountId ? { ...acc, status: 'syncing' } : acc
    ))

    // Simulate sync
    setTimeout(() => {
      setAccounts(prev => prev.map(acc => 
        acc.id === accountId 
          ? { ...acc, status: 'connected', lastSync: new Date().toISOString() }
          : acc
      ))
      toast({
        title: "Sync Complete",
        description: "Account data has been updated",
      })
    }, 2000)
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
    // Create a persistent deletion by storing in localStorage
    const deletedAccounts = JSON.parse(localStorage.getItem('deletedAccounts') || '[]')
    deletedAccounts.push(accountId)
    localStorage.setItem('deletedAccounts', JSON.stringify(deletedAccounts))
    
    setAccounts(prev => prev.filter(acc => acc.id !== accountId))
    toast({
      title: "Account Deleted",
      description: "Account has been permanently removed from your portfolio",
    })
  }

  const handleConnectRealAccount = async (accountType: string) => {
    // Simulate real account connection (in production, this would use Plaid, Yodlee, etc.)
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
        </div>
        
        
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Account
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Connect New Account</DialogTitle>
              <DialogDescription>
                Add a new financial account to your family office
              </DialogDescription>
            </DialogHeader>
            
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
              
              {newAccount.type === 'crypto' && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="address">Wallet Address (Optional)</Label>
                    <Input
                      id="address"
                      value={newAccount.address}
                      onChange={(e) => setNewAccount(prev => ({ ...prev, address: e.target.value }))}
                      placeholder="Enter wallet address"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="apiKey">API Key (Optional)</Label>
                    <Input
                      id="apiKey"
                      type="password"
                      value={newAccount.apiKey}
                      onChange={(e) => setNewAccount(prev => ({ ...prev, apiKey: e.target.value }))}
                      placeholder="Enter API key for automatic sync"
                    />
                  </div>
                </>
              )}
              
              {newAccount.type === 'brokerage' && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="accountNumber">Account Number</Label>
                    <Input
                      id="accountNumber"
                      value={newAccount.accountNumber}
                      onChange={(e) => setNewAccount(prev => ({ ...prev, accountNumber: e.target.value }))}
                      placeholder="Account number"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="apiKey">API Key (Optional)</Label>
                    <Input
                      id="apiKey"
                      type="password"
                      value={newAccount.apiKey}
                      onChange={(e) => setNewAccount(prev => ({ ...prev, apiKey: e.target.value }))}
                      placeholder="API key for automatic sync"
                    />
                  </div>
                </>
              )}
              
              {newAccount.type === 'bank' && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="accountNumber">Account Number</Label>
                    <Input
                      id="accountNumber"
                      value={newAccount.accountNumber}
                      onChange={(e) => setNewAccount(prev => ({ ...prev, accountNumber: e.target.value }))}
                      placeholder="Account number"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="routingNumber">Routing Number</Label>
                    <Input
                      id="routingNumber"
                      value={newAccount.routingNumber}
                      onChange={(e) => setNewAccount(prev => ({ ...prev, routingNumber: e.target.value }))}
                      placeholder="Routing number"
                    />
                  </div>
                </>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Input
                  id="notes"
                  value={newAccount.notes}
                  onChange={(e) => setNewAccount(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Additional notes"
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
          </DialogContent>
        </Dialog>
      </div>

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
            <Card key={account.id}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center">
                      {getAccountIcon(account.type)}
                    </div>
                    
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{account.name}</h3>
                        {getStatusBadge(account.status)}
                      </div>
                      
                      <div className="text-sm text-muted-foreground">
                        {account.provider} • {account.type}
                      </div>
                      
                      <div className="text-lg font-semibold">
                        ${formatCurrency(account.balance).replace('$', '')}
                      </div>
                      
                      <div className="text-xs text-muted-foreground">
                        Last sync: {new Date(account.lastSync).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleSync(account.id)}
                      disabled={account.status === 'syncing'}
                      className="flex items-center gap-1"
                    >
                      <RefreshCw className={`h-3 w-3 ${account.status === 'syncing' ? 'animate-spin' : ''}`} />
                      Sync
                    </Button>
                    
                    <Dialog open={showSettingsDialog && selectedAccount?.id === account.id} onOpenChange={(open) => {
                      setShowSettingsDialog(open)
                      if (!open) setSelectedAccount(null)
                    }}>
                      <DialogTrigger asChild>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex items-center gap-1"
                          onClick={() => setSelectedAccount(account)}
                        >
                          <Settings className="h-3 w-3" />
                          Settings
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Account Settings - {account.name}</DialogTitle>
                          <DialogDescription>
                            Manage your account preferences and connection settings
                          </DialogDescription>
                        </DialogHeader>
                        
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label>Account Name</Label>
                            <Input defaultValue={account.name} />
                          </div>
                          
                          <div className="space-y-2">
                            <Label>Provider</Label>
                            <Input defaultValue={account.provider} disabled />
                          </div>
                          
                          <div className="space-y-2">
                            <Label>Account Type</Label>
                            <Input defaultValue={account.type} disabled />
                          </div>
                          
                          <div className="space-y-2">
                            <Label>Auto-sync Frequency</Label>
                            <Select defaultValue="15min">
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="1min">Every minute</SelectItem>
                                <SelectItem value="5min">Every 5 minutes</SelectItem>
                                <SelectItem value="15min">Every 15 minutes</SelectItem>
                                <SelectItem value="1hour">Every hour</SelectItem>
                                <SelectItem value="manual">Manual only</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <input type="checkbox" defaultChecked />
                            <Label>Enable real-time notifications</Label>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <input type="checkbox" defaultChecked />
                            <Label>Include in portfolio calculations</Label>
                          </div>
                          
                          <div className="flex gap-2 pt-4">
                            <Button variant="outline" onClick={() => setShowSettingsDialog(false)} className="flex-1">
                              Cancel
                            </Button>
                            <Button onClick={() => {
                              setShowSettingsDialog(false)
                              toast({ title: "Settings Updated", description: "Account settings have been saved" })
                            }} className="flex-1">
                              Save Changes
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                    
                    <Dialog open={showViewDialog && selectedAccount?.id === account.id} onOpenChange={(open) => {
                      setShowViewDialog(open)
                      if (!open) setSelectedAccount(null)
                    }}>
                      <DialogTrigger asChild>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex items-center gap-1"
                          onClick={() => setSelectedAccount(account)}
                        >
                          <Eye className="h-3 w-3" />
                          View
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>Account Details - {account.name}</DialogTitle>
                          <DialogDescription>
                            Detailed information and transaction history
                          </DialogDescription>
                        </DialogHeader>
                        
                        <div className="space-y-6">
                          {/* Account Overview */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="text-center p-4 border rounded-lg">
                              <DollarSign className="h-8 w-8 mx-auto mb-2 text-green-600" />
                              <div className="text-lg font-bold">{formatCurrency(account.balance)}</div>
                              <div className="text-xs text-muted-foreground">Current Balance</div>
                            </div>
                            
                            <div className="text-center p-4 border rounded-lg">
                              <TrendingUp className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                              <div className="text-lg font-bold">+2.4%</div>
                              <div className="text-xs text-muted-foreground">30-Day Return</div>
                            </div>
                            
                            <div className="text-center p-4 border rounded-lg">
                              <Calendar className="h-8 w-8 mx-auto mb-2 text-purple-600" />
                              <div className="text-lg font-bold">24 days</div>
                              <div className="text-xs text-muted-foreground">Connected</div>
                            </div>
                            
                            <div className="text-center p-4 border rounded-lg">
                              <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-600" />
                              <div className="text-lg font-bold">Active</div>
                              <div className="text-xs text-muted-foreground">Status</div>
                            </div>
                          </div>
                          
                          {/* Recent Transactions */}
                          <div>
                            <h4 className="font-semibold mb-3">Recent Transactions</h4>
                            <div className="space-y-2 max-h-40 overflow-y-auto">
                              {[
                                { date: '2024-01-15', description: 'Market Purchase - AAPL', amount: -2500 },
                                { date: '2024-01-14', description: 'Dividend Payment', amount: 150 },
                                { date: '2024-01-12', description: 'Market Sale - TSLA', amount: 3200 },
                                { date: '2024-01-10', description: 'Interest Payment', amount: 45 }
                              ].map((transaction, index) => (
                                <div key={index} className="flex justify-between items-center p-2 border rounded">
                                  <div>
                                    <div className="font-medium text-sm">{transaction.description}</div>
                                    <div className="text-xs text-muted-foreground">{transaction.date}</div>
                                  </div>
                                  <div className={`font-medium ${transaction.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {transaction.amount > 0 ? '+' : ''}{formatCurrency(transaction.amount)}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                          
                          <Button onClick={() => setShowViewDialog(false)} className="w-full">
                            Close
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                    
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex items-center gap-1 text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-3 w-3" />
                          Delete
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Account Connection</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to remove "{account.name}" from your connected accounts? 
                            This action cannot be undone and you'll need to reconnect the account manually.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={() => handleDeleteAccount(account.id)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Delete Account
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}