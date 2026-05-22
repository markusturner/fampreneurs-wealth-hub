import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { supabase } from '@/integrations/supabase/client'
import { Loader2, Flame } from 'lucide-react'

interface Row {
  id: string
  title: string
  viewers: number
  avgScroll: number   // 0..100
  avgSeconds: number  // total
}

function trafficColor(pct: number): string {
  if (pct >= 70) return 'bg-green-500'
  if (pct >= 40) return 'bg-yellow-400'
  return 'bg-red-500'
}

function fmtTime(sec: number): string {
  if (sec < 60) return `${sec}s`
  const m = Math.floor(sec / 60), s = sec % 60
  if (m < 60) return `${m}m ${s}s`
  const h = Math.floor(m / 60), mm = m % 60
  return `${h}h ${mm}m`
}

export function AdminSopHeatmap() {
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      const [{ data: sops }, { data: views }] = await Promise.all([
        supabase.from('sops' as any).select('id, title').order('title'),
        supabase.from('sop_views' as any).select('sop_id, max_scroll_pct, total_time_seconds, user_id'),
      ])
      const v = (views as any[]) || []
      const list: Row[] = ((sops as any[]) || []).map(s => {
        const sv = v.filter(x => x.sop_id === s.id)
        const viewers = new Set(sv.map(x => x.user_id)).size
        const avgScroll = sv.length ? Math.round(sv.reduce((a, x) => a + (x.max_scroll_pct || 0), 0) / sv.length) : 0
        const avgSeconds = sv.length ? Math.round(sv.reduce((a, x) => a + (x.total_time_seconds || 0), 0) / sv.length) : 0
        return { id: s.id, title: s.title, viewers, avgScroll, avgSeconds }
      })
      setRows(list)
      setLoading(false)
    }
    fetchData()
  }, [])

  if (loading) {
    return <div className="flex items-center justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Flame className="h-4 w-4 text-[#ffb500]" />
          SOP Engagement Heatmap
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Traffic-light bars show how far the average reader scrolls into each SOP. Green = strong, yellow = mid, red = drop-off.
        </p>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No SOPs yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SOP</TableHead>
                <TableHead className="w-[90px] text-center">Viewers</TableHead>
                <TableHead className="w-[110px] text-center">Avg Time</TableHead>
                <TableHead className="w-[260px]">Avg Scroll Depth</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.title}</TableCell>
                  <TableCell className="text-center">{r.viewers}</TableCell>
                  <TableCell className="text-center">{fmtTime(r.avgSeconds)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1 h-3 rounded-full bg-muted overflow-hidden border-l-4 border-r-4 border-transparent" style={{ borderLeftColor: 'transparent' }}>
                        {/* edge traffic lights */}
                        <span className={`absolute left-0 top-0 h-full w-1.5 ${trafficColor(r.avgScroll)}`} />
                        <span className={`absolute right-0 top-0 h-full w-1.5 ${trafficColor(r.avgScroll)}`} />
                        <div className={`h-full ${trafficColor(r.avgScroll)} transition-all`} style={{ width: `${r.avgScroll}%` }} />
                      </div>
                      <span className="text-sm font-medium w-10 text-right">{r.avgScroll}%</span>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
