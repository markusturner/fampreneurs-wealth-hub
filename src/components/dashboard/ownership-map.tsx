import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/integrations/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { getProtectionLevel, displayEntityName } from '@/lib/entities'
import { DEMO_DFO_ACCOUNTS, useDfoDemo } from '@/lib/dfo-demo'

interface Node {
  key: string
  label: string
  value: number
  count: number
  kind: 'trust' | 'entity' | 'personal'
}

const currency = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)

const KIND_STYLE: Record<Node['kind'], { stroke: string; fill: string; text: string }> = {
  trust: {
    stroke: 'hsl(var(--primary))',
    fill: 'hsl(var(--primary) / 0.07)',
    text: 'hsl(var(--primary))',
  },
  entity: {
    stroke: 'hsl(var(--accent))',
    fill: 'hsl(var(--accent) / 0.07)',
    text: 'hsl(var(--accent))',
  },
  personal: {
    stroke: 'hsl(var(--destructive))',
    fill: 'hsl(var(--destructive) / 0.07)',
    text: 'hsl(var(--destructive))',
  },
}

function classify(entity: string | null): Node['kind'] {
  if (getProtectionLevel(entity) === 'unprotected') return 'personal'
  if ((entity || '').toLowerCase().includes('trust')) return 'trust'
  return 'entity'
}

export function OwnershipMap() {
  const { user } = useAuth()
  const demoMode = useDfoDemo()
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
    const visibleRows = demoMode
      ? DEMO_DFO_ACCOUNTS.map(account => ({ entity: account.owner_entity, balance: account.balance }))
      : rows
    for (const r of visibleRows) {
      const label = displayEntityName(r.entity) || 'Personal Name'
      const kind = classify(r.entity)
      const existing = map.get(label)
      if (existing) {
        existing.value += r.balance
        existing.count += 1
      } else {
        map.set(label, { key: label, label, value: r.balance, count: 1, kind })
      }
    }
    return Array.from(map.values()).sort((a, b) => b.value - a.value)
  }, [demoMode, rows])

  if (loading && !demoMode) return <div className="h-64 rounded-xl bg-muted animate-pulse" />

  const W = 900
  const H = 520
  const cx = W / 2
  const cy = H / 2
  const hubR = 52
  const maxValue = Math.max(1, ...nodes.map(n => n.value))
  const radiusFor = (v: number) => 26 + Math.round(26 * Math.sqrt(v / maxValue))

  const placed = nodes.map((n, i) => {
    const angle = (-Math.PI / 2) + (i * 2 * Math.PI) / Math.max(1, nodes.length)
    const rx = 300
    const ry = 168
    const x = cx + rx * Math.cos(angle)
    const y = cy + ry * Math.sin(angle)
    // Gently curve each connector so it sweeps rather than cuts straight across.
    const dx = x - cx
    const dy = y - cy
    const len = Math.max(1, Math.hypot(dx, dy))
    const px = -dy / len
    const py = dx / len
    const bend = len * 0.14
    const qx = cx + dx * 0.5 + px * bend
    const qy = cy + dy * 0.5 + py * bend
    return { ...n, x, y, r: radiusFor(n.value), qx, qy, angle }
  })

  return (
    <div className="space-y-2">

      <Card>
        <CardContent className="p-2 sm:p-4">
          {placed.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              Assign entities to your accounts in the Family Office to see your ownership map.
            </p>
          ) : (
            <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Ownership map of accounts by legal owner">
              <defs>
                <radialGradient id="ownership-map-hub" cx="50%" cy="42%" r="65%">
                  <stop offset="0%" stopColor="hsl(var(--primary) / 0.16)" />
                  <stop offset="100%" stopColor="hsl(var(--card))" />
                </radialGradient>
                <filter id="ownership-map-soft" x="-40%" y="-40%" width="180%" height="180%">
                  <feDropShadow dx="0" dy="3" stdDeviation="6" floodColor="hsl(var(--foreground))" floodOpacity="0.07" />
                </filter>
              </defs>

              {/* Faint orbit path the nodes sit on */}
              <ellipse
                cx={cx}
                cy={cy}
                rx={300}
                ry={168}
                fill="none"
                stroke="hsl(var(--muted-foreground))"
                strokeWidth={1}
                strokeDasharray="2 8"
                strokeOpacity={0.35}
              />

              {/* Connectors from the family hub out to each owner */}
              {placed.map(n => {
                const style = KIND_STYLE[n.kind]
                return (
                  <path
                    key={`c-${n.key}`}
                    d={`M ${cx} ${cy} Q ${n.qx} ${n.qy} ${n.x} ${n.y}`}
                    fill="none"
                    stroke={style.stroke}
                    strokeWidth={n.kind === 'personal' ? 1.5 : 1.25}
                    strokeOpacity={n.kind === 'personal' ? 0.75 : 0.45}
                    strokeDasharray={n.kind === 'personal' ? '5 5' : undefined}
                    strokeLinecap="round"
                  />
                )
              })}

              {/* Center hub */}
              <g filter="url(#ownership-map-soft)">
                <circle cx={cx} cy={cy} r={hubR} fill="url(#ownership-map-hub)" stroke="hsl(var(--primary) / 0.4)" strokeWidth={1.5} />
                <circle cx={cx} cy={cy} r={hubR - 7} fill="none" stroke="hsl(var(--border))" strokeWidth={1} />
              </g>
              <text x={cx} y={cy - 4} textAnchor="middle" className="fill-foreground" fontSize={12} fontWeight={600} letterSpacing={1.5}>FAMILY</text>
              <text x={cx} y={cy + 12} textAnchor="middle" className="fill-muted-foreground" fontSize={10} letterSpacing={1.5}>OFFICE</text>

              {placed.map(n => {
                const style = KIND_STYLE[n.kind]
                return (
                  <g key={n.key}>
                    <title>{`${n.label} - ${currency(n.value)} across ${n.count} ${n.count === 1 ? 'account' : 'accounts'}`}</title>
                    <circle cx={n.x} cy={n.y} r={n.r} filter="url(#ownership-map-soft)" fill={style.fill} stroke={style.stroke} strokeWidth={1.5} />
                    <circle cx={n.x} cy={n.y} r={n.r} fill="none" stroke={style.stroke} strokeWidth={1} strokeOpacity={0.25} transform={`translate(${n.x} ${n.y}) scale(1.14) translate(${-n.x} ${-n.y})`} />
                    <circle cx={n.x} cy={n.y} r={3.5} fill={style.stroke} />
                    <text
                      x={n.x}
                      y={n.y + n.r + 20}
                      textAnchor="middle"
                      className="fill-foreground"
                      fontSize={11}
                      fontWeight={600}
                      letterSpacing={1}
                    >
                      {n.label.toUpperCase().slice(0, 34)}
                    </text>
                    <text x={n.x} y={n.y + n.r + 35} textAnchor="middle" className="fill-muted-foreground" fontSize={10}>
                      {currency(n.value)} · {n.count} {n.count === 1 ? 'asset' : 'assets'}
                    </text>
                  </g>
                )
              })}
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
