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
  Plus
} from 'lucide-react'
import { InvestmentChart } from './investment-chart'
import { AssetAllocation } from './asset-allocation'
import { InvestmentIntegrationDialog } from './investment-integration-dialog'

interface Investment {
  id: string
  platform_id: string
  total_value: number
  cash_balance: number | null
  day_change: number | null
  day_change_percent: number | null
  positions: any
  last_updated: string | null
}

export function EnhancedInvestmentOverview() {
  const { user } = useAuth()
  const [investments, setInvestments] = useState<Investment[]>([])
  const [loading, setLoading] = useState(true)
  const [showIntegrationDialog, setShowIntegrationDialog] = useState(false)

  useEffect(() => {
    if (user) {
      fetchInvestments()
    }
  }, [user])

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

  const getTotalValue = () => {
    return investments.reduce((sum, inv) => sum + inv.total_value, 0)
  }

  const getTotalDayChange = () => {
    return investments.reduce((sum, inv) => sum + (inv.day_change || 0), 0)
  }

  const getTotalCashBalance = () => {
    return investments.reduce((sum, inv) => sum + (inv.cash_balance || 0), 0)
  }

  const getAveragePerformance = () => {
    if (investments.length === 0) return 0
    const totalValue = getTotalValue()
    const totalChange = getTotalDayChange()
    return totalValue > 0 ? (totalChange / totalValue) * 100 : 0
  }

  const getPlatformName = (platformId: string) => {
    const platforms: { [key: string]: string } = {
      'fidelity': 'Fidelity',
      'schwab': 'Charles Schwab',
      'vanguard': 'Vanguard',
      'etrade': 'E*TRADE',
      'interactive_brokers': 'Interactive Brokers',
      'alpaca': 'Alpaca Markets',
      'polygon': 'Polygon.io',
      'coinbase': 'Coinbase Pro'
    }
    return platforms[platformId] || platformId
  }

  const getPlatformIcon = (platformId: string) => {
    const iconMap: { [key: string]: any } = {
      'fidelity': Building2,
      'schwab': Building2,
      'vanguard': Building2,
      'etrade': TrendingUp,
      'interactive_brokers': Building2,
      'alpaca': TrendingUp,
      'polygon': TrendingUp,
      'coinbase': Bitcoin
    }
    const IconComponent = iconMap[platformId] || Wallet
    return <IconComponent className="h-4 w-4" />
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

  if (investments.length === 0) {
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
            <div className="text-2xl font-bold">{investments.length}</div>
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
            {investments.map((investment) => {
              const dayChangePercent = investment.day_change_percent || 0
              return (
                <div key={investment.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {getPlatformIcon(investment.platform_id)}
                    <div>
                      <div className="font-medium">{getPlatformName(investment.platform_id)}</div>
                      <div className="text-sm text-muted-foreground">
                        Last synced: {new Date(investment.last_updated || '').toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">{formatCurrency(investment.total_value)}</div>
                    <div className={`text-sm flex items-center gap-1 ${dayChangePercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {dayChangePercent >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                      {formatPercent(dayChangePercent)}
                    </div>
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
            <InvestmentChart accountsData={investments} totalValue={totalValue} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Asset Allocation</CardTitle>
            <CardDescription>Distribution across platforms</CardDescription>
          </CardHeader>
          <CardContent>
            <AssetAllocation data={investments.map(inv => ({
              name: getPlatformName(inv.platform_id),
              value: (inv.total_value / totalValue) * 100,
              color: `hsl(${Math.abs(inv.platform_id.split('').reduce((a, b) => a + b.charCodeAt(0), 0)) % 360}, 70%, 50%)`
            }))} />
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