import { Badge } from "@/components/ui/badge"
import { DollarSign, PieChart, Users, FileText, ArrowUpRight, ArrowDownRight, UserPlus } from "lucide-react"
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
      if (user?.id) {
        const userDocumentKey = `uploadedDocuments_${user.id}`
        const globalDocumentKey = 'uploadedDocuments'
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

      const { data: portfolios, error: portfolioError } = await supabase
        .from('investment_portfolios')
        .select('total_value, day_change, day_change_percent, positions')
        .eq('user_id', user.id)
      
      if (!portfolioError && portfolios) {
        const totalValue = portfolios.reduce((sum, p) => sum + Number(p.total_value), 0)
        const totalDayChange = portfolios.reduce((sum, p) => sum + Number(p.day_change || 0), 0)
        const totalPositions = portfolios.reduce((sum, p) => sum + (Array.isArray(p.positions) ? p.positions.length : 0), 0)
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

  const iconGradients = [
    "from-emerald-400 to-emerald-600",
    "from-sky-400 to-blue-600",
    "from-amber-400 to-orange-500",
    "from-rose-400 to-pink-600",
    "from-cyan-400 to-teal-600",
  ]

  const stats = [
    {
      title: "Total Portfolio Value",
      value: hasFinancialData ? formatCurrency(combinedTotal) : "$0",
      change: hasFinancialData ? formatCurrency(portfolioData.dayChange) : "Connect accounts",
      trend: portfolioData.dayChange >= 0 ? "up" : "down",
      icon: DollarSign,
      description: hasFinancialData ? "From connected accounts & investments" : "Connect accounts to see portfolio value",
    },
    {
      title: "Active Investments",
      value: connectedAccountsCount > 0 ? `${portfolioData.activeInvestments + connectedAccountsCount}` : "0",
      change: connectedAccountsCount > 0 ? `${connectedAccountsCount} accounts` : "No accounts",
      trend: "up",
      icon: PieChart,
      description: connectedAccountsCount > 0 ? `${connectedAccountsCount} connected accounts` : "Connect accounts to track investments",
    },
    {
      title: "Family Office Members",
      value: familyOfficeMemberCount.toString(),
      change: familyOfficeMemberCount > 0 ? "+1" : "0",
      trend: "up",
      icon: Users,
      description: "Active team members",
    },
    {
      title: "Family Members",
      value: familyMemberCount.toString(),
      change: familyMemberCount > 0 ? "+1" : "0",
      trend: "up",
      icon: UserPlus,
      description: "Family network",
    },
    {
      title: "Family Documents",
      value: documentCount.toString(),
      change: documentCount > 0 ? "+5" : "0",
      trend: "up",
      icon: FileText,
      description: "Managed documents",
    }
  ]

  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5">
      {stats.map((stat, idx) => {
        const Icon = stat.icon
        const TrendIcon = stat.trend === "up" ? ArrowUpRight : ArrowDownRight
        
        return (
          <div key={stat.title} className="glass-card rounded-2xl p-4 sm:p-5 hover:shadow-medium transition-smooth group">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {stat.title}
              </p>
              <div className={`p-2 rounded-xl bg-gradient-to-br ${iconGradients[idx]} shadow-lg`}>
                <Icon className="h-4 w-4 text-white" />
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-2xl font-bold text-foreground">
                {stat.value}
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs px-2 py-0.5 bg-secondary/10 text-secondary border-0">
                  <TrendIcon className="h-3 w-3 mr-0.5" />
                  {stat.change}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground leading-snug">
                {stat.description}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
