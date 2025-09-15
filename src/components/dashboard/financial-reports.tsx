import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/integrations/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { TrendingUp, TrendingDown, DollarSign, BarChart3, FileText, Download } from 'lucide-react'

interface Transaction {
  id: string
  amount: number
  category: string | null
  transaction_date: string
  description: string
  transaction_type?: string
}

interface FinancialData {
  income: { [category: string]: number }
  expenses: { [category: string]: number }
  assets: { [category: string]: number }
  liabilities: { [category: string]: number }
  totalIncome: number
  totalExpenses: number
  netIncome: number
}

export function FinancialReports() {
  const { user } = useAuth()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPeriod, setSelectedPeriod] = useState('month')
  const [financialData, setFinancialData] = useState<FinancialData>({
    income: {},
    expenses: {},
    assets: {},
    liabilities: {},
    totalIncome: 0,
    totalExpenses: 0,
    netIncome: 0
  })

  useEffect(() => {
    if (user) {
      fetchTransactions()
    }
  }, [user, selectedPeriod])

  const fetchTransactions = async () => {
    if (!user) return

    setLoading(true)
    
    // Calculate date range based on selected period
    const now = new Date()
    const startDate = new Date()
    
    switch (selectedPeriod) {
      case 'week':
        startDate.setDate(now.getDate() - 7)
        break
      case 'month':
        startDate.setMonth(now.getMonth() - 1)
        break
      case 'quarter':
        startDate.setMonth(now.getMonth() - 3)
        break
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1)
        break
    }

    try {
      // Fetch both account and bank statement transactions
      const [accountTransResult, bankTransResult] = await Promise.all([
        supabase
          .from('account_transactions')
          .select('*')
          .eq('user_id', user.id)
          .gte('transaction_date', startDate.toISOString().split('T')[0])
          .order('transaction_date', { ascending: false }),
        
        supabase
          .from('bank_statement_transactions')
          .select('*')
          .eq('user_id', user.id)
          .gte('transaction_date', startDate.toISOString().split('T')[0])
          .order('transaction_date', { ascending: false })
      ])

      const allTransactions = [
        ...(accountTransResult.data || []),
        ...(bankTransResult.data || [])
      ]

      setTransactions(allTransactions)
      await processFinancialData(allTransactions)
    } catch (error) {
      console.error('Error fetching transactions:', error)
    }
    
    setLoading(false)
  }

  const processFinancialData = async (transactions: Transaction[]) => {
    const income: { [category: string]: number } = {}
    const expenses: { [category: string]: number } = {}
    const assets: { [category: string]: number } = {}
    const liabilities: { [category: string]: number } = {}
    
    let totalIncome = 0
    let totalExpenses = 0

    // Fetch transaction categories to determine types
    const { data: categoryData } = await supabase
      .from('transaction_categories')
      .select('name, category_type')

    const categoryTypeMap = new Map(
      (categoryData || []).map(cat => [cat.name.toLowerCase(), cat.category_type])
    )

    transactions.forEach(transaction => {
      const amount = Math.abs(transaction.amount)
      const category = transaction.category || 'Uncategorized'
      
      // Determine type based on transaction_type field first, then category type, then fallback logic
      let transactionType = transaction.transaction_type
      
      // Map database transaction_type values to financial report categories
      if (transactionType === 'credit') {
        transactionType = 'income'
      } else if (transactionType === 'debit') {
        transactionType = 'expense'
      } else if (!transactionType) {
        // Use category type mapping
        const categoryType = categoryTypeMap.get(category.toLowerCase())
        if (categoryType) {
          transactionType = categoryType
        } else {
          // Fallback to amount-based classification
          transactionType = transaction.amount > 0 ? 'income' : 'expense'
        }
      }

      // Classify based on determined type
      switch (transactionType) {
        case 'income':
          income[category] = (income[category] || 0) + amount
          totalIncome += amount
          // Assets (cash/bank accounts increase with income)
          assets['Cash & Bank Accounts'] = (assets['Cash & Bank Accounts'] || 0) + amount
          break
          
        case 'expense':
          expenses[category] = (expenses[category] || 0) + amount
          totalExpenses += amount
          
          // Classify expenses into assets or liabilities based on category
          if (category.toLowerCase().includes('loan') ||
              category.toLowerCase().includes('credit') ||
              category.toLowerCase().includes('debt') ||
              category.toLowerCase().includes('mortgage')) {
            liabilities[category] = (liabilities[category] || 0) + amount
          }
          break
          
        case 'investment':
          // Investments are assets but don't count as expenses
          assets[category] = (assets[category] || 0) + amount
          break
          
        case 'transfer':
          // Transfers don't affect income/expense calculation
          break
          
        default:
          // Default to expense for unknown types
          expenses[category] = (expenses[category] || 0) + amount
          totalExpenses += amount
      }
    })

    setFinancialData({
      income,
      expenses,
      assets,
      liabilities,
      totalIncome,
      totalExpenses,
      netIncome: totalIncome - totalExpenses
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const ProfitLossStatement = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Profit & Loss Statement
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Revenue Section */}
        <div>
          <h4 className="font-semibold text-lg mb-2 text-green-600">Revenue</h4>
          {Object.entries(financialData.income).map(([category, amount]) => (
            <div key={category} className="flex justify-between py-1">
              <span className="text-sm">{category}</span>
              <span className="text-sm font-medium text-green-600">{formatCurrency(amount)}</span>
            </div>
          ))}
          <div className="border-t pt-2 mt-2">
            <div className="flex justify-between font-semibold">
              <span>Total Revenue</span>
              <span className="text-green-600">{formatCurrency(financialData.totalIncome)}</span>
            </div>
          </div>
        </div>

        {/* Expenses Section */}
        <div>
          <h4 className="font-semibold text-lg mb-2 text-red-600">Expenses</h4>
          {Object.entries(financialData.expenses).map(([category, amount]) => (
            <div key={category} className="flex justify-between py-1">
              <span className="text-sm">{category}</span>
              <span className="text-sm font-medium text-red-600">{formatCurrency(amount)}</span>
            </div>
          ))}
          <div className="border-t pt-2 mt-2">
            <div className="flex justify-between font-semibold">
              <span>Total Expenses</span>
              <span className="text-red-600">{formatCurrency(financialData.totalExpenses)}</span>
            </div>
          </div>
        </div>

        {/* Net Income */}
        <div className="border-t-2 pt-4">
          <div className="flex justify-between font-bold text-lg">
            <span>Net Income</span>
            <span className={financialData.netIncome >= 0 ? 'text-green-600' : 'text-red-600'}>
              {formatCurrency(financialData.netIncome)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )

  const BalanceSheet = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Balance Sheet
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Assets */}
        <div>
          <h4 className="font-semibold text-lg mb-2 text-blue-600">Assets</h4>
          {Object.entries(financialData.assets).map(([category, amount]) => (
            <div key={category} className="flex justify-between py-1">
              <span className="text-sm">{category}</span>
              <span className="text-sm font-medium">{formatCurrency(amount)}</span>
            </div>
          ))}
          <div className="border-t pt-2 mt-2">
            <div className="flex justify-between font-semibold">
              <span>Total Assets</span>
              <span>{formatCurrency(Object.values(financialData.assets).reduce((a, b) => a + b, 0))}</span>
            </div>
          </div>
        </div>

        {/* Liabilities */}
        <div>
          <h4 className="font-semibold text-lg mb-2 text-red-600">Liabilities</h4>
          {Object.keys(financialData.liabilities).length > 0 ? (
            Object.entries(financialData.liabilities).map(([category, amount]) => (
              <div key={category} className="flex justify-between py-1">
                <span className="text-sm">{category}</span>
                <span className="text-sm font-medium">{formatCurrency(amount)}</span>
              </div>
            ))
          ) : (
            <div className="text-sm text-muted-foreground">No liabilities detected</div>
          )}
          <div className="border-t pt-2 mt-2">
            <div className="flex justify-between font-semibold">
              <span>Total Liabilities</span>
              <span>{formatCurrency(Object.values(financialData.liabilities).reduce((a, b) => a + b, 0))}</span>
            </div>
          </div>
        </div>

        {/* Equity */}
        <div className="border-t-2 pt-4">
          <h4 className="font-semibold text-lg mb-2">Equity</h4>
          <div className="flex justify-between font-bold">
            <span>Net Worth</span>
            <span className={financialData.netIncome >= 0 ? 'text-green-600' : 'text-red-600'}>
              {formatCurrency(
                Object.values(financialData.assets).reduce((a, b) => a + b, 0) -
                Object.values(financialData.liabilities).reduce((a, b) => a + b, 0)
              )}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )

  const FinancialSummary = () => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Income</p>
              <p className="text-xl font-bold text-green-600">{formatCurrency(financialData.totalIncome)}</p>
            </div>
            <TrendingUp className="h-8 w-8 text-green-600" />
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Expenses</p>
              <p className="text-xl font-bold text-red-600">{formatCurrency(financialData.totalExpenses)}</p>
            </div>
            <TrendingDown className="h-8 w-8 text-red-600" />
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Net Income</p>
              <p className={`text-xl font-bold ${financialData.netIncome >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(financialData.netIncome)}
              </p>
            </div>
            <DollarSign className="h-8 w-8 text-blue-600" />
          </div>
        </CardContent>
      </Card>
    </div>
  )

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Financial Reports</h2>
        </div>
        <div className="animate-pulse space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-muted rounded-lg" />
            ))}
          </div>
          <div className="h-96 bg-muted rounded-lg" />
        </div>
      </div>
    )
  }

  if (transactions.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-xl font-semibold mb-2">No Transaction Data</h3>
          <p className="text-muted-foreground">
            Connect accounts or upload bank statements to generate financial reports.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold">Financial Reports</h2>
        <div className="flex items-center gap-4">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Last Week</SelectItem>
              <SelectItem value="month">Last Month</SelectItem>
              <SelectItem value="quarter">Last Quarter</SelectItem>
              <SelectItem value="year">Last Year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      <FinancialSummary />

      <Tabs defaultValue="pnl" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pnl">P&L Statement</TabsTrigger>
          <TabsTrigger value="balance">Balance Sheet</TabsTrigger>
          <TabsTrigger value="cashflow">Cash Flow</TabsTrigger>
        </TabsList>

        <TabsContent value="pnl">
          <ProfitLossStatement />
        </TabsContent>

        <TabsContent value="balance">
          <BalanceSheet />
        </TabsContent>

        <TabsContent value="cashflow">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Cash Flow Statement
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Operating Activities</h4>
                  <div className="flex justify-between">
                    <span>Net Income</span>
                    <span>{formatCurrency(financialData.netIncome)}</span>
                  </div>
                </div>
                <div className="border-t pt-4">
                  <div className="flex justify-between font-bold">
                    <span>Net Cash Flow</span>
                    <span className={financialData.netIncome >= 0 ? 'text-green-600' : 'text-red-600'}>
                      {formatCurrency(financialData.netIncome)}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}