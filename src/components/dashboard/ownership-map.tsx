import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/integrations/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { displayEntityName, getStructureLayer, type StructureLayer } from '@/lib/entities'
import { DEMO_DFO_ACCOUNTS, useDfoDemo } from '@/lib/dfo-demo'
import { Building2 } from 'lucide-react'

interface Node { label: string; value: number; count: number }

const currency = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: n >= 1e6 ? 'compact' : 'standard', maximumFractionDigits: n >= 1e6 ? 2 : 0 }).format(n)

// Colors follow The Unified Trust Structure legend.
const COLORS = {
  trust: { bg: '#2b0d52', fg: '#ffffff' },
  holding: { bg: '#6419c9', fg: '#ffffff' },
  operating: { bg: '#2eb2ff', fg: '#1a0633' },
  management: { bg: '#ffb500', fg: '#290a52' },
  nonprofit: { bg: '#3438d4', fg: '#ffffff' },
}

const LAYER: Record<Exclude<StructureLayer, 'personal'>, { title: string; color: keyof typeof COLORS }> = {
  offshore: { title: 'Offshore Trust', color: 'trust' },
  family: { title: 'Family Trust', color: 'trust' },
  ministry: { title: 'Ministry Trust', color: 'trust' },
  business: { title: 'Business Trust', color: 'trust' },
  nonprofit: { title: 'Charity (Non-Profit)', color: 'nonprofit' },
  holding: { title: 'Holding Company', color: 'holding' },
  management: { title: 'Management Company', color: 'management' },
  operating: { title: 'Operating Company', color: 'operating' },
}

function Box({ layer, nodes }: { layer: Exclude<StructureLayer, 'personal'>; nodes: Node[] }) {
  const meta = LAYER[layer]
  const c = COLORS[meta.color]
  if (!nodes.length) {
    return (
      <div className="rounded-lg border border-dashed border-border px-3 py-2 text-center min-w-[120px] opacity-60">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{meta.title}</p>
        <p className="text-[10px] text-muted-foreground">Not set up</p>
      </div>
    )
  }
  return (
    <div className="flex flex-wrap justify-center gap-2">
      {nodes.map(n => (
        <div
          key={n.label}
          title={`${n.label} - ${currency(n.value)} across ${n.count} ${n.count === 1 ? 'account' : 'accounts'}`}
          className="rounded-lg px-3 py-2 text-center min-w-[120px] max-w-[180px] shadow-sm"
          style={{ backgroundColor: c.bg, color: c.fg }}
        >
          <p className="text-[10px] font-semibold uppercase tracking-wider opacity-80">{meta.title}</p>
          <p className="text-xs font-semibold truncate">{n.label}</p>
          <p className="text-[11px] opacity-90">{currency(n.value)} · {n.count}</p>
        </div>
      ))}
    </div>
  )
}

const VLine = () => <div className="mx-auto h-4 w-px bg-border" />

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
      setRows((data || []).map((a: any) => ({
        entity: a.owner_entity,
        balance: Number(a.manual_balance_override ? a.manual_balance_amount || 0 : a.balance || 0),
      })))
      setLoading(false)
    }
    load()
    const channel = supabase
      .channel('ownership-map-accounts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'connected_accounts', filter: `user_id=eq.${user.id}` }, () => load())
      .subscribe()
    return () => { cancelled = true; supabase.removeChannel(channel) }
  }, [user?.id])

  const layers = useMemo(() => {
    const out: Record<StructureLayer, Node[]> = { offshore: [], family: [], ministry: [], business: [], nonprofit: [], holding: [], management: [], operating: [], personal: [] }
    const visible = demoMode
      ? DEMO_DFO_ACCOUNTS.map(a => ({ entity: a.owner_entity, balance: a.balance }))
      : rows
    for (const r of visible) {
      const layer = getStructureLayer(r.entity)
      const label = layer === 'personal' ? 'Personal Name' : displayEntityName(r.entity)
      const list = out[layer]
      const found = list.find(n => n.label === label)
      if (found) { found.value += r.balance; found.count += 1 } else list.push({ label, value: r.balance, count: 1 })
    }
    return out
  }, [demoMode, rows])

  if (loading && !demoMode) return <div className="h-64 rounded-xl bg-muted animate-pulse" />

  const personal = layers.personal[0]
  const hasAny = Object.values(layers).some(l => l.length)

  return (
    <div className="h-full">
      <Card className="h-full">
        <CardContent className="flex h-full flex-col justify-between gap-3 p-3 sm:p-4">
          {!hasAny ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              Assign owners to your accounts in the Family Office to see your structure.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <div className="min-w-[520px] space-y-0">
                {/* Family Office hub */}
                <div className="flex justify-center">
                  <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/50 bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-foreground">
                    <Building2 className="h-3.5 w-3.5" /> Family Office
                  </div>
                </div>
                <VLine />

                {/* Offshore always sits above the Family Trust */}
                {layers.offshore.length > 0 && (<><div className="flex justify-center"><Box layer="offshore" nodes={layers.offshore} /></div><VLine /></>)}

                {/* Family Trust — Ministry Trust */}
                <div className="grid grid-cols-2 gap-6">
                  <div className="flex flex-col items-center">
                    <Box layer="family" nodes={layers.family} />
                    <VLine />
                    <Box layer="business" nodes={layers.business} />
                  </div>
                  <div className="relative flex flex-col items-center">
                    <div className="absolute -left-6 top-6 h-px w-6 bg-border" />
                    <Box layer="ministry" nodes={layers.ministry} />
                    <VLine />
                    <Box layer="nonprofit" nodes={layers.nonprofit} />
                  </div>
                </div>

                {/* Companies under the Business Trust */}
                <div className="grid grid-cols-2 gap-6">
                  <div className="flex flex-col items-center"><VLine /></div>
                  <div />
                </div>
                <div className="rounded-xl border border-border/70 bg-muted/30 p-3 space-y-2">
                  <div className="flex flex-wrap items-start justify-center gap-4">
                    <div className="flex flex-col items-center gap-1">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Management</p>
                      <Box layer="management" nodes={layers.management} />
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Holding</p>
                      <Box layer="holding" nodes={layers.holding} />
                    </div>
                  </div>
                  <VLine />
                  <div className="flex flex-col items-center gap-1">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Operating</p>
                    <Box layer="operating" nodes={layers.operating} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Personal assets sit outside the structure */}
          {personal && (
            <div className="rounded-lg border border-dashed border-destructive/60 bg-destructive/5 px-3 py-2 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-destructive">Personal Name - outside your structure</p>
                <p className="text-[11px] text-muted-foreground">Not owned by any trust or company, so it is not protected.</p>
              </div>
              <p className="text-sm font-semibold text-destructive whitespace-nowrap">{currency(personal.value)} · {personal.count}</p>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-center gap-3 border-t pt-3 text-[11px] text-muted-foreground">
            {(['trust', 'holding', 'operating', 'management', 'nonprofit'] as const).map(k => (
              <span key={k} className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: COLORS[k].bg }} />
                {{ trust: 'Trusts', holding: 'Holding', operating: 'Operating', management: 'Management', nonprofit: 'Non-Profit' }[k]}
              </span>
            ))}
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm border border-dashed border-destructive" /> Personal</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
