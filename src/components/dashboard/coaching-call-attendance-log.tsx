import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { Loader2, Calendar, Search } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'

interface AttendanceRow {
  id: string
  user_id: string
  session_id: string
  attended: boolean
  attendance_duration_minutes: number | null
  joined_at: string | null
  left_at: string | null
  created_at: string
  user_name: string
  user_email: string
  session_title: string
  session_date: string | null
  coach_name: string | null
}

export function CoachingCallAttendanceLog() {
  const [rows, setRows] = useState<AttendanceRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const { data: attendance } = await supabase
          .from('session_attendance')
          .select('id, user_id, session_id, attended, attendance_duration_minutes, joined_at, left_at, created_at')
          .order('created_at', { ascending: false })
          .limit(500)

        const userIds = Array.from(new Set((attendance ?? []).map(a => a.user_id)))
        const sessionIds = Array.from(new Set((attendance ?? []).map(a => a.session_id)))

        const [{ data: profiles }, { data: sessions }] = await Promise.all([
          userIds.length
            ? supabase.from('profiles').select('user_id, email, first_name, last_name, display_name').in('user_id', userIds)
            : Promise.resolve({ data: [] as any[] }),
          sessionIds.length
            ? supabase.from('group_coaching_sessions').select('id, title, session_date, coach_name').in('id', sessionIds)
            : Promise.resolve({ data: [] as any[] }),
        ])

        const pMap = new Map((profiles ?? []).map((p: any) => [p.user_id, p]))
        const sMap = new Map((sessions ?? []).map((s: any) => [s.id, s]))

        const merged: AttendanceRow[] = (attendance ?? []).map((a: any) => {
          const p = pMap.get(a.user_id)
          const s = sMap.get(a.session_id)
          const name = p?.display_name || `${p?.first_name ?? ''} ${p?.last_name ?? ''}`.trim() || p?.email || 'Unknown'
          return {
            ...a,
            user_name: name,
            user_email: p?.email ?? '',
            session_title: s?.title ?? 'Unknown session',
            session_date: s?.session_date ?? null,
            coach_name: s?.coach_name ?? null,
          }
        })
        setRows(merged)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return rows
    return rows.filter(r =>
      r.user_name.toLowerCase().includes(q) ||
      r.user_email.toLowerCase().includes(q) ||
      r.session_title.toLowerCase().includes(q) ||
      (r.coach_name ?? '').toLowerCase().includes(q)
    )
  }, [rows, search])

  const stats = useMemo(() => {
    const attended = rows.filter(r => r.attended).length
    return { total: rows.length, attended, missed: rows.length - attended }
  }, [rows])

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Calendar className="h-4 w-4" /> Coaching Call Attendance Log
            </CardTitle>
            <CardDescription>
              {stats.total} records · {stats.attended} attended · {stats.missed} missed
            </CardDescription>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, email, session…"
              className="pl-8 h-9"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-10 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading attendance…
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">No attendance records yet.</p>
        ) : (
          <ScrollArea className="w-full whitespace-nowrap">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Session</TableHead>
                  <TableHead>Coach</TableHead>
                  <TableHead>Session Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Duration</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(r => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <div className="font-medium">{r.user_name}</div>
                      <div className="text-xs text-muted-foreground">{r.user_email}</div>
                    </TableCell>
                    <TableCell className="max-w-[260px] truncate">{r.session_title}</TableCell>
                    <TableCell>{r.coach_name ?? '—'}</TableCell>
                    <TableCell>{r.session_date ? new Date(r.session_date).toLocaleDateString() : '—'}</TableCell>
                    <TableCell>
                      {r.attended ? (
                        <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">Attended</Badge>
                      ) : (
                        <Badge variant="outline" className="text-red-700 border-red-300">Missed</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {r.attendance_duration_minutes != null ? `${r.attendance_duration_minutes}m` : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  )
}

export default CoachingCallAttendanceLog
