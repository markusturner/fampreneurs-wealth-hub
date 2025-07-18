import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { NavHeader } from '@/components/dashboard/nav-header'
import { TrendingUp, TrendingDown, DollarSign, Plus, Edit, Trash2, PieChart, Wallet, BarChart3 } from 'lucide-react'

interface Investment {
  id: string
  user_id: string
  platform_id: string
  total_value: number
  cash_balance: number | null
  day_change: number | null
  day_change_percent: number | null
  positions: any
  last_updated: string | null
  created_at: string
  updated_at: string
}

const platformOptions = [
  'Fidelity',
  'Charles Schwab',
  'Vanguard',
  'E*TRADE',
  'TD Ameritrade',
  'Interactive Brokers',
  'Robinhood',
  'Merrill Lynch',
  'Morgan Stanley',
  'UBS',
  'Goldman Sachs',
  'JPMorgan Chase',
  'Wells Fargo',
  'Bank of America',
  'Ally Invest',
  'Webull',
  'Other'
]

export default function Investments() {
  const { user, profile } = useAuth()
  const { toast } = useToast()
  const [investments, setInvestments] = useState<Investment[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingInvestment, setEditingInvestment] = useState<Investment | null>(null)
  const [submitting, setSubmitting] = useState(false)
  
  const [formData, setFormData] = useState({
    platformId: '',
    totalValue: '',
    cashBalance: '',
    dayChange: '',
    dayChangePercent: ''
  })

  useEffect(() => {
    fetchInvestments()
  }, [])

  const fetchInvestments = async () => {
    try {
      const { data, error } = await supabase
        .from('investment_portfolios')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setInvestments(data || [])
    } catch (error) {
      console.error('Error fetching investments:', error)
      toast({
        title: "Error",
        description: "Failed to load investments",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      platformId: '',
      totalValue: '',
      cashBalance: '',
      dayChange: '',
      dayChangePercent: ''
    })
    setEditingInvestment(null)
  }

  const openEditDialog = (investment: Investment) => {
    setEditingInvestment(investment)
    setFormData({
      platformId: investment.platform_id,
      totalValue: investment.total_value.toString(),
      cashBalance: investment.cash_balance?.toString() || '',
      dayChange: investment.day_change?.toString() || '',
      dayChangePercent: investment.day_change_percent?.toString() || ''
    })
    setDialogOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.platformId || !formData.totalValue) {
      toast({
        title: "Missing Information",
        description: "Please provide platform and total value.",
        variant: "destructive"
      })
      return
    }

    setSubmitting(true)
    try {
      const investmentData = {
        platform_id: formData.platformId,
        total_value: parseFloat(formData.totalValue),
        cash_balance: formData.cashBalance ? parseFloat(formData.cashBalance) : null,
        day_change: formData.dayChange ? parseFloat(formData.dayChange) : null,
        day_change_percent: formData.dayChangePercent ? parseFloat(formData.dayChangePercent) : null,
        last_updated: new Date().toISOString()
      }

      if (editingInvestment) {
        // Update existing investment
        const { error } = await supabase
          .from('investment_portfolios')
          .update(investmentData)
          .eq('id', editingInvestment.id)

        if (error) throw error

        toast({
          title: "Investment Updated",
          description: `${formData.platformId} portfolio has been updated successfully.`
        })
      } else {
        // Add new investment
        const { error } = await supabase
          .from('investment_portfolios')
          .insert({
            ...investmentData,
            user_id: user?.id
          })

        if (error) throw error

        toast({
          title: "Investment Added",
          description: `${formData.platformId} portfolio has been added successfully.`
        })
      }

      resetForm()
      setDialogOpen(false)
      fetchInvestments()
    } catch (error) {
      console.error('Error saving investment:', error)
      toast({
        title: "Error",
        description: "Failed to save investment. Please try again.",
        variant: "destructive"
      })
    } finally {
      setSubmitting(false)
    }
  }

  const deleteInvestment = async (investment: Investment) => {
    if (!confirm(`Are you sure you want to remove the ${investment.platform_id} portfolio?`)) {
      return
    }

    try {
      const { error } = await supabase
        .from('investment_portfolios')
        .delete()
        .eq('id', investment.id)

      if (error) throw error

      toast({
        title: "Investment Removed",
        description: `${investment.platform_id} portfolio has been removed.`
      })

      fetchInvestments()
    } catch (error) {
      console.error('Error deleting investment:', error)
      toast({
        title: "Error",
        description: "Failed to remove investment. Please try again.",
        variant: "destructive"
      })
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

  const getTotalPortfolioValue = () => {
    return investments.reduce((sum, inv) => sum + inv.total_value, 0)
  }

  const getTotalDayChange = () => {
    return investments.reduce((sum, inv) => sum + (inv.day_change || 0), 0)
  }

  const getTotalCashBalance = () => {
    return investments.reduce((sum, inv) => sum + (inv.cash_balance || 0), 0)
  }

  return (
    <div className="min-h-screen bg-background">
      <NavHeader />
      
      <div className="container mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6 max-w-full">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Investment Portfolio</h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Track and manage your investment accounts across platforms
            </p>
          </div>
          
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open)
            if (!open) resetForm()
          }}>
            <DialogTrigger asChild>
              <Button className="gap-2 w-full sm:w-auto">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Add Investment Account</span>
                <span className="sm:hidden">Add Account</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto mx-3 sm:mx-0 max-w-[calc(100vw-24px)]">
              <DialogHeader>
                <DialogTitle className="text-lg sm:text-xl">
                  {editingInvestment ? 'Edit Investment Account' : 'Add Investment Account'}
                </DialogTitle>
                <DialogDescription className="text-sm">
                  {editingInvestment ? 'Update investment account information' : 'Add a new investment account to your portfolio'}
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="platformId">Platform/Broker *</Label>
                  <Select value={formData.platformId} onValueChange={(value) => setFormData(prev => ({ ...prev, platformId: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select platform" />
                    </SelectTrigger>
                    <SelectContent>
                      {platformOptions.map((platform) => (
                        <SelectItem key={platform} value={platform}>
                          {platform}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="totalValue">Total Portfolio Value ($) *</Label>
                  <Input
                    id="totalValue"
                    type="number"
                    step="0.01"
                    value={formData.totalValue}
                    onChange={(e) => setFormData(prev => ({ ...prev, totalValue: e.target.value }))}
                    placeholder="0.00"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="cashBalance">Cash Balance ($)</Label>
                  <Input
                    id="cashBalance"
                    type="number"
                    step="0.01"
                    value={formData.cashBalance}
                    onChange={(e) => setFormData(prev => ({ ...prev, cashBalance: e.target.value }))}
                    placeholder="0.00"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="dayChange">Today's Change ($)</Label>
                    <Input
                      id="dayChange"
                      type="number"
                      step="0.01"
                      value={formData.dayChange}
                      onChange={(e) => setFormData(prev => ({ ...prev, dayChange: e.target.value }))}
                      placeholder="0.00"
                    />
                  </div>

                  <div>
                    <Label htmlFor="dayChangePercent">Today's Change (%)</Label>
                    <Input
                      id="dayChangePercent"
                      type="number"
                      step="0.01"
                      value={formData.dayChangePercent}
                      onChange={(e) => setFormData(prev => ({ ...prev, dayChangePercent: e.target.value }))}
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={submitting}>
                    {submitting ? 'Saving...' : editingInvestment ? 'Update Account' : 'Add Account'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Portfolio Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Wallet className="h-4 w-4" />
                Total Portfolio
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(getTotalPortfolioValue())}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Cash Balance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(getTotalCashBalance())}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                {getTotalDayChange() >= 0 ? (
                  <TrendingUp className="h-4 w-4 text-green-600" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-600" />
                )}
                Today's Change
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${getTotalDayChange() >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(getTotalDayChange())}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Accounts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{investments.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Investment Accounts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              Investment Accounts
            </CardTitle>
            <CardDescription>
              Your connected investment platforms and account balances
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="animate-pulse flex items-center space-x-4 p-4 border rounded-lg">
                    <div className="w-12 h-12 bg-muted rounded-lg"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-muted rounded w-1/4"></div>
                      <div className="h-3 bg-muted rounded w-1/3"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : investments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <PieChart className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No investment accounts found</p>
                <p className="text-sm">Add your first investment account to get started</p>
              </div>
            ) : (
              <div className="space-y-3">
                {investments.map((investment) => (
                  <div key={investment.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                        <DollarSign className="h-6 w-6 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-base">{investment.platform_id}</h3>
                          <Badge variant="outline" className="text-xs">
                            Portfolio
                          </Badge>
                        </div>
                        <p className="text-lg font-medium">{formatCurrency(investment.total_value)}</p>
                        <div className="flex items-center gap-4 mt-1">
                          {investment.cash_balance && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <DollarSign className="h-3 w-3" />
                              Cash: {formatCurrency(investment.cash_balance)}
                            </div>
                          )}
                          {investment.day_change !== null && (
                            <div className={`flex items-center gap-1 text-xs ${investment.day_change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {investment.day_change >= 0 ? (
                                <TrendingUp className="h-3 w-3" />
                              ) : (
                                <TrendingDown className="h-3 w-3" />
                              )}
                              {formatCurrency(investment.day_change)}
                              {investment.day_change_percent && ` (${formatPercent(investment.day_change_percent)})`}
                            </div>
                          )}
                        </div>
                        {investment.last_updated && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Last updated: {new Date(investment.last_updated).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditDialog(investment)}
                        className="gap-1"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteInvestment(investment)}
                        className="gap-1 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}