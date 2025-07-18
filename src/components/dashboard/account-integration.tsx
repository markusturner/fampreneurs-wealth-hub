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
  Settings
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
  const [selectedAccountType, setSelectedAccountType] = useState<string>('')
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
  }, [])

  const fetchConnectedAccounts = async () => {
    try {
      // Mock data for demonstration - replace with actual API calls
      const mockAccounts: ConnectedAccount[] = [
        {
          id: '1',
          name: 'Chase Business Checking',
          type: 'bank',
          provider: 'Chase Bank',
          balance: 125000,
          lastSync: new Date().toISOString(),
          status: 'connected'
        },
        {
          id: '2',
          name: 'Fidelity Investment Account',
          type: 'brokerage',
          provider: 'Fidelity',
          balance: 850000,
          lastSync: new Date().toISOString(),
          status: 'connected'
        },
        {
          id: '3',
          name: 'Coinbase Pro',
          type: 'crypto',
          provider: 'Coinbase',
          balance: 75000,
          lastSync: new Date().toISOString(),
          status: 'syncing'
        }
      ]
      setAccounts(mockAccounts)
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

      setAccounts(prev => [...prev, account])
      setShowAddDialog(false)
      resetForm()

      // Simulate API integration
      setTimeout(() => {
        setAccounts(prev => prev.map(acc => 
          acc.id === account.id 
            ? { ...acc, status: 'connected', balance: Math.random() * 1000000 }
            : acc
        ))
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
                        {formatCurrency(account.balance)}
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
                    
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex items-center gap-1"
                    >
                      <Settings className="h-3 w-3" />
                      Settings
                    </Button>
                    
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex items-center gap-1"
                    >
                      <ExternalLink className="h-3 w-3" />
                      View
                    </Button>
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