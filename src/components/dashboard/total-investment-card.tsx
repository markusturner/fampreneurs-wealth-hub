import { useEffect, useState } from 'react'
import { TrendingUp, TrendingDown, Wallet } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/contexts/AuthContext'

export function TotalInvestmentCard() {
  const { user } = useAuth()
  const [totalValue, setTotalValue] = useState(0)
  const [dayChangePercent, setDayChangePercent] = useState(0)
  const [topHoldings, setTopHoldings] = useState<any[]>([])

  useEffect(() => {
    if (!user?.id) return
    fetchData()
  }, [user?.id])

  const fetchData = async () => {
    if (!user?.id) return

    const [{ data: portfolios }, { data: accounts }] = await Promise.all([
      supabase.from('investment_portfolios').select('total_value, day_change, day_change_percent, positions').eq('user_id', user.id),
      supabase.from('connected_accounts').select('account_name, balance, day_change_percent, account_type').eq('user_id', user.id)
    ])

    const portfolioTotal = portfolios?.reduce((s, p) => s + Number(p.total_value), 0) || 0
    const accountsTotal = accounts?.reduce((s, a) => s + Number(a.balance || 0), 0) || 0
    const total = portfolioTotal + accountsTotal
    setTotalValue(total)

    const totalDayChange = portfolios?.reduce((s, p) => s + Number(p.day_change || 0), 0) || 0
    setDayChangePercent(total > 0 ? (totalDayChange / (total - totalDayChange)) * 100 : 0)

    // Build top holdings from accounts
    const holdings = (accounts || [])
      .filter(a => a.balance && a.balance > 0)
      .sort((a, b) => (b.balance || 0) - (a.balance || 0))
      .slice(0, 4)
      .map(a => ({
        name: a.account_name?.replace('VNCI, LLC - ', '') || 'Account',
        value: a.balance || 0,
        change: a.day_change_percent || 0,
        type: a.account_type
      }))
    setTopHoldings(holdings)
  }

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(amount)

  const formatCompact = (amount: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount)

  return (
    <div className="glass-card rounded-2xl overflow-hidden h-full flex flex-col">
      {/* Gradient Header */}
      <div className="relative p-5 bg-gradient-to-br from-primary/80 via-primary/60 to-accent/40 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[hsl(270,80%,30%)] via-[hsl(270,60%,40%)] to-[hsl(280,70%,50%)] opacity-80" />
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-8 translate-x-8 blur-2xl" />
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-1.5 rounded-lg bg-white/20">
              <Wallet className="h-4 w-4 text-white" />
            </div>
            <span className="text-sm font-medium text-white/90">Total Investment</span>
          </div>
          <div className="text-3xl font-bold text-white mb-1">
            {formatCurrency(totalValue)}
          </div>
          <div className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
            dayChangePercent >= 0 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'
          }`}>
            {dayChangePercent >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {dayChangePercent >= 0 ? '+' : ''}{dayChangePercent.toFixed(1)}%
          </div>
        </div>
      </div>

      {/* Holdings List */}
      <div className="p-4 flex-1">
        {topHoldings.length > 0 ? (
          <div className="space-y-3">
            {topHoldings.map((holding, i) => (
              <div key={i} className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground truncate max-w-[120px]">{holding.name}</span>
                <div className="flex items-center gap-3 text-right">
                  <span className="text-sm font-medium text-foreground">{formatCompact(holding.value)}</span>
                  <span className={`text-xs font-medium flex items-center gap-0.5 ${
                    holding.change >= 0 ? 'text-emerald-500' : 'text-red-500'
                  }`}>
                    {holding.change >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    {Math.abs(holding.change).toFixed(1)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">Connect accounts to see holdings</p>
        )}
      </div>
    </div>
  )
}
