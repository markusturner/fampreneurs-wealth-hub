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
  Trash2
} from 'lucide-react'
import { PieChart as RechartsPieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts'

interface BudgetCategory {
  id: string
  name: string
  budgeted: number
  spent: number
  remaining: number
  percentage: number
  color: string
  isOverBudget: boolean
}

interface FinancialGoal {
  id: string
  name: string
  targetAmount: number
  currentAmount: number
  targetDate: string
  category: string
  priority: 'high' | 'medium' | 'low'
  isCompleted: boolean
}

interface AIRecommendation {
  id: string
  type: 'savings' | 'spending' | 'investment' | 'goal'
  title: string
  description: string
  impact: number
  priority: 'high' | 'medium' | 'low'
}

export function BudgetingAnalytics() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [budgetCategories, setBudgetCategories] = useState<BudgetCategory[]>([])
  const [financialGoals, setFinancialGoals] = useState<FinancialGoal[]>([])
  const [aiRecommendations, setAiRecommendations] = useState<AIRecommendation[]>([])
  const [connectedAccounts, setConnectedAccounts] = useState<any[]>([])
  const [transactions, setTransactions] = useState<any[]>([])
  const [showBudgetDialog, setShowBudgetDialog] = useState(false)
  const [showGoalDialog, setShowGoalDialog] = useState(false)
  const [loading, setLoading] = useState(true)
  const [isOperational, setIsOperational] = useState(false)

  const [newBudget, setNewBudget] = useState({
    name: '',
    amount: ''
  })

  const [newGoal, setNewGoal] = useState({
    name: '',
    targetAmount: '',
    targetDate: '',
    category: 'savings'
  })

  useEffect(() => {
    checkDataAvailabilityAndFetchBudget()
  }, [user])

  const checkDataAvailabilityAndFetchBudget = async () => {
    try {
      setLoading(true)
      
      // Check for connected accounts and transactions
      let hasAccounts = false
      let hasTransactions = false
      
      if (!user) {
        // For non-authenticated users, use empty data
        setBudgetCategories([])
        setFinancialGoals([])
        setAiRecommendations([])
        setIsOperational(false)
        return
      }
      
      // For authenticated users, fetch from Supabase
      const { data: accounts, error: accountsError } = await supabase
        .from('connected_accounts')
        .select('*')
        .eq('user_id', user.id)

      if (!accountsError && accounts) {
        setConnectedAccounts(accounts)
        hasAccounts = accounts.length > 0
      }

      const { data: dbTransactions, error: transactionsError } = await supabase
        .from('account_transactions')
        .select('*')
        .eq('user_id', user.id)
        .limit(10)

      if (!transactionsError && dbTransactions) {
        setTransactions(dbTransactions)
        hasTransactions = dbTransactions.length > 0
      }

      // Don't automatically load mock data - only set operational state
      if (hasAccounts || hasTransactions) {
        setIsOperational(true)
        // Only show empty state initially, user can choose to load sample data or create manual budgets
      } else {
        setBudgetCategories([])
        setFinancialGoals([])
        setAiRecommendations([])
        setIsOperational(false)
      }
    } catch (error) {
      console.error('Error checking data availability:', error)
      setBudgetCategories([])
      setFinancialGoals([])
      setAiRecommendations([])
      setIsOperational(false)
    } finally {
      setLoading(false)
    }
  }

  const fetchBudgetData = async () => {
    try {
      // This function is only called when there are actual accounts/transactions
      // For now, we'll keep it empty and only allow manual budget creation
      // Real budget data should come from actual transaction analysis
      
      // No mock data - users must create their own budgets
      setBudgetCategories([])
      setFinancialGoals([])
      setAiRecommendations([])
    } catch (error) {
      console.error('Error fetching budget data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddBudget = async () => {
    if (!newBudget.name || !newBudget.amount) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      })
      return
    }

    const budget: BudgetCategory = {
      id: Date.now().toString(),
      name: newBudget.name,
      budgeted: parseFloat(newBudget.amount),
      spent: 0,
      remaining: parseFloat(newBudget.amount),
      percentage: 0,
      color: '#6b7280',
      isOverBudget: false
    }

    setBudgetCategories(prev => [...prev, budget])
    setShowBudgetDialog(false)
    setNewBudget({ name: '', amount: '' })

    toast({
      title: "Budget Added",
      description: `Successfully created budget for ${newBudget.name}`,
    })
  }

  const handleAddGoal = async () => {
    if (!newGoal.name || !newGoal.targetAmount || !newGoal.targetDate) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      })
      return
    }

    const goal: FinancialGoal = {
      id: Date.now().toString(),
      name: newGoal.name,
      targetAmount: parseFloat(newGoal.targetAmount),
      currentAmount: 0,
      targetDate: newGoal.targetDate,
      category: newGoal.category,
      priority: 'medium',
      isCompleted: false
    }

    setFinancialGoals(prev => [...prev, goal])
    setShowGoalDialog(false)
    setNewGoal({ name: '', targetAmount: '', targetDate: '', category: 'savings' })

    toast({
      title: "Goal Added",
      description: `Successfully created goal: ${newGoal.name}`,
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

  const getTotalBudgeted = () => budgetCategories.reduce((sum, cat) => sum + cat.budgeted, 0)
  const getTotalSpent = () => budgetCategories.reduce((sum, cat) => sum + cat.spent, 0)
  const getTotalRemaining = () => budgetCategories.reduce((sum, cat) => sum + cat.remaining, 0)

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'low': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const spendingTrendData = [
    { month: 'Jan', budget: 4600, actual: 4200 },
    { month: 'Feb', budget: 4600, actual: 4500 },
    { month: 'Mar', budget: 4600, actual: 4800 },
    { month: 'Apr', budget: 4600, actual: 4300 },
    { month: 'May', budget: 4600, actual: 4700 },
    { month: 'Jun', budget: 4600, actual: 4020 }
  ]

  if (!isOperational) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <BrainCircuit className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">Budget & Analytics</h3>
              <p className="text-muted-foreground mb-4">
                Connect your accounts or add transactions to start using advanced budgeting and analytics tools.
              </p>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Budget categories and spending analytics will appear once you have transaction data.
                </p>
                <p className="text-sm text-muted-foreground">
                  You can still manually add budget categories and financial goals to get started.
                </p>
              </div>
              <Button 
                onClick={() => {
                  setIsOperational(true)
                  // Clear any existing mock data and just enable the UI
                  setBudgetCategories([])
                  setFinancialGoals([])
                  setAiRecommendations([])
                }} 
                className="mt-4"
              >
                Create Manual Budget
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Only show empty message when operational but no data exists */}
      {isOperational && budgetCategories.length === 0 && financialGoals.length === 0 && (
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <BrainCircuit className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">Ready to Create Your Budget</h3>
              <p className="text-muted-foreground mb-4">
                Start by adding budget categories and financial goals to track your progress.
              </p>
              <div className="flex gap-4 justify-center">
                <Dialog open={showBudgetDialog} onOpenChange={setShowBudgetDialog}>
                  <DialogTrigger asChild>
                    <Button className="flex items-center gap-2">
                      <Plus className="h-4 w-4" />
                      Add Budget Category
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Budget Category</DialogTitle>
                      <DialogDescription>
                        Create a new budget category with monthly limit
                      </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Category Name</Label>
                        <Input
                          id="name"
                          value={newBudget.name}
                          onChange={(e) => setNewBudget(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="e.g., Food & Dining, Entertainment"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="amount">Monthly Budget Amount</Label>
                        <Input
                          id="amount"
                          type="number"
                          value={newBudget.amount}
                          onChange={(e) => setNewBudget(prev => ({ ...prev, amount: e.target.value }))}
                          placeholder="1000"
                        />
                      </div>
                      
                      <div className="flex gap-2 pt-4">
                        <Button variant="outline" onClick={() => setShowBudgetDialog(false)} className="flex-1">
                          Cancel
                        </Button>
                        <Button onClick={handleAddBudget} className="flex-1">
                          Add Budget
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>

                <Dialog open={showGoalDialog} onOpenChange={setShowGoalDialog}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="flex items-center gap-2">
                      <Plus className="h-4 w-4" />
                      Add Financial Goal
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Financial Goal</DialogTitle>
                      <DialogDescription>
                        Set a new financial goal to track your progress
                      </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="goalName">Goal Name</Label>
                        <Input
                          id="goalName"
                          value={newGoal.name}
                          onChange={(e) => setNewGoal(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="e.g., Emergency Fund, Vacation"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="targetAmount">Target Amount</Label>
                        <Input
                          id="targetAmount"
                          type="number"
                          value={newGoal.targetAmount}
                          onChange={(e) => setNewGoal(prev => ({ ...prev, targetAmount: e.target.value }))}
                          placeholder="50000"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="targetDate">Target Date</Label>
                        <Input
                          id="targetDate"
                          type="date"
                          value={newGoal.targetDate}
                          onChange={(e) => setNewGoal(prev => ({ ...prev, targetDate: e.target.value }))}
                        />
                      </div>
                      
                      <div className="flex gap-2 pt-4">
                        <Button variant="outline" onClick={() => setShowGoalDialog(false)} className="flex-1">
                          Cancel
                        </Button>
                        <Button onClick={handleAddGoal} className="flex-1">
                          Add Goal
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}