import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/integrations/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Slider } from '@/components/ui/slider'
import { useToast } from '@/hooks/use-toast'
import { 
  Plus, 
  TrendingUp, 
  TrendingDown, 
  Target, 
  PieChart, 
  BarChart3,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  BrainCircuit,
  Edit,
  Trash2,
  Wallet,
  RefreshCw
} from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'

interface ProfitFirstAccount {
  id: string
  name: string
  targetPercentage: number
  currentPercentage: number
  targetAmount: number
  currentAmount: number
  color: string
  isCustom: boolean
}

interface MonthlyTrend {
  month: string
  revenue: number
  profit: number
  ownersPay: number
  tax: number
  opex: number
}

export function BudgetingAnalytics() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [profitFirstAccounts, setProfitFirstAccounts] = useState<ProfitFirstAccount[]>([])
  const [bankAccounts, setBankAccounts] = useState<any[]>([])
  const [monthlyRevenue, setMonthlyRevenue] = useState<number>(0)
  const [showSetupDialog, setShowSetupDialog] = useState(false)
  const [showRevenueDialog, setShowRevenueDialog] = useState(false)
  const [loading, setLoading] = useState(true)
  const [isOperational, setIsOperational] = useState(false)
  const [monthlyTrends, setMonthlyTrends] = useState<MonthlyTrend[]>([])
  const [revenueInput, setRevenueInput] = useState('')

  useEffect(() => {
    checkDataAvailabilityAndFetchAccounts()
  }, [user])

  // Load Profit First data from localStorage
  useEffect(() => {
    if (user) {
      const savedAccounts = localStorage.getItem(`profit_first_${user.id}`)
      const savedRevenue = localStorage.getItem(`monthly_revenue_${user.id}`)
      const savedOperational = localStorage.getItem(`operational_${user.id}`)
      
      if (savedAccounts) {
        setProfitFirstAccounts(JSON.parse(savedAccounts))
      } else {
        // Initialize default Profit First accounts
        initializeDefaultAccounts()
      }
      
      if (savedRevenue) {
        setMonthlyRevenue(parseFloat(savedRevenue))
      }
      
      if (savedOperational === 'true') {
        setIsOperational(true)
      }
    }
  }, [user])

  // Save Profit First data to localStorage
  useEffect(() => {
    if (user && profitFirstAccounts.length > 0) {
      localStorage.setItem(`profit_first_${user.id}`, JSON.stringify(profitFirstAccounts))
    }
  }, [profitFirstAccounts, user])

  useEffect(() => {
    if (user && monthlyRevenue > 0) {
      localStorage.setItem(`monthly_revenue_${user.id}`, monthlyRevenue.toString())
    }
  }, [monthlyRevenue, user])

  useEffect(() => {
    if (user) {
      localStorage.setItem(`operational_${user.id}`, isOperational.toString())
    }
  }, [isOperational, user])

  const initializeDefaultAccounts = () => {
    const defaultAccounts: ProfitFirstAccount[] = [
      {
        id: 'profit',
        name: 'Profit Account',
        targetPercentage: 5,
        currentPercentage: 0,
        targetAmount: 0,
        currentAmount: 0,
        color: '#22c55e',
        isCustom: false
      },
      {
        id: 'owners-pay',
        name: "Owner's Pay",
        targetPercentage: 50,
        currentPercentage: 0,
        targetAmount: 0,
        currentAmount: 0,
        color: '#3b82f6',
        isCustom: false
      },
      {
        id: 'tax',
        name: 'Tax Account',
        targetPercentage: 15,
        currentPercentage: 0,
        targetAmount: 0,
        currentAmount: 0,
        color: '#ef4444',
        isCustom: false
      },
      {
        id: 'opex',
        name: 'Operating Expenses',
        targetPercentage: 30,
        currentPercentage: 0,
        targetAmount: 0,
        currentAmount: 0,
        color: '#f59e0b',
        isCustom: false
      }
    ]
    setProfitFirstAccounts(defaultAccounts)
  }

  const checkDataAvailabilityAndFetchAccounts = async () => {
    try {
      setLoading(true)
      
      if (!user) {
        setIsOperational(false)
        return
      }
      
      // Fetch only bank accounts (not investment accounts)
      const { data: accounts, error: accountsError } = await supabase
        .from('connected_accounts')
        .select('*')
        .eq('user_id', user.id)
        .eq('account_type', 'bank')

      if (!accountsError && accounts) {
        setBankAccounts(accounts)
        setIsOperational(accounts.length > 0)
        
        // Generate monthly trends from account data
        if (accounts.length > 0) {
          generateMonthlyTrends(accounts)
        }
      } else {
        setBankAccounts([])
        setIsOperational(false)
      }
    } catch (error) {
      console.error('Error checking data availability:', error)
      setBankAccounts([])
      setIsOperational(false)
    } finally {
      setLoading(false)
    }
  }

  const generateMonthlyTrends = (accounts: any[]) => {
    // Generate mock monthly trends based on account balances
    // In real implementation, this would analyze transaction history
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const currentMonth = new Date().getMonth()
    
    const trends: MonthlyTrend[] = months.slice(0, currentMonth + 1).map((month, index) => {
      const baseRevenue = monthlyRevenue || 10000
      const variation = Math.random() * 0.3 - 0.15 // ±15% variation
      const revenue = baseRevenue * (1 + variation)
      
      return {
        month,
        revenue,
        profit: revenue * 0.05,
        ownersPay: revenue * 0.50,
        tax: revenue * 0.15,
        opex: revenue * 0.30
      }
    })
    
    setMonthlyTrends(trends)
  }

  const updateAccountPercentage = (accountId: string, percentage: number) => {
    setProfitFirstAccounts(prev => prev.map(account => 
      account.id === accountId 
        ? { 
            ...account, 
            targetPercentage: percentage,
            targetAmount: monthlyRevenue * (percentage / 100)
          }
        : account
    ))
  }

  const allocateRevenue = async () => {
    if (!monthlyRevenue || monthlyRevenue <= 0) {
      toast({
        title: "Error",
        description: "Please set your monthly revenue first",
        variant: "destructive"
      })
      return
    }

    const totalPercentage = profitFirstAccounts.reduce((sum, account) => sum + account.targetPercentage, 0)
    
    if (totalPercentage !== 100) {
      toast({
        title: "Error",
        description: `Percentages must add up to 100%. Current total: ${totalPercentage}%`,
        variant: "destructive"
      })
      return
    }

    // Update current amounts based on revenue allocation
    setProfitFirstAccounts(prev => prev.map(account => ({
      ...account,
      targetAmount: monthlyRevenue * (account.targetPercentage / 100),
      currentAmount: monthlyRevenue * (account.targetPercentage / 100),
      currentPercentage: account.targetPercentage
    })))

    // Update monthly trends
    generateMonthlyTrends(bankAccounts)

    toast({
      title: "Revenue Allocated",
      description: `Successfully allocated ${formatCurrency(monthlyRevenue)} across your Profit First accounts`,
    })
  }

  const handleRevenueInput = () => {
    const revenue = parseFloat(revenueInput)
    if (isNaN(revenue) || revenue <= 0) {
      toast({
        title: "Error",
        description: "Please enter a valid revenue amount",
        variant: "destructive"
      })
      return
    }

    setMonthlyRevenue(revenue)
    
    // Update target amounts for all accounts
    setProfitFirstAccounts(prev => prev.map(account => ({
      ...account,
      targetAmount: revenue * (account.targetPercentage / 100)
    })))

    generateMonthlyTrends(bankAccounts)
    setShowRevenueDialog(false)
    setRevenueInput('')

    toast({
      title: "Revenue Updated",
      description: `Monthly revenue set to ${formatCurrency(revenue)}`,
    })
  }

  const resetPercentages = () => {
    setProfitFirstAccounts(prev => prev.map(account => {
      const defaultPercentages: Record<string, number> = {
        'profit': 5,
        'owners-pay': 50,
        'tax': 15,
        'opex': 30
      }
      
      return {
        ...account,
        targetPercentage: defaultPercentages[account.id] || account.targetPercentage,
        targetAmount: monthlyRevenue * ((defaultPercentages[account.id] || account.targetPercentage) / 100)
      }
    }))

    toast({
      title: "Percentages Reset",
      description: "Profit First percentages have been reset to defaults",
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const getTotalAllocated = () => profitFirstAccounts.reduce((sum, account) => sum + account.targetAmount, 0)
  const getTotalPercentage = () => profitFirstAccounts.reduce((sum, account) => sum + account.targetPercentage, 0)
  const getBankAccountsBalance = () => bankAccounts.reduce((sum, account) => sum + (account.balance || 0), 0)

  if (!isOperational) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <Wallet className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">Profit First Budgeting</h3>
              <p className="text-muted-foreground mb-4">
                Connect your bank accounts to start using the Profit First budgeting system.
              </p>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  This system will automatically allocate your revenue into Profit, Owner's Pay, Tax, and Operating Expense accounts.
                </p>
                <p className="text-sm text-muted-foreground">
                  You can also set up manual budgeting if you don't have connected accounts.
                </p>
              </div>
              <Button 
                onClick={() => {
                  setIsOperational(true)
                  initializeDefaultAccounts()
                }} 
                className="mt-4"
              >
                Start Manual Profit First Setup
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Revenue Input Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Monthly Revenue</CardTitle>
            <CardDescription>Set your monthly revenue to enable automatic allocation</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Dialog open={showRevenueDialog} onOpenChange={setShowRevenueDialog}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                  <Edit className="h-4 w-4 mr-2" />
                  {monthlyRevenue > 0 ? 'Update' : 'Set'} Revenue
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Set Monthly Revenue</DialogTitle>
                  <DialogDescription>
                    Enter your average monthly business revenue for Profit First allocation
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="revenue">Monthly Revenue ($)</Label>
                    <Input
                      id="revenue"
                      type="number"
                      value={revenueInput}
                      onChange={(e) => setRevenueInput(e.target.value)}
                      placeholder="25000"
                    />
                  </div>
                  <div className="flex gap-2 pt-4">
                    <Button variant="outline" onClick={() => {
                      setShowRevenueDialog(false)
                      setRevenueInput('')
                    }} className="flex-1">
                      Cancel
                    </Button>
                    <Button onClick={handleRevenueInput} className="flex-1">
                      Set Revenue
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            {monthlyRevenue > 0 && (
              <Button size="sm" onClick={allocateRevenue} className="bg-primary">
                <RefreshCw className="h-4 w-4 mr-2" />
                Allocate
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center">
            <p className="text-3xl font-bold">{formatCurrency(monthlyRevenue)}</p>
            <p className="text-sm text-muted-foreground mt-1">
              {monthlyRevenue > 0 ? 'Current monthly revenue' : 'Set your monthly revenue to get started'}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Bank Accounts Overview */}
      {bankAccounts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Connected Bank Accounts</CardTitle>
            <CardDescription>Your business accounts available for allocation</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {bankAccounts.map((account) => (
                <div key={account.id} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">{account.account_name}</h4>
                    <Badge variant="outline" className="text-xs">
                      {account.provider}
                    </Badge>
                  </div>
                  <p className="text-2xl font-bold">{formatCurrency(account.balance || 0)}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Last synced: {new Date(account.last_sync).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Profit First Allocation */}
      {profitFirstAccounts.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Profit First Allocation</CardTitle>
              <CardDescription>Allocate your revenue across the four pillars</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={resetPercentages}>
                Reset to Default
              </Button>
              <Badge variant={getTotalPercentage() === 100 ? "default" : "destructive"}>
                {getTotalPercentage()}%
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {profitFirstAccounts.map((account) => (
                <div key={account.id} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-4 h-4 rounded-full" 
                        style={{ backgroundColor: account.color }}
                      />
                      <h4 className="font-medium">{account.name}</h4>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{formatCurrency(account.targetAmount)}</p>
                      <p className="text-xs text-muted-foreground">{account.targetPercentage}%</p>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Slider
                      value={[account.targetPercentage]}
                      onValueChange={(value) => updateAccountPercentage(account.id, value[0])}
                      max={100}
                      step={1}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>0%</span>
                      <span>100%</span>
                    </div>
                  </div>
                  
                  <Progress 
                    value={account.currentAmount > 0 ? (account.currentAmount / account.targetAmount) * 100 : 0} 
                    className="h-2"
                    style={{ 
                      backgroundColor: `${account.color}20`,
                    }}
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Monthly Performance Trend */}
      {monthlyTrends.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Monthly Profit First Performance</CardTitle>
            <CardDescription>Track your allocation performance throughout the year</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={monthlyTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={(value) => formatCurrency(value)} />
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                <Line 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#8884d8" 
                  strokeWidth={3}
                  name="Revenue"
                />
                <Line 
                  type="monotone" 
                  dataKey="profit" 
                  stroke="#22c55e" 
                  strokeWidth={2}
                  name="Profit"
                />
                <Line 
                  type="monotone" 
                  dataKey="ownersPay" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  name="Owner's Pay"
                />
                <Line 
                  type="monotone" 
                  dataKey="tax" 
                  stroke="#ef4444" 
                  strokeWidth={2}
                  name="Tax"
                />
                <Line 
                  type="monotone" 
                  dataKey="opex" 
                  stroke="#f59e0b" 
                  strokeWidth={2}
                  name="Operating Expenses"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

    </div>
  )
}