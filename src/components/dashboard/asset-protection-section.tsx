import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/integrations/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { AlertTriangle, ShieldCheck } from 'lucide-react'
import { getProtectionLevel, PROTECTION_CLASS, PROTECTION_LABEL, type ProtectionLevel } from '@/lib/entities'

interface Row {
  id: string
  account_name: string
  account_type: string | null
  balance: number
  owner_entity: string | null
  level: ProtectionLevel
}

const currency = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)

export function AssetProtectionSection() {
  const { user } = useAuth()
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user?.id) { setLoading(false); return }
    let cancelled = false

    const load = async () => {
      const { data } = await supabase
        .from('connected_accounts')
        .select('id, account_name, account_type, balance, manual_balance_override, manual_balance_amount, owner_entity')
        .eq('user_id', user.id)

      if (cancelled) return
      setRows(
        (data || []).map((a: any) => ({
          id: a.id,
          account_name: a.account_name,
          account_type: a.account_type,
          balance: Number(a.manual_balance_override ? a.manual_balance_amount || 0 : a.balance || 0),
          owner_entity: a.owner_entity,
          level: getProtectionLevel(a.owner_entity),
        }))
      )
      setLoading(false)
    }

    load()
    const channel = supabase
      .channel('asset-protection-accounts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'connected_accounts', filter: `user_id=eq.${user.id}` }, () => load())
      .subscribe()

    return () => { cancelled = true; supabase.removeChannel(channel) }
  }, [user?.id])

  const total = rows.reduce((s, r) => s + r.balance, 0)
  const protectedValue = rows.filter(r => r.level === 'protected').reduce((s, r) => s + r.balance, 0)
  const pct = total > 0 ? Math.round((protectedValue / total) * 100) : 0
  const attention = rows.filter(r => r.level !== 'protected')

  if (loading) {
    return <div className="h-32 rounded-xl bg-muted animate-pulse" />
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            Protected
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-end justify-between">
            <span className="text-3xl font-bold">{pct}%</span>
            <span className="text-xs text-muted-foreground">
              {currency(protectedValue)} of {currency(total)}
            </span>
          </div>
          <Progress value={pct} className="h-2" />
          <p className="text-xs text-muted-foreground">
            {rows.filter(r => r.level === 'protected').length} of {rows.length} accounts are titled inside a protective entity.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            What needs attention
          </CardTitle>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">Add accounts in the Family Office to see protection gaps.</p>
          ) : attention.length === 0 ? (
            <p className="text-sm text-muted-foreground">Every account is assigned to a protective entity. Nice work.</p>
          ) : (
            <div className="space-y-1.5 max-h-52 overflow-y-auto">
              {attention.map(r => (
                <div key={r.id} className="flex items-center justify-between gap-2 rounded-lg border p-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{r.account_name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {r.owner_entity || 'No entity assigned'} • {currency(r.balance)}
                    </p>
                  </div>
                  <Badge variant="outline" className={`text-xs shrink-0 ${PROTECTION_CLASS[r.level]}`}>
                    {PROTECTION_LABEL[r.level]}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
