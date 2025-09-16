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
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [addType, setAddType] = useState<'budget' | 'goal'>('budget')
  const [loading, setLoading] = useState(true)
  const [isOperational, setIsOperational] = useState(false)
  const [editingGoal, setEditingGoal] = useState<FinancialGoal | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [goalToDelete, setGoalToDelete] = useState<string | null>(null)

  const [newItem, setNewItem] = useState({
    name: '',
    amount: '',
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

  const handleAddItem = async () => {
    if (!newItem.name || !newItem.amount) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      })
      return
    }

    if (addType === 'budget') {
      const budget: BudgetCategory = {
        id: Date.now().toString(),
        name: newItem.name,
        budgeted: parseFloat(newItem.amount),
        spent: 0,
        remaining: parseFloat(newItem.amount),
        percentage: 0,
        color: '#6b7280',
        isOverBudget: false
      }

      setBudgetCategories(prev => [...prev, budget])
      toast({
        title: "Budget Category Added",
        description: `Successfully created budget for ${newItem.name}`,
      })
    } else {
      if (!newItem.targetDate) {
        toast({
          title: "Error",
          description: "Please set a target date for your goal",
          variant: "destructive"
        })
        return
      }

      const goal: FinancialGoal = {
        id: Date.now().toString(),
        name: newItem.name,
        targetAmount: parseFloat(newItem.amount),
        currentAmount: 0,
        targetDate: newItem.targetDate,
        category: newItem.category,
        priority: 'medium',
        isCompleted: false
      }

      setFinancialGoals(prev => [...prev, goal])
      toast({
        title: "Financial Goal Added",
        description: `Successfully created goal: ${newItem.name}`,
      })
    }

    setShowAddDialog(false)
    setNewItem({ name: '', amount: '', targetDate: '', category: 'savings' })
  }

  const handleEditGoal = (goal: FinancialGoal) => {
    setEditingGoal(goal)
    setNewItem({
      name: goal.name,
      amount: goal.targetAmount.toString(),
      targetDate: goal.targetDate,
      category: goal.category
    })
    setAddType('goal')
    setShowAddDialog(true)
  }

  const handleUpdateGoal = () => {
    if (!editingGoal || !newItem.name || !newItem.amount || !newItem.targetDate) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      })
      return
    }

    const updatedGoal: FinancialGoal = {
      ...editingGoal,
      name: newItem.name,
      targetAmount: parseFloat(newItem.amount),
      targetDate: newItem.targetDate,
      category: newItem.category
    }

    setFinancialGoals(prev => prev.map(goal => 
      goal.id === editingGoal.id ? updatedGoal : goal
    ))

    toast({
      title: "Goal Updated",
      description: `Successfully updated ${newItem.name}`,
    })

    setShowAddDialog(false)
    setEditingGoal(null)
    setNewItem({ name: '', amount: '', targetDate: '', category: 'savings' })
  }

  const handleDeleteGoal = (goalId: string) => {
    setGoalToDelete(goalId)
    setShowDeleteDialog(true)
  }

  const confirmDeleteGoal = () => {
    if (goalToDelete) {
      setFinancialGoals(prev => prev.filter(goal => goal.id !== goalToDelete))
      toast({
        title: "Goal Deleted",
        description: "Successfully deleted the financial goal",
      })
    }
    setShowDeleteDialog(false)
    setGoalToDelete(null)
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
              <div className="flex justify-center">
                <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                <DialogTrigger asChild>
                  <Button className="flex items-center gap-2" style={{ backgroundColor: '#ffb500', color: '#290a52' }}>
                    <Plus className="h-4 w-4" />
                    Add Budget Item
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add to Your Budget</DialogTitle>
                    <DialogDescription>
                      Create a budget category or set a financial goal
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-4">
                    {/* Type Selection */}
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant={addType === 'budget' ? 'default' : 'outline'}
                        onClick={() => setAddType('budget')}
                        className="flex items-center gap-2"
                      >
                        <PieChart className="h-4 w-4" />
                        Budget Category
                      </Button>
                      <Button
                        variant={addType === 'goal' ? 'default' : 'outline'}
                        onClick={() => setAddType('goal')}
                        className="flex items-center gap-2"
                      >
                        <Target className="h-4 w-4" />
                        Financial Goal
                      </Button>
                    </div>
                    
                    {/* Form Fields */}
                    <div className="space-y-2">
                      <Label htmlFor="itemName">
                        {addType === 'budget' ? 'Category Name' : 'Goal Name'}
                      </Label>
                      <Input
                        id="itemName"
                        value={newItem.name}
                        onChange={(e) => setNewItem(prev => ({ ...prev, name: e.target.value }))}
                        placeholder={addType === 'budget' ? 'e.g., Food & Dining, Entertainment' : 'e.g., Emergency Fund, Vacation'}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="itemAmount">
                        {addType === 'budget' ? 'Monthly Budget Amount' : 'Target Amount'}
                      </Label>
                      <Input
                        id="itemAmount"
                        type="number"
                        value={newItem.amount}
                        onChange={(e) => setNewItem(prev => ({ ...prev, amount: e.target.value }))}
                        placeholder={addType === 'budget' ? '1000' : '50000'}
                      />
                    </div>
                    
                    {addType === 'goal' && (
                      <div className="space-y-2">
                        <Label htmlFor="itemDate">Target Date</Label>
                        <Input
                          id="itemDate"
                          type="date"
                          value={newItem.targetDate}
                          onChange={(e) => setNewItem(prev => ({ ...prev, targetDate: e.target.value }))}
                        />
                      </div>
                    )}
                    
                    <div className="flex gap-2 pt-4">
                      <Button variant="outline" onClick={() => setShowAddDialog(false)} className="flex-1">
                        Cancel
                      </Button>
                      <Button onClick={handleAddItem} className="flex-1">
                        {addType === 'budget' ? 'Add Budget' : 'Add Goal'}
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

      {/* Budget Overview Cards */}
      {(budgetCategories.length > 0 || financialGoals.length > 0) && (
        <>
          {/* Summary Stats */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Budget</p>
                    <p className="text-2xl font-bold">{formatCurrency(getTotalBudgeted())}</p>
                  </div>
                  <DollarSign className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Spent</p>
                    <p className="text-2xl font-bold">{formatCurrency(getTotalSpent())}</p>
                  </div>
                  <TrendingDown className="h-8 w-8 text-red-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Remaining</p>
                    <p className="text-2xl font-bold">{formatCurrency(getTotalRemaining())}</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Budget Categories */}
          {budgetCategories.length > 0 && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Budget Categories</CardTitle>
                  <CardDescription>Track spending across different categories</CardDescription>
                </div>
                <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="flex items-center gap-2" onClick={() => setAddType('budget')}>
                      <Plus className="h-4 w-4" />
                      Add Category
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{editingGoal ? 'Edit Financial Goal' : 'Add to Your Budget'}</DialogTitle>
                      <DialogDescription>
                        {editingGoal ? 'Update your financial goal details' : 'Create a budget category or set a financial goal'}
                      </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-4">
                      {/* Type Selection */}
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          variant={addType === 'budget' ? 'default' : 'outline'}
                          onClick={() => setAddType('budget')}
                          className="flex items-center gap-2"
                        >
                          <PieChart className="h-4 w-4" />
                          Budget Category
                        </Button>
                        <Button
                          variant={addType === 'goal' ? 'default' : 'outline'}
                          onClick={() => setAddType('goal')}
                          className="flex items-center gap-2"
                        >
                          <Target className="h-4 w-4" />
                          Financial Goal
                        </Button>
                      </div>
                      
                      {/* Form Fields */}
                      <div className="space-y-2">
                        <Label htmlFor="itemName">
                          {addType === 'budget' ? 'Category Name' : 'Goal Name'}
                        </Label>
                        <Input
                          id="itemName"
                          value={newItem.name}
                          onChange={(e) => setNewItem(prev => ({ ...prev, name: e.target.value }))}
                          placeholder={addType === 'budget' ? 'e.g., Food & Dining, Entertainment' : 'e.g., Emergency Fund, Vacation'}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="itemAmount">
                          {addType === 'budget' ? 'Monthly Budget Amount' : 'Target Amount'}
                        </Label>
                        <Input
                          id="itemAmount"
                          type="number"
                          value={newItem.amount}
                          onChange={(e) => setNewItem(prev => ({ ...prev, amount: e.target.value }))}
                          placeholder={addType === 'budget' ? '1000' : '50000'}
                        />
                      </div>
                      
                      {addType === 'goal' && (
                        <div className="space-y-2">
                          <Label htmlFor="itemDate">Target Date</Label>
                          <Input
                            id="itemDate"
                            type="date"
                            value={newItem.targetDate}
                            onChange={(e) => setNewItem(prev => ({ ...prev, targetDate: e.target.value }))}
                          />
                        </div>
                      )}
                      
                      <div className="flex gap-2 pt-4">
                        <Button variant="outline" onClick={() => {
                          setShowAddDialog(false)
                          setEditingGoal(null)
                          setNewItem({ name: '', amount: '', targetDate: '', category: 'savings' })
                        }} className="flex-1">
                          Cancel
                        </Button>
                        <Button onClick={editingGoal ? handleUpdateGoal : handleAddItem} className="flex-1">
                          {editingGoal ? 'Update Goal' : (addType === 'budget' ? 'Add Budget' : 'Add Goal')}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {budgetCategories.map((category) => (
                    <div key={category.id} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">{category.name}</h4>
                        <div className="text-sm text-muted-foreground">
                          {formatCurrency(category.spent)} / {formatCurrency(category.budgeted)}
                        </div>
                      </div>
                      <Progress value={category.percentage} className="h-2" />
                      <div className="flex items-center justify-between text-sm">
                        <span className={category.isOverBudget ? "text-red-500" : "text-green-500"}>
                          {category.isOverBudget ? "Over budget" : "On track"}
                        </span>
                        <span className="text-muted-foreground">
                          {formatCurrency(category.remaining)} remaining
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Financial Goals */}
          {financialGoals.length > 0 && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Financial Goals</CardTitle>
                  <CardDescription>Track progress toward your financial objectives</CardDescription>
                </div>
                <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                  <DialogTrigger asChild>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="flex items-center gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Add Goal
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add to Your Budget</DialogTitle>
                      <DialogDescription>
                        Create a budget category or set a financial goal
                      </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-4">
                      {/* Type Selection */}
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          variant={addType === 'budget' ? 'default' : 'outline'}
                          onClick={() => setAddType('budget')}
                          className="flex items-center gap-2"
                        >
                          <PieChart className="h-4 w-4" />
                          Budget Category
                        </Button>
                        <Button
                          variant={addType === 'goal' ? 'default' : 'outline'}
                          onClick={() => setAddType('goal')}
                          className="flex items-center gap-2"
                        >
                          <Target className="h-4 w-4" />
                          Financial Goal
                        </Button>
                      </div>
                      
                      {/* Form Fields */}
                      <div className="space-y-2">
                        <Label htmlFor="itemName">
                          {addType === 'budget' ? 'Category Name' : 'Goal Name'}
                        </Label>
                        <Input
                          id="itemName"
                          value={newItem.name}
                          onChange={(e) => setNewItem(prev => ({ ...prev, name: e.target.value }))}
                          placeholder={addType === 'budget' ? 'e.g., Food & Dining, Entertainment' : 'e.g., Emergency Fund, Vacation'}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="itemAmount">
                          {addType === 'budget' ? 'Monthly Budget Amount' : 'Target Amount'}
                        </Label>
                        <Input
                          id="itemAmount"
                          type="number"
                          value={newItem.amount}
                          onChange={(e) => setNewItem(prev => ({ ...prev, amount: e.target.value }))}
                          placeholder={addType === 'budget' ? '1000' : '50000'}
                        />
                      </div>
                      
                      {addType === 'goal' && (
                        <div className="space-y-2">
                          <Label htmlFor="itemDate">Target Date</Label>
                          <Input
                            id="itemDate"
                            type="date"
                            value={newItem.targetDate}
                            onChange={(e) => setNewItem(prev => ({ ...prev, targetDate: e.target.value }))}
                          />
                        </div>
                      )}
                      
                      <div className="flex gap-2 pt-4">
                        <Button variant="outline" onClick={() => setShowAddDialog(false)} className="flex-1">
                          Cancel
                        </Button>
                        <Button onClick={handleAddItem} className="flex-1">
                          {addType === 'budget' ? 'Add Budget' : 'Add Goal'}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  {financialGoals.map((goal) => (
                    <div key={goal.id} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">{goal.name}</h4>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={getPriorityColor(goal.priority)}>
                            {goal.priority}
                          </Badge>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEditGoal(goal)}
                            className="h-8 w-8 p-0"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteGoal(goal.id)}
                            className="h-8 w-8 p-0 text-red-500 hover:text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>{formatCurrency(goal.currentAmount)}</span>
                          <span>{formatCurrency(goal.targetAmount)}</span>
                        </div>
                        <Progress value={(goal.currentAmount / goal.targetAmount) * 100} className="h-2" />
                        <div className="flex justify-between text-sm text-muted-foreground">
                          <span>{Math.round((goal.currentAmount / goal.targetAmount) * 100)}% complete</span>
                          <span>Due: {new Date(goal.targetDate).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Spending Trends Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Spending Trends</CardTitle>
              <CardDescription>Monthly budget vs actual spending comparison</CardDescription>
            </CardHeader>
            <CardContent>
              <style>
                {`
                  .recharts-bar-rectangle {
                    filter: drop-shadow(0 0 8px currentColor);
                  }
                  .glow-orange {
                    filter: drop-shadow(0 0 2px rgba(255, 181, 0, 0.2)) drop-shadow(0 0 4px rgba(255, 181, 0, 0.1));
                  }
                  .glow-white {
                    filter: drop-shadow(0 0 2px rgba(255, 255, 255, 0.15)) drop-shadow(0 0 4px rgba(255, 255, 255, 0.05));
                  }
                `}
              </style>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={spendingTrendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  <Bar dataKey="budget" fill="#ffb500" name="Budget" className="glow-orange" />
                  <Bar dataKey="actual" fill="#ffffff" name="Actual" className="glow-white" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Financial Goal</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this financial goal? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 pt-4">
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)} className="flex-1">
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDeleteGoal} className="flex-1">
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}