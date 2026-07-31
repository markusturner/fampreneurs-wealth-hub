import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/integrations/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { getProtectionLevel } from '@/lib/entities'

interface Node {
  key: string
  label: string
  value: number
  count: number
  kind: 'trust' | 'entity' | 'personal'
}

const currency = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)

const KIND_CLASS: Record<Node['kind'], string> = {
  trust: 'text-primary',
  entity: 'text-accent',
  personal: 'text-destructive',
}

function classify(entity: string | null): Node['kind'] {
  if (getProtectionLevel(entity) === 'unprotected') return 'personal'
  if ((entity || '').toLowerCase().includes('trust')) return 'trust'
  return 'entity'
}

export function OwnershipMap() {
  const { user } = useAuth()
  const [rows, setRows] = useState<{ entity: string | null; balance: number }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user?.id) { setLoading(false); return }
    let cancelled = false

    const load = async () => {
      const { data } = await supabase
        .from('connected_accounts')
        .select('balance, manual_balance_override, manual_balance_amount, owner_entity')
        .eq('user_id', user.id)
      if (cancelled) return
      setRows(
        (data || []).map((a: any) => ({
          entity: a.owner_entity,
          balance: Number(a.manual_balance_override ? a.manual_balance_amount || 0 : a.balance || 0),
        }))
      )
      setLoading(false)
    }

    load()
    const channel = supabase
      .channel('ownership-map-accounts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'connected_accounts', filter: `user_id=eq.${user.id}` }, () => load())
      .subscribe()

    return () => { cancelled = true; supabase.removeChannel(channel) }
  }, [user?.id])

  const nodes = useMemo<Node[]>(() => {
    const map = new Map<string, Node>()
    for (const r of rows) {
      const label = r.entity || 'Personal Name'
      const existing = map.get(label)
      if (existing) {
        existing.value += r.balance
        existing.count += 1
      } else {
        map.set(label, { key: label, label, value: r.balance, count: 1, kind: classify(r.entity) })
      }
    }
    return Array.from(map.values()).sort((a, b) => b.value - a.value)
  }, [rows])

  if (loading) return <div className="h-64 rounded-xl bg-muted animate-pulse" />

  const W = 900
  const H = 520
  const cx = W / 2
  const cy = H / 2
  const maxValue = Math.max(1, ...nodes.map(n => n.value))
  const radiusFor = (v: number) => 20 + Math.round(24 * Math.sqrt(v / maxValue))

  const placed = nodes.map((n, i) => {
    const angle = (-Math.PI / 2) + (i * 2 * Math.PI) / Math.max(1, nodes.length)
    const rx = 300
    const ry = 165
    return { ...n, x: cx + rx * Math.cos(angle), y: cy + ry * Math.sin(angle), r: radiusFor(n.value) }
  })

  return (
    <div className="space-y-2">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Ownership map</h2>
        <p className="text-sm text-muted-foreground">
          Each ring is a legal owner. Dashed lines are assets a court can reach.
        </p>
      </div>

      <Card>
        <CardContent className="p-2 sm:p-4">
          {placed.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              Assign entities to your accounts in the Family Office to see your ownership map.
            </p>
          ) : (
            <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Ownership map of accounts by legal owner">
              {placed.map(n => (
                <line
                  key={`l-${n.key}`}
                  x1={cx} y1={cy} x2={n.x} y2={n.y}
                  className={KIND_CLASS[n.kind]}
                  stroke="currentColor"
                  strokeWidth={1}
                  strokeOpacity={n.kind === 'personal' ? 0.7 : 0.4}
                  strokeDasharray={n.kind === 'personal' ? '4 4' : undefined}
                />
              ))}

              <circle cx={cx} cy={cy} r={38} fill="hsl(var(--card))" stroke="currentColor" className="text-foreground" strokeWidth={1} />
              <text x={cx} y={cy - 2} textAnchor="middle" className="fill-foreground" fontSize={11} letterSpacing={1}>FAMILY</text>
              <text x={cx} y={cy + 12} textAnchor="middle" className="fill-muted-foreground" fontSize={10}>office</text>

              {placed.map(n => (
                <g key={n.key} className={KIND_CLASS[n.kind]}>
                  <circle cx={n.x} cy={n.y} r={n.r} fill="hsl(var(--card))" stroke="currentColor" strokeWidth={1.25} />
                  <circle cx={n.x} cy={n.y} r={3} fill="currentColor" />
                  <text
                    x={n.x}
                    y={n.y + n.r + 18}
                    textAnchor="middle"
                    className="fill-foreground"
                    fontSize={11}
                    letterSpacing={1}
                  >
                    {n.label.toUpperCase().slice(0, 34)}
                  </text>
                  <text x={n.x} y={n.y + n.r + 33} textAnchor="middle" className="fill-muted-foreground" fontSize={10}>
                    {currency(n.value)} · {n.count} {n.count === 1 ? 'asset' : 'assets'}
                  </text>
                </g>
              ))}
            </svg>
          )}

          <div className="mt-2 flex flex-wrap items-center justify-center gap-4 border-t pt-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-primary" /> Trust owned</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-accent" /> Entity owned</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-destructive" /> Personal name, exposed</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
