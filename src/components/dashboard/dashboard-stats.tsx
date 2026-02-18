import { DollarSign, PieChart, TrendingUp, ArrowUpRight, ArrowDownRight } from "lucide-react"
import { useEffect, useState } from "react"
import { supabase } from "@/integrations/supabase/client"
import { useAuth } from "@/contexts/AuthContext"

export function DashboardStats() {
  const { user } = useAuth()
  const [connectedAccountsBalanceTotal, setConnectedAccountsBalanceTotal] = useState(0)
  const [portfolioData, setPortfolioData] = useState({
    totalValue: 0,
    dayChange: 0,
    dayChangePercent: 0,
    activeInvestments: 0,
    connectedAccounts: 0
  })

  useEffect(() => {
    if (!user) return
    fetchData()
  }, [user])

  const fetchData = async () => {
    if (!user?.id) return

    const [{ data: accountsData }, { data: portfolios }] = await Promise.all([
      supabase.from('connected_accounts').select('balance').eq('user_id', user.id),
      supabase.from('investment_portfolios').select('total_value, day_change, day_change_percent, positions').eq('user_id', user.id)
    ])

    if (accountsData) {
      setConnectedAccountsBalanceTotal(accountsData.reduce((s, a) => s + Number(a.balance || 0), 0))
    }

    if (portfolios) {
      const totalValue = portfolios.reduce((sum, p) => sum + Number(p.total_value), 0)
      const totalDayChange = portfolios.reduce((sum, p) => sum + Number(p.day_change || 0), 0)
      const totalPositions = portfolios.reduce((sum, p) => sum + (Array.isArray(p.positions) ? p.positions.length : 0), 0)
      setPortfolioData({
        totalValue,
        dayChange: totalDayChange,
        dayChangePercent: totalValue > 0 ? (totalDayChange / (totalValue - totalDayChange)) * 100 : 0,
        activeInvestments: totalPositions,
        connectedAccounts: portfolios.length
      })
    }
  }

  const combinedTotal = (portfolioData.totalValue || 0) + connectedAccountsBalanceTotal

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount)

  const stats = [
    {
      title: "Total Value",
      value: formatCurrency(combinedTotal),
      trend: portfolioData.dayChange >= 0 ? "up" as const : "down" as const,
    },
    {
      title: "Market Value",
      value: formatCurrency(portfolioData.totalValue),
      trend: "up" as const,
    },
    {
      title: "Return Rate",
      value: formatCurrency(connectedAccountsBalanceTotal),
      trend: "up" as const,
    },
  ]

  return (
    <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-3">
      {stats.map((stat) => {
        const TrendIcon = stat.trend === "up" ? ArrowUpRight : ArrowDownRight
        return (
          <div key={stat.title} className="glass-card rounded-2xl p-5 hover:shadow-medium transition-smooth group">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {stat.title}
              </p>
              <div className="p-2 rounded-xl bg-muted/50 group-hover:bg-muted/80 transition-smooth">
                <TrendIcon className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-foreground">
              {stat.value}
            </div>
          </div>
        )
      })}
    </div>
  )
}
