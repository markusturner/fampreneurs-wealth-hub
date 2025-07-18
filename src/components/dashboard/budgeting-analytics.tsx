import { useState, useEffect } from 'react'
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
  const { toast } = useToast()
  const [budgetCategories, setBudgetCategories] = useState<BudgetCategory[]>([])
  const [financialGoals, setFinancialGoals] = useState<FinancialGoal[]>([])
  const [aiRecommendations, setAiRecommendations] = useState<AIRecommendation[]>([])
  const [showBudgetDialog, setShowBudgetDialog] = useState(false)
  const [showGoalDialog, setShowGoalDialog] = useState(false)
  const [loading, setLoading] = useState(true)

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
    fetchBudgetData()
  }, [])

  const fetchBudgetData = async () => {
    try {
      // Mock data - replace with actual API calls
      const mockBudgets: BudgetCategory[] = [
        {
          id: '1',
          name: 'Food & Dining',
          budgeted: 1200,
          spent: 850,
          remaining: 350,
          percentage: 70.8,
          color: '#3b82f6',
          isOverBudget: false
        },
        {
          id: '2',
          name: 'Transportation',
          budgeted: 800,
          spent: 920,
          remaining: -120,
          percentage: 115,
          color: '#ef4444',
          isOverBudget: true
        },
        {
          id: '3',
          name: 'Entertainment',
          budgeted: 500,
          spent: 320,
          remaining: 180,
          percentage: 64,
          color: '#10b981',
          isOverBudget: false
        },
        {
          id: '4',
          name: 'Shopping',
          budgeted: 600,
          spent: 450,
          remaining: 150,
          percentage: 75,
          color: '#f59e0b',
          isOverBudget: false
        },
        {
          id: '5',
          name: 'Bills & Utilities',
          budgeted: 1500,
          spent: 1480,
          remaining: 20,
          percentage: 98.7,
          color: '#8b5cf6',
          isOverBudget: false
        }
      ]

      const mockGoals: FinancialGoal[] = [
        {
          id: '1',
          name: 'Emergency Fund',
          targetAmount: 50000,
          currentAmount: 32000,
          targetDate: '2024-12-31',
          category: 'emergency',
          priority: 'high',
          isCompleted: false
        },
        {
          id: '2',
          name: 'Vacation Fund',
          targetAmount: 15000,
          currentAmount: 8500,
          targetDate: '2024-08-15',
          category: 'travel',
          priority: 'medium',
          isCompleted: false
        },
        {
          id: '3',
          name: 'New Car Down Payment',
          targetAmount: 25000,
          currentAmount: 25000,
          targetDate: '2024-06-01',
          category: 'vehicle',
          priority: 'high',
          isCompleted: true
        }
      ]

      const mockRecommendations: AIRecommendation[] = [
        {
          id: '1',
          type: 'spending',
          title: 'Reduce Transportation Spending',
          description: 'You\'re 15% over budget in transportation. Consider carpooling or using public transit to save $120/month.',
          impact: 120,
          priority: 'high'
        },
        {
          id: '2',
          type: 'savings',
          title: 'Optimize Savings Rate',
          description: 'Based on your income, you could save an additional $800/month by reducing discretionary spending.',
          impact: 800,
          priority: 'medium'
        },
        {
          id: '3',
          type: 'investment',
          title: 'Rebalance Portfolio',
          description: 'Consider moving some cash reserves to index funds for better long-term returns.',
          impact: 2400,
          priority: 'medium'
        }
      ]

      setBudgetCategories(mockBudgets)
      setFinancialGoals(mockGoals)
      setAiRecommendations(mockRecommendations)
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

  return (
    <div className="space-y-6">
      {/* Budget Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Total Budgeted
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(getTotalBudgeted())}</div>
            <div className="text-sm text-muted-foreground">Monthly budget</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingDown className="h-4 w-4" />
              Total Spent
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(getTotalSpent())}</div>
            <div className={`text-sm ${getTotalSpent() > getTotalBudgeted() ? 'text-red-600' : 'text-green-600'}`}>
              {getTotalSpent() > getTotalBudgeted() ? 'Over budget' : 'Under budget'}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Remaining
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(getTotalRemaining())}</div>
            <div className="text-sm text-muted-foreground">This month</div>
          </CardContent>
        </Card>
      </div>

      {/* Budget Categories */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="h-5 w-5" />
                Budget Categories
              </CardTitle>
              <CardDescription>Monthly budget breakdown and spending</CardDescription>
            </div>
            <Dialog open={showBudgetDialog} onOpenChange={setShowBudgetDialog}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Add Budget
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
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {budgetCategories.map((category) => (
              <div key={category.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{category.name}</span>
                    {category.isOverBudget && (
                      <Badge variant="destructive" className="text-xs">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Over Budget
                      </Badge>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="font-medium">
                      {formatCurrency(category.spent)} / {formatCurrency(category.budgeted)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {formatCurrency(Math.abs(category.remaining))} {category.remaining >= 0 ? 'remaining' : 'over'}
                    </div>
                  </div>
                </div>
                <Progress 
                  value={Math.min(category.percentage, 100)} 
                  className="h-2"
                  style={{ 
                    backgroundColor: category.isOverBudget ? '#fecaca' : undefined 
                  }}
                />
                <div className="text-xs text-muted-foreground">
                  {category.percentage.toFixed(1)}% of budget used
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Spending Trends</CardTitle>
            <CardDescription>Budget vs actual spending over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={spendingTrendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => formatCurrency(value as number)} />
                <Line type="monotone" dataKey="budget" stroke="hsl(var(--primary))" strokeDasharray="5 5" />
                <Line type="monotone" dataKey="actual" stroke="hsl(var(--destructive))" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Budget Distribution</CardTitle>
            <CardDescription>Current month budget allocation</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <RechartsPieChart>
                <Pie
                  data={budgetCategories}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={120}
                  paddingAngle={5}
                  dataKey="budgeted"
                >
                  {budgetCategories.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(value as number)} />
              </RechartsPieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Financial Goals */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Financial Goals
              </CardTitle>
              <CardDescription>Track progress toward your financial objectives</CardDescription>
            </div>
            <Dialog open={showGoalDialog} onOpenChange={setShowGoalDialog}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Add Goal
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
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {financialGoals.map((goal) => (
              <div key={goal.id} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium">{goal.name}</h3>
                    <Badge className={getPriorityColor(goal.priority)}>
                      {goal.priority}
                    </Badge>
                    {goal.isCompleted && (
                      <Badge className="bg-green-100 text-green-800">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Completed
                      </Badge>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="font-medium">
                      {formatCurrency(goal.currentAmount)} / {formatCurrency(goal.targetAmount)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Target: {new Date(goal.targetDate).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <Progress 
                  value={(goal.currentAmount / goal.targetAmount) * 100} 
                  className="h-2"
                />
                <div className="text-xs text-muted-foreground mt-1">
                  {((goal.currentAmount / goal.targetAmount) * 100).toFixed(1)}% complete
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* AI Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BrainCircuit className="h-5 w-5" />
            AI-Powered Recommendations
          </CardTitle>
          <CardDescription>
            Personalized insights to optimize your finances
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {aiRecommendations.map((rec) => (
              <div key={rec.id} className="p-4 border rounded-lg">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{rec.title}</h3>
                      <Badge className={getPriorityColor(rec.priority)}>
                        {rec.priority}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{rec.description}</p>
                    <div className="text-sm font-medium text-green-600">
                      Potential savings: {formatCurrency(rec.impact)}/month
                    </div>
                  </div>
                  <Button size="sm" variant="outline">
                    Apply
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}