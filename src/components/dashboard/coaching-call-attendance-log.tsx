import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Loader2, Calendar, Search, Plus, Trash2, UserPlus, Check, ChevronsUpDown, X } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'sonner'

interface AttendanceRow {
  id: string
  user_id: string
  session_id: string | null
  attended: boolean
  attendance_duration_minutes: number | null
  source: string
  notes: string | null
  created_at: string
  user_name: string
  user_email: string
  session_title: string
  session_date: string | null
  coach_name: string | null
}

interface MemberOption { user_id: string; name: string; email: string }

export function CoachingCallAttendanceLog() {
  const { user } = useAuth()
  const [rows, setRows] = useState<AttendanceRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterSource, setFilterSource] = useState<'all' | 'auto' | 'manual'>('all')
  const [members, setMembers] = useState<MemberOption[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  // form state
  const [fUserId, setFUserId] = useState<string>('')
  const [fTitle, setFTitle] = useState('')
  const [fCoach, setFCoach] = useState('')
  const [fDate, setFDate] = useState<string>(new Date().toISOString().slice(0, 10))
  const [fAttended, setFAttended] = useState(true)
  const [fDuration, setFDuration] = useState<string>('')
  const [fNotes, setFNotes] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const { data: attendance } = await supabase
        .from('session_attendance')
        .select('id, user_id, session_id, attended, attendance_duration_minutes, source, notes, manual_session_title, manual_coach_name, manual_session_date, created_at')
        .order('created_at', { ascending: false })
        .limit(1000)

      const userIds = Array.from(new Set((attendance ?? []).map((a: any) => a.user_id)))
      const sessionIds = Array.from(new Set((attendance ?? []).map((a: any) => a.session_id).filter(Boolean)))

      const [{ data: profiles }, { data: sessions }] = await Promise.all([
        userIds.length
          ? supabase.from('profiles').select('user_id, email, first_name, last_name, display_name').in('user_id', userIds)
          : Promise.resolve({ data: [] as any[] }),
        sessionIds.length
          ? supabase.from('group_coaching_sessions').select('id, title, session_date, coach_name').in('id', sessionIds as string[])
          : Promise.resolve({ data: [] as any[] }),
      ])

      const pMap = new Map((profiles ?? []).map((p: any) => [p.user_id, p]))
      const sMap = new Map((sessions ?? []).map((s: any) => [s.id, s]))

      const merged: AttendanceRow[] = (attendance ?? []).map((a: any) => {
        const p = pMap.get(a.user_id) as any
        const s = a.session_id ? (sMap.get(a.session_id) as any) : null
        const name = p?.display_name || `${p?.first_name ?? ''} ${p?.last_name ?? ''}`.trim() || p?.email || 'Unknown'
        return {
          id: a.id,
          user_id: a.user_id,
          session_id: a.session_id,
          attended: a.attended,
          attendance_duration_minutes: a.attendance_duration_minutes,
          source: a.source ?? 'auto',
          notes: a.notes ?? null,
          created_at: a.created_at,
          user_name: name,
          user_email: p?.email ?? '',
          session_title: s?.title ?? a.manual_session_title ?? 'Untitled session',
          session_date: s?.session_date ?? a.manual_session_date ?? null,
          coach_name: s?.coach_name ?? a.manual_coach_name ?? null,
        }
      })
      setRows(merged)
    } finally {
      setLoading(false)
    }
  }

  const loadMembers = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('user_id, email, first_name, last_name, display_name')
      .order('first_name', { ascending: true })
      .limit(2000)
    setMembers(
      (data ?? []).map((p: any) => ({
        user_id: p.user_id,
        email: p.email ?? '',
        name: p.display_name || `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim() || p.email || 'Unknown',
      }))
    )
  }

  useEffect(() => {
    load()
    loadMembers()
  }, [])

  const resetForm = () => {
    setFUserId(''); setFTitle(''); setFCoach(''); setFDate(new Date().toISOString().slice(0, 10))
    setFAttended(true); setFDuration(''); setFNotes('')
  }

  const handleSave = async () => {
    if (!fUserId) { toast.error('Pick a member'); return }
    if (!fTitle.trim()) { toast.error('Add a session title'); return }
    setSaving(true)
    try {
      const { error } = await supabase.from('session_attendance').insert({
        user_id: fUserId,
        session_id: null,
        session_type: 'manual',
        attended: fAttended,
        attendance_duration_minutes: fDuration ? Number(fDuration) : null,
        manual_session_title: fTitle.trim(),
        manual_coach_name: fCoach.trim() || null,
        manual_session_date: fDate,
        source: 'manual',
        notes: fNotes.trim() || null,
        logged_by: user?.id ?? null,
      } as any)
      if (error) throw error
      toast.success('Attendance logged')
      setDialogOpen(false)
      resetForm()
      load()
    } catch (e: any) {
      toast.error('Could not save: ' + (e?.message ?? e))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('session_attendance').delete().eq('id', id)
    if (error) { toast.error('Delete failed'); return }
    toast.success('Removed')
    setRows(prev => prev.filter(r => r.id !== id))
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return rows.filter(r => {
      if (filterSource !== 'all' && r.source !== filterSource) return false
      if (!q) return true
      return (
        r.user_name.toLowerCase().includes(q) ||
        r.user_email.toLowerCase().includes(q) ||
        r.session_title.toLowerCase().includes(q) ||
        (r.coach_name ?? '').toLowerCase().includes(q)
      )
    })
  }, [rows, search, filterSource])

  const stats = useMemo(() => {
    const attended = rows.filter(r => r.attended).length
    const manual = rows.filter(r => r.source === 'manual').length
    return { total: rows.length, attended, missed: rows.length - attended, manual }
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
              {stats.total} records · {stats.attended} attended · {stats.missed} missed · {stats.manual} manual
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative w-full sm:w-56">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search…"
                className="pl-8 h-9"
              />
            </div>
            <Select value={filterSource} onValueChange={(v) => setFilterSource(v as any)}>
              <SelectTrigger className="h-9 w-[130px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All sources</SelectItem>
                <SelectItem value="auto">Automated</SelectItem>
                <SelectItem value="manual">Manual</SelectItem>
              </SelectContent>
            </Select>
            <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm() }}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-[#290a52] text-white hover:bg-[#1d0639]">
                  <Plus className="h-4 w-4 mr-1" /> Log attendance
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2"><UserPlus className="h-4 w-4" /> Manual Attendance Entry</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs">Member</Label>
                    <Select value={fUserId} onValueChange={setFUserId}>
                      <SelectTrigger><SelectValue placeholder="Select member" /></SelectTrigger>
                      <SelectContent className="max-h-72">
                        {members.map(m => (
                          <SelectItem key={m.user_id} value={m.user_id}>{m.name} <span className="text-muted-foreground">· {m.email}</span></SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Session type</Label>
                    <Select value={fTitle} onValueChange={setFTitle}>
                      <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Group Coaching">Group Coaching</SelectItem>
                        <SelectItem value="1-1 Coaching Call">1-1 Coaching Call</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Coach</Label>
                      <Input value={fCoach} onChange={(e) => setFCoach(e.target.value)} placeholder="Coach name" />
                    </div>
                    <div>
                      <Label className="text-xs">Date</Label>
                      <Input type="date" value={fDate} onChange={(e) => setFDate(e.target.value)} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 items-end">
                    <div>
                      <Label className="text-xs">Duration (min)</Label>
                      <Input type="number" min={0} value={fDuration} onChange={(e) => setFDuration(e.target.value)} placeholder="60" />
                    </div>
                    <div className="flex items-center gap-2 pb-2">
                      <Switch checked={fAttended} onCheckedChange={setFAttended} id="att" />
                      <Label htmlFor="att" className="text-sm">{fAttended ? 'Attended' : 'Missed'}</Label>
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Notes (optional)</Label>
                    <Input value={fNotes} onChange={(e) => setFNotes(e.target.value)} placeholder="Anything to remember" />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="ghost" onClick={() => setDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleSave} disabled={saving} className="bg-[#ffb500] text-[#290a52] hover:bg-[#e6a300]">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null} Save
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-10 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading attendance…
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">No attendance records yet. Use "Log attendance" to add one.</p>
        ) : (
          <ScrollArea className="w-full whitespace-nowrap">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Session</TableHead>
                  <TableHead>Coach</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead className="text-right">Duration</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(r => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <div className="font-medium">{r.user_name}</div>
                      <div className="text-xs text-muted-foreground">{r.user_email}</div>
                    </TableCell>
                    <TableCell className="max-w-[260px] truncate">
                      {r.session_title}
                      {r.notes && <div className="text-xs text-muted-foreground truncate">{r.notes}</div>}
                    </TableCell>
                    <TableCell>{r.coach_name ?? '—'}</TableCell>
                    <TableCell>{r.session_date ? new Date(r.session_date).toLocaleDateString() : '—'}</TableCell>
                    <TableCell>
                      {r.attended ? (
                        <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">Attended</Badge>
                      ) : (
                        <Badge variant="outline" className="text-red-700 border-red-300">Missed</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={r.source === 'manual' ? 'border-[#ffb500] text-[#290a52]' : 'text-muted-foreground'}>
                        {r.source === 'manual' ? 'Manual' : 'Auto'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {r.attendance_duration_minutes != null ? `${r.attendance_duration_minutes}m` : '—'}
                    </TableCell>
                    <TableCell>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-red-600" onClick={() => handleDelete(r.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
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
