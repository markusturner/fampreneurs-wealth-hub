import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, TrendingDown, DollarSign, PieChart, Users, FileText, ArrowUpRight, ArrowDownRight, UserPlus, Home, Briefcase } from "lucide-react"
import { useEffect, useState } from "react"
import { supabase } from "@/integrations/supabase/client"
import { useAuth } from "@/contexts/AuthContext"


export function DashboardStats() {
  const { user } = useAuth()
  const [documentCount, setDocumentCount] = useState(0)
  const [familyOfficeMemberCount, setFamilyOfficeMemberCount] = useState(0)
  const [familyMemberCount, setFamilyMemberCount] = useState(0)
  const [connectedAccountsCount, setConnectedAccountsCount] = useState(0)
  // Alias to prevent runtime errors from stale references during HMR
  const financialAdvisorCount = familyOfficeMemberCount
  const [portfolioData, setPortfolioData] = useState({
    totalValue: 0,
    dayChange: 0,
    dayChangePercent: 0,
    activeInvestments: 0,
    connectedAccounts: 0
  })

  useEffect(() => {
    if (!user) return

    const fetchCounts = async () => {
      // Fetch document count from family office secure documents
      const { count: docCount, error: docError } = await supabase
        .from('family_office_secure_documents')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
      
      if (!docError && docCount !== null) {
        setDocumentCount(docCount)
      }

      // Fetch family office member count for current user
      const { count: officeCount, error: officeError } = await supabase
        .from('family_office_members')
        .select('*', { count: 'exact', head: true })
        .eq('added_by', user.id)
        .eq('status', 'active')
      
      if (!officeError && officeCount !== null) {
        setFamilyOfficeMemberCount(officeCount)
      }

      // Fetch family member count for current user
      const { count: familyCount, error: familyError } = await supabase
        .from('family_members')
        .select('*', { count: 'exact', head: true })
        .eq('added_by', user.id)
        .neq('status', 'inactive')
      
      if (!familyError && familyCount !== null) {
        setFamilyMemberCount(familyCount)
      }

      // Fetch connected accounts count for current user
      const { count: accountsCount, error: accountsError } = await supabase
        .from('connected_accounts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
      
      if (!accountsError && accountsCount !== null) {
        setConnectedAccountsCount(accountsCount)
      }

      // Fetch portfolio data for current user
      const { data: portfolios, error: portfolioError } = await supabase
        .from('investment_portfolios')
        .select('total_value, day_change, day_change_percent, positions')
        .eq('user_id', user.id)
      
      if (!portfolioError && portfolios) {
        const totalValue = portfolios.reduce((sum, p) => sum + Number(p.total_value), 0)
        const totalDayChange = portfolios.reduce((sum, p) => sum + Number(p.day_change || 0), 0)
        const totalPositions = portfolios.reduce((sum, p) => sum + (Array.isArray(p.positions) ? p.positions.length : 0), 0)
        
        // Calculate weighted average percentage change
        const weightedChangePercent = totalValue > 0 
          ? (totalDayChange / (totalValue - totalDayChange)) * 100
          : 0

        setPortfolioData({
          totalValue,
          dayChange: totalDayChange,
          dayChangePercent: weightedChangePercent,
          activeInvestments: totalPositions,
          connectedAccounts: portfolios.length
        })
      }
    }

    fetchCounts()
  }, [user])

  // Get user-specific connected accounts data from localStorage
  const getConnectedAccountsData = () => {
    if (!user) return []
    
    const userKey = `connectedAccounts_${user.id}`
    const deletedKey = `deletedAccounts_${user.id}`
    
    const deletedAccounts = JSON.parse(localStorage.getItem(deletedKey) || '[]')
    const savedAccounts = JSON.parse(localStorage.getItem(userKey) || '[]')
    return savedAccounts.filter((account: any) => !deletedAccounts.includes(account.id))
  }

  const connectedAccounts = getConnectedAccountsData()
  const hasFinancialData = portfolioData.totalValue > 0 || connectedAccounts.length > 0

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const stats = [
    {
      title: "Total Portfolio Value",
      value: hasFinancialData 
        ? formatCurrency(portfolioData.totalValue + connectedAccounts.reduce((sum, acc) => sum + (acc.balance || 0), 0))
        : "$0",
      change: hasFinancialData ? formatCurrency(portfolioData.dayChange) : "Connect accounts",
      trend: portfolioData.dayChange >= 0 ? "up" : "down",
      icon: DollarSign,
      iconColor: "#10b981", // Green
      description: hasFinancialData ? "From connected accounts & investments" : "Connect accounts to see portfolio value",
      tagColor: "#ffb500" // Orange
    },
    {
      title: "Active Investments",
      value: connectedAccountsCount > 0 
        ? `${portfolioData.activeInvestments + connectedAccountsCount}`
        : "0",
      change: connectedAccountsCount > 0 ? `${connectedAccountsCount} accounts` : "No accounts",
      trend: "up", 
      icon: PieChart,
      iconColor: "#3b82f6", // Blue
      description: connectedAccountsCount > 0 ? `${connectedAccountsCount} connected accounts` : "Connect accounts to track investments",
      tagColor: "#ffb500" // Orange
    },
    {
      title: "Family Office Members",
      value: familyOfficeMemberCount.toString(),
      change: familyOfficeMemberCount > 0 ? "+1" : "0",
      trend: "up",
      icon: Users,
      iconColor: "#f59e0b", // Yellow/Orange
      description: "Active team members",
      tagColor: "#ffb500" // Orange
    },
    {
      title: "Family Members",
      value: familyMemberCount.toString(),
      change: familyMemberCount > 0 ? "+1" : "0",
      trend: "up",
      icon: UserPlus,
      iconColor: "#ef4444", // Red
      description: "Family network",
      tagColor: "#ffb500" // Orange
    },
    {
      title: "Family Documents",
      value: documentCount.toString(),
      change: documentCount > 0 ? "+5" : "0",
      trend: "up",
      icon: FileText,
      iconColor: "#06b6d4", // Cyan
      description: "Managed documents",
      tagColor: "#ffb500" // Orange
    }
  ]
  return (
    <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5">
      {stats.map((stat) => {
        const Icon = stat.icon
        const TrendIcon = stat.trend === "up" ? ArrowUpRight : ArrowDownRight
        
        return (
          <Card key={stat.title} className="shadow-soft hover:shadow-medium transition-smooth">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-6">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <Icon className="h-4 w-4 flex-shrink-0" style={{ color: stat.iconColor }} />
            </CardHeader>
            <CardContent className="p-3 sm:p-6 pt-0">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="text-xl sm:text-2xl font-bold truncate text-foreground">
                    {stat.value}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 leading-tight">
                    {stat.description}
                  </p>
                </div>
                <Badge 
                  className="ml-2 flex-shrink-0"
                  style={{ backgroundColor: stat.tagColor, color: '#290a52' }}
                >
                  <TrendIcon className="h-3 w-3 mr-1" />
                  <span className="text-xs">{stat.change}</span>
                </Badge>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}