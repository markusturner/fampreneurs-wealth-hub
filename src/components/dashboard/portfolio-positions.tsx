import { useEffect, useState } from 'react'
import { Wallet, Building2, CreditCard, PiggyBank, Landmark } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/contexts/AuthContext'

const accountIcons: Record<string, any> = {
  checking: CreditCard,
  savings: PiggyBank,
  investment: Wallet,
  business: Building2,
  default: Landmark,
}

export function PortfolioPositions() {
  const { user } = useAuth()
  const [positions, setPositions] = useState<any[]>([])

  useEffect(() => {
    if (!user?.id) return
    fetchPositions()
  }, [user?.id])

  const fetchPositions = async () => {
    if (!user?.id) return

    const { data } = await supabase
      .from('connected_accounts')
      .select('id, account_name, balance, account_type, provider')
      .eq('user_id', user.id)
      .order('balance', { ascending: false })
      .limit(5)

    setPositions(data || [])
  }

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(amount)

  const getIcon = (type: string) => {
    const key = type?.toLowerCase() || 'default'
    return accountIcons[key] || accountIcons.default
  }

  return (
    <div className="glass-card rounded-2xl p-5 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-bold text-foreground">Portfolio Positions</h3>
      </div>

      {positions.length > 0 ? (
        <div className="space-y-1 flex-1">
          {positions.map((pos, i) => {
            const Icon = getIcon(pos.account_type)
            return (
              <div
                key={pos.id}
                className={`flex items-center gap-3 p-3 rounded-xl transition-smooth ${
                  i === 1 ? 'bg-primary/10' : 'hover:bg-muted/30'
                }`}
              >
                <div className="p-2 rounded-xl bg-muted/50">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {pos.account_name?.replace('VNCI, LLC - ', '') || 'Account'}
                  </p>
                  <p className="text-xs text-muted-foreground capitalize">{pos.account_type || pos.provider}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-foreground">{formatCurrency(pos.balance || 0)}</p>
                  <p className="text-xs text-muted-foreground">Total</p>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="text-center py-6 flex-1 flex items-center justify-center">
          <p className="text-sm text-muted-foreground">No positions yet. Connect your accounts.</p>
        </div>
      )}
    </div>
  )
}
