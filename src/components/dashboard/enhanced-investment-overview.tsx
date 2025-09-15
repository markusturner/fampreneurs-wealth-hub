import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/integrations/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Wallet,
  Building2,
  Bitcoin,
  PieChart,
  AlertCircle,
  CheckCircle,
  Plus,
  Edit,
  Settings
} from 'lucide-react'
import { InvestmentChart } from './investment-chart'
import { AssetAllocation } from './asset-allocation'
import { InvestmentIntegrationDialog } from './investment-integration-dialog'

interface ConnectedAccount {
  id: string
  account_name: string
  account_type: string
  provider: string
  balance: number
  last_sync: string
  status: string
  account_subtype?: string
  investment_type?: string
  manual_balance_override?: boolean
  manual_balance_amount?: number
  day_change?: number
  day_change_percent?: number
}

export function EnhancedInvestmentOverview() {
  const { user } = useAuth()
  const [investmentAccounts, setInvestmentAccounts] = useState<ConnectedAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [showIntegrationDialog, setShowIntegrationDialog] = useState(false)

  useEffect(() => {
    if (user) {
      fetchInvestmentAccounts()
    }
  }, [user])

  const fetchInvestmentAccounts = async () => {
    if (!user?.id) {
      setLoading(false)
      return
    }
    
    try {
      const { data, error } = await supabase
        .from('connected_accounts')
        .select('*')
        .eq('user_id', user.id)
        .in('account_type', ['investment', 'brokerage'])
        .order('created_at', { ascending: false })

      if (error) throw error
      setInvestmentAccounts(data || [])
    } catch (error) {
      console.error('Error fetching investment accounts:', error)
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

  const getTotalValue = () => {
    return investmentAccounts.reduce((sum, account) => {
      const balance = account.manual_balance_override ? 
        (account.manual_balance_amount || 0) : account.balance
      return sum + balance
    }, 0)
  }

  const getTotalDayChange = () => {
    return investmentAccounts.reduce((sum, account) => sum + (account.day_change || 0), 0)
  }

  const getTotalCashBalance = () => {
    // For investment accounts, we'll consider the entire balance as investable cash if no specific cash balance is set
    return investmentAccounts
      .filter(account => account.investment_type === 'cash' || account.account_subtype === 'savings')
      .reduce((sum, account) => {
        const balance = account.manual_balance_override ? 
          (account.manual_balance_amount || 0) : account.balance
        return sum + balance
      }, 0)
  }

  const getAveragePerformance = () => {
    if (investmentAccounts.length === 0) return 0
    const totalValue = getTotalValue()
    const totalChange = getTotalDayChange()
    return totalValue > 0 ? (totalChange / totalValue) * 100 : 0
  }

  const getPlatformName = (provider: string) => {
    const platforms: { [key: string]: string } = {
      'Fidelity': 'Fidelity',
      'Charles Schwab': 'Charles Schwab',
      'Vanguard': 'Vanguard',
      'E*TRADE': 'E*TRADE',
      'Interactive Brokers': 'Interactive Brokers',
      'TD Ameritrade': 'TD Ameritrade',
      'Robinhood': 'Robinhood',
      'Webull': 'Webull'
    }
    return platforms[provider] || provider
  }

  const getPlatformIcon = (provider: string) => {
    if (provider.toLowerCase().includes('coinbase') || provider.toLowerCase().includes('crypto')) {
      return <Bitcoin className="h-4 w-4" />
    }
    return <Building2 className="h-4 w-4" />
  }

  if (loading) {
    return (
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-3">
        {[1, 2, 3].map(i => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-2">
              <div className="h-4 bg-muted rounded w-1/2"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-muted rounded w-3/4 mb-2"></div>
              <div className="h-4 bg-muted rounded w-1/2"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (investmentAccounts.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <Wallet className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">Connect Your Investment Accounts</h3>
            <p className="text-muted-foreground mb-4">
              Track all your investments in one place. Works with Fidelity, Schwab, Vanguard, E*TRADE and more.
            </p>
            <Button onClick={() => setShowIntegrationDialog(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Connect Accounts
            </Button>
          </div>
        </CardContent>
        
        <InvestmentIntegrationDialog 
          open={showIntegrationDialog}
          onOpenChange={setShowIntegrationDialog}
        />
      </Card>
    )
  }

  const totalValue = getTotalValue()
  const totalDayChange = getTotalDayChange()
  const avgPerformance = getAveragePerformance()

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Investment Value
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalValue)}</div>
            <div className={`text-xs flex items-center gap-1 ${totalDayChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {totalDayChange >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {formatCurrency(Math.abs(totalDayChange))} ({formatPercent(avgPerformance)}) today
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Cash & Equivalents
            </CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(getTotalCashBalance())}</div>
            <p className="text-xs text-muted-foreground">
              Available for investment
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Connected Accounts
            </CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{investmentAccounts.length}</div>
            <Button 
              variant="link" 
              className="p-0 h-auto text-xs text-primary"
              onClick={() => setShowIntegrationDialog(true)}
            >
              Add more accounts
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Connected Accounts List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Connected Investment Accounts
          </CardTitle>
          <CardDescription>
            All your investment accounts synced and ready
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {investmentAccounts.map((account) => {
              const dayChangePercent = account.day_change_percent || 0
              const accountBalance = account.manual_balance_override ? 
                (account.manual_balance_amount || 0) : account.balance
              
              return (
                <div key={account.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {getPlatformIcon(account.provider)}
                    <div>
                      <div className="font-medium flex items-center gap-2">
                        {getPlatformName(account.provider)}
                        {account.account_subtype && (
                          <Badge variant="secondary" className="text-xs">
                            {account.account_subtype}
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {account.account_name} • Last synced: {new Date(account.last_sync || '').toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div className="text-right flex items-center gap-2">
                    <div>
                      <div className="font-semibold">{formatCurrency(accountBalance)}</div>
                      <div className={`text-sm flex items-center gap-1 ${dayChangePercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {dayChangePercent >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                        {formatPercent(dayChangePercent)}
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <Settings className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Portfolio Performance</CardTitle>
            <CardDescription>Investment value over time</CardDescription>
          </CardHeader>
          <CardContent>
            <InvestmentChart accountsData={investmentAccounts} totalValue={totalValue} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Asset Allocation</CardTitle>
            <CardDescription>Distribution across platforms</CardDescription>
          </CardHeader>
          <CardContent>
            <AssetAllocation data={investmentAccounts.map(account => {
              const balance = account.manual_balance_override ? 
                (account.manual_balance_amount || 0) : account.balance
              return {
                name: getPlatformName(account.provider),
                value: totalValue > 0 ? (balance / totalValue) * 100 : 0,
                color: `hsl(${Math.abs(account.provider.split('').reduce((a, b) => a + b.charCodeAt(0), 0)) % 360}, 70%, 50%)`
              }
            })} />
          </CardContent>
        </Card>
      </div>

      <InvestmentIntegrationDialog 
        open={showIntegrationDialog}
        onOpenChange={setShowIntegrationDialog}
      />
    </div>
  )
}