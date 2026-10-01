import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'

type Ev = { user_id: string; section: string; sub_section: string | null; seconds: number; created_at: string }

const LABELS: Record<string, string> = {
  dashboard: 'Dashboard', office: 'Family Office', governance: 'Governance', handoff: 'Handoff',
  constitution: 'Constitution', calendar: 'Calendar', members: 'Members',
}
const fmt = (s: number) => (s >= 3600 ? `${(s / 3600).toFixed(1)}h` : s >= 60 ? `${Math.round(s / 60)}m` : `${s}s`)

export function DfoUsageMetrics() {
  const [days, setDays] = useState(30)
  const [events, setEvents] = useState<Ev[]>([])
  const [names, setNames] = useState<Record<string, string>>({})
  const [banks, setBanks] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    const since = new Date(Date.now() - days * 86400000).toISOString()
    ;(async () => {
      const [{ data }, { data: acc }] = await Promise.all([
        (supabase as any).from('dfo_usage_events').select('user_id, section, sub_section, seconds, created_at').gte('created_at', since).limit(10000),
        supabase.from('connected_accounts').select('user_id'),
      ])
      const evs = (data ?? []) as Ev[]
      setEvents(evs)
      setBanks(new Set((acc ?? []).map((a: any) => a.user_id)).size)
      const ids = Array.from(new Set(evs.map((e) => e.user_id)))
      if (ids.length) {
        const { data: profs } = await supabase.from('profiles').select('user_id, display_name, first_name, last_name, email').in('user_id', ids)
        setNames(Object.fromEntries((profs ?? []).map((p: any) => [p.user_id, p.display_name || [p.first_name, p.last_name].filter(Boolean).join(' ') || p.email])))
      }
      setLoading(false)
    })()
  }, [days])

  const sections = useMemo(() => {
    const m = new Map<string, { visits: number; seconds: number; users: Set<string>; subs: Map<string, number> }>()
    for (const e of events) {
      const s = m.get(e.section) ?? { visits: 0, seconds: 0, users: new Set(), subs: new Map() }
      s.visits++; s.seconds += e.seconds; s.users.add(e.user_id)
      if (e.sub_section) s.subs.set(e.sub_section, (s.subs.get(e.sub_section) ?? 0) + e.seconds)
      m.set(e.section, s)
    }
    return Array.from(m.entries()).sort((a, b) => b[1].seconds - a[1].seconds)
  }, [events])
  const maxSec = Math.max(1, ...sections.map(([, s]) => s.seconds))

  const topUsers = useMemo(() => {
    const m = new Map<string, { seconds: number; bySection: Map<string, number> }>()
    for (const e of events) {
      const u = m.get(e.user_id) ?? { seconds: 0, bySection: new Map() }
      u.seconds += e.seconds; u.bySection.set(e.section, (u.bySection.get(e.section) ?? 0) + e.seconds)
      m.set(e.user_id, u)
    }
    return Array.from(m.entries()).sort((a, b) => b[1].seconds - a[1].seconds).slice(0, 10)
  }, [events])

  const activeUsers = new Set(events.map((e) => e.user_id)).size

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-2">
        <div>
          <CardTitle>Digital Family Office Usage</CardTitle>
          <CardDescription>Which parts clients use most and how long they spend there</CardDescription>
        </div>
        <select value={days} onChange={(e) => setDays(Number(e.target.value))} className="rounded-md border border-border bg-background px-2 py-1 text-sm">
          <option value={7}>Last 7 days</option><option value={30}>Last 30 days</option><option value={90}>Last 90 days</option>
        </select>
      </CardHeader>
      <CardContent className="space-y-6">
        {loading ? (
          <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg border border-border p-3"><p className="text-xs text-muted-foreground">Active users</p><p className="text-xl font-bold">{activeUsers}</p></div>
              <div className="rounded-lg border border-border p-3"><p className="text-xs text-muted-foreground">Total time</p><p className="text-xl font-bold">{fmt(events.reduce((s, e) => s + e.seconds, 0))}</p></div>
              <div className="rounded-lg border border-border p-3"><p className="text-xs text-muted-foreground">Clients with linked banks</p><p className="text-xl font-bold">{banks}</p></div>
            </div>
            {sections.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No usage recorded yet. Data starts filling in as clients open the Digital Family Office.</p>
            ) : (
              <div className="grid gap-6 lg:grid-cols-2">
                <div className="space-y-3">
                  <p className="text-sm font-semibold">Most used sections</p>
                  {sections.map(([key, s]) => (
                    <div key={key} className="space-y-1">
                      <div className="flex justify-between text-sm"><span className="font-medium">{LABELS[key] ?? key}</span><span className="text-muted-foreground">{fmt(s.seconds)} · {s.visits} visits · {s.users.size} users</span></div>
                      <div className="h-2 rounded-full bg-muted"><div className="h-2 rounded-full bg-primary" style={{ width: `${(s.seconds / maxSec) * 100}%` }} /></div>
                      {s.subs.size > 0 && (
                        <p className="text-xs text-muted-foreground">{Array.from(s.subs.entries()).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${LABELS[k] ?? k} ${fmt(v)}`).join(' · ')}</p>
                      )}
                      <p className="text-xs text-muted-foreground">Avg {fmt(Math.round(s.seconds / s.visits))} per visit</p>
                    </div>
                  ))}
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-semibold">Top clients</p>
                  {topUsers.map(([id, u]) => {
                    const fav = Array.from(u.bySection.entries()).sort((a, b) => b[1] - a[1])[0]
                    return (
                      <div key={id} className="flex justify-between gap-2 rounded-md border border-border px-3 py-2 text-sm">
                        <span className="truncate font-medium">{names[id] ?? 'Client'}</span>
                        <span className="shrink-0 text-muted-foreground">{fmt(u.seconds)} · mostly {LABELS[fav?.[0]] ?? fav?.[0]}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
