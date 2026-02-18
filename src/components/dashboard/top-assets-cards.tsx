import { useEffect, useState } from 'react'
import { TrendingUp, TrendingDown, MoreHorizontal } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/contexts/AuthContext'

export function TopAssetsCards() {
  const { user } = useAuth()
  const [assets, setAssets] = useState<any[]>([])

  useEffect(() => {
    if (!user?.id) return
    fetchAssets()
  }, [user?.id])

  const fetchAssets = async () => {
    if (!user?.id) return

    const { data } = await supabase
      .from('connected_accounts')
      .select('id, account_name, balance, day_change_percent, created_at, account_type')
      .eq('user_id', user.id)
      .order('balance', { ascending: false })
      .limit(4)

    setAssets(data || [])
  }

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(amount)

  const formatDate = (dateStr: string) => {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  if (assets.length === 0) return null

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-bold text-foreground">Top Assets</h3>
        <span className="text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-smooth">See all</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {assets.map((asset) => {
          const change = asset.day_change_percent || 0
          return (
            <div key={asset.id} className="glass-card rounded-2xl p-4 hover:shadow-medium transition-smooth">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm font-semibold text-foreground truncate max-w-[140px]">
                    {asset.account_name?.replace('VNCI, LLC - ', '') || 'Account'}
                  </p>
                  <p className="text-xs text-muted-foreground">{formatDate(asset.created_at)}</p>
                </div>
                <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-lg font-bold text-foreground">{formatCurrency(asset.balance || 0)}</p>
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  change >= 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'
                }`}>
                  {change >= 0 ? '+' : ''}{change.toFixed(1)}%
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
