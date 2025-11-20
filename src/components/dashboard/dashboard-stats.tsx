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
  const [connectedAccountsBalanceTotal, setConnectedAccountsBalanceTotal] = useState(0)
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
      // Fetch document count from localStorage using user-specific key
      if (user?.id) {
        const userDocumentKey = `uploadedDocuments_${user.id}`
        const globalDocumentKey = 'uploadedDocuments'
        
        // Try user-specific key first, then global key
        let uploadedDocuments = localStorage.getItem(userDocumentKey)
        if (!uploadedDocuments) {
          uploadedDocuments = localStorage.getItem(globalDocumentKey)
        }
        
        if (uploadedDocuments) {
          try {
            const parsed = JSON.parse(uploadedDocuments)
            setDocumentCount(Object.keys(parsed).length)
          } catch {
            setDocumentCount(0)
          }
        } else {
          setDocumentCount(0)
        }
      }

      // Fetch members once and compute counts to match Members tab logic
      const { data: allMembers, error: membersError } = await supabase
        .from('family_members')
        .select('office_role, family_position, status')
        .eq('added_by', user.id)
      
      if (!membersError && allMembers) {
        const officeList = allMembers.filter((m: any) => m.office_role !== null || m.family_position === 'Family Office Team')
        const familyList = allMembers.filter((m: any) => m.office_role === null && m.family_position !== 'Family Office Team' && m.status !== 'inactive')
        setFamilyOfficeMemberCount(officeList.length)
        setFamilyMemberCount(familyList.length)
      }

      // Fetch connected accounts count and balances for current user
      const { count: accountsCount, error: accountsError } = await supabase
        .from('connected_accounts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
      
      if (!accountsError && accountsCount !== null) {
        setConnectedAccountsCount(accountsCount)
      }

      const { data: accountsData, error: accountsDataError } = await supabase
        .from('connected_accounts')
        .select('balance')
        .eq('user_id', user.id)

      if (!accountsDataError && accountsData) {
        const sum = accountsData.reduce((s: number, a: any) => s + Number(a.balance || 0), 0)
        setConnectedAccountsBalanceTotal(sum)
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
  const connectedLocalTotal = connectedAccounts.reduce((sum: number, acc: any) => sum + (acc.balance || 0), 0)
  const combinedTotal = (portfolioData.totalValue || 0) + (user ? connectedAccountsBalanceTotal : connectedLocalTotal)
  const hasFinancialData = combinedTotal > 0
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
        ? formatCurrency(combinedTotal)
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
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5">
      {stats.map((stat) => {
        const Icon = stat.icon
        const TrendIcon = stat.trend === "up" ? ArrowUpRight : ArrowDownRight
        
        return (
          <Card key={stat.title} className="shadow-soft hover:shadow-medium transition-smooth">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 p-4 sm:p-6">
              <CardTitle className="text-sm sm:text-sm font-semibold text-muted-foreground">
                {stat.title}
              </CardTitle>
              <Icon className="h-5 w-5 sm:h-4 sm:w-4 flex-shrink-0" style={{ color: stat.iconColor }} />
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0">
              <div className="space-y-3">
                <div className="text-2xl sm:text-2xl font-bold text-foreground">
                  {stat.value}
                </div>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm sm:text-xs text-muted-foreground leading-snug flex-1">
                    {stat.description}
                  </p>
                  <Badge 
                    className="flex-shrink-0 px-2 py-1"
                    style={{ backgroundColor: stat.tagColor, color: '#290a52' }}
                  >
                    <TrendIcon className="h-3 w-3 mr-1" />
                    <span className="text-xs font-medium">{stat.change}</span>
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
