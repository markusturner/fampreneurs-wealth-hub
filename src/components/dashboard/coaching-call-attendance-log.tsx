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
import { Loader2, Calendar, Search, Plus, Trash2, UserPlus, Check, ChevronsUpDown, X, ArrowUpDown, ArrowDown, ArrowUp, Pencil, RefreshCw, Download, Undo2, SlidersHorizontal } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Checkbox } from '@/components/ui/checkbox'
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
  const [sortKey, setSortKey] = useState<'member' | 'session' | 'coach' | 'date' | 'attendance' | 'duration' | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [members, setMembers] = useState<MemberOption[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  // form state
  const [fUserIds, setFUserIds] = useState<string[]>([])
  const [memberPopoverOpen, setMemberPopoverOpen] = useState(false)
  const [memberSearch, setMemberSearch] = useState('')
  const [fTitle, setFTitle] = useState('')
  const [fCoach, setFCoach] = useState('')
  const [fDate, setFDate] = useState<string>(new Date().toISOString().slice(0, 10))
  const [fAttended, setFAttended] = useState(true)
  const [fDuration, setFDuration] = useState<string>('')
  const [fNotes, setFNotes] = useState('')

  // edit state
  const [editRow, setEditRow] = useState<AttendanceRow | null>(null)
  const [editSaving, setEditSaving] = useState(false)
  const [eTitle, setETitle] = useState('')
  const [eCoach, setECoach] = useState('')
  const [eDate, setEDate] = useState('')
  const [eAttended, setEAttended] = useState(true)
  const [eDuration, setEDuration] = useState('')
  const [eNotes, setENotes] = useState('')
  const [scanning, setScanning] = useState(false)

  // bulk selection state
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [bulkOpen, setBulkOpen] = useState(false)
  const [bulkSaving, setBulkSaving] = useState(false)
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const [bTitle, setBTitle] = useState('')
  const [bCoach, setBCoach] = useState('')
  const [bDate, setBDate] = useState('')
  const [bStatus, setBStatus] = useState<'keep' | 'attended' | 'missed'>('keep')
  const [bDuration, setBDuration] = useState('')

  const toggleSelect = (id: string) =>
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])

  const openEdit = (r: AttendanceRow) => {
    setEditRow(r)
    setETitle(r.session_title ?? '')
    setECoach(r.coach_name ?? '')
    setEDate(r.session_date ? String(r.session_date).slice(0, 10) : '')
    setEAttended(r.attended)
    setEDuration(r.attendance_duration_minutes != null ? String(r.attendance_duration_minutes) : '')
    setENotes(r.notes ?? '')
  }

  const handleUpdate = async () => {
    if (!editRow) return
    if (!eTitle.trim()) { toast.error('Add a session title'); return }
    setEditSaving(true)
    try {
      const patch: any = {
        attended: eAttended,
        attendance_duration_minutes: eDuration ? Number(eDuration) : null,
        manual_session_title: eTitle.trim(),
        manual_coach_name: eCoach.trim() || null,
        manual_session_date: eDate || null,
        notes: eNotes.trim() || null,
        session_type: eTitle.toLowerCase().includes('1-1') ? 'individual' : 'group',
      }
      const { error } = await supabase.from('session_attendance').update(patch).eq('id', editRow.id)
      if (error) throw error
      setRows(prev => prev.map(r => r.id === editRow.id ? {
        ...r,
        attended: eAttended,
        attendance_duration_minutes: eDuration ? Number(eDuration) : null,
        session_title: eTitle.trim(),
        coach_name: eCoach.trim() || null,
        session_date: eDate || null,
        notes: eNotes.trim() || null,
      } : r))
      toast.success('Log updated')
      setEditRow(null)
    } catch (e: any) {
      toast.error('Could not update: ' + (e?.message ?? e))
    } finally {
      setEditSaving(false)
    }
  }

  const handleScanFathom = async () => {
    setScanning(true)
    try {
      const { data, error } = await supabase.functions.invoke('sync-fathom-attendance', { body: { days: 90 } })
      if (error) throw error
      if ((data as any)?.error) throw new Error((data as any).error)
      const d: any = data
      toast.success(`Scanned ${d?.meetings_scanned ?? 0} accountability calls · ${d?.inserted ?? 0} new records`)
      load()
    } catch (e: any) {
      toast.error('Fathom scan failed: ' + (e?.message ?? e))
    } finally {
      setScanning(false)
    }
  }


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
      .select('user_id, email, first_name, last_name, display_name, program_name')
      .ilike('program_name', '%Accelerator%')
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
    setFUserIds([]); setFTitle(''); setFCoach(''); setFDate(new Date().toISOString().slice(0, 10))
    setFAttended(true); setFDuration(''); setFNotes('')
  }

  const handleSave = async () => {
    if (fUserIds.length === 0) { toast.error('Pick at least one member'); return }
    if (!fTitle.trim()) { toast.error('Add a session title'); return }
    setSaving(true)
    try {
      const rows = fUserIds.map(uid => ({
        user_id: uid,
        session_id: null,
        session_type: fTitle.toLowerCase().includes('1-1') ? 'individual' : 'group',
        attended: fAttended,
        attendance_duration_minutes: fDuration ? Number(fDuration) : null,
        manual_session_title: fTitle.trim(),
        manual_coach_name: fCoach.trim() || null,
        manual_session_date: fDate,
        source: 'manual',
        notes: fNotes.trim() || null,
        logged_by: user?.id ?? null,
      }))
      const { error } = await supabase.from('session_attendance').insert(rows as any)
      if (error) throw error
      toast.success(`Logged ${rows.length} attendance ${rows.length === 1 ? 'record' : 'records'}`)
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

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return
    if (!window.confirm(`Delete ${selectedIds.length} selected log${selectedIds.length === 1 ? '' : 's'}?`)) return
    setBulkDeleting(true)
    try {
      const { error } = await supabase.from('session_attendance').delete().in('id', selectedIds)
      if (error) throw error
      setRows(prev => prev.filter(r => !selectedIds.includes(r.id)))
      toast.success(`Deleted ${selectedIds.length} logs`)
      setSelectedIds([])
    } catch (e: any) {
      toast.error('Delete failed: ' + (e?.message ?? e))
    } finally {
      setBulkDeleting(false)
    }
  }

  const openBulkEdit = () => {
    setBTitle(''); setBCoach(''); setBDate(''); setBStatus('keep'); setBDuration('')
    setBulkOpen(true)
  }

  const handleBulkUpdate = async () => {
    if (selectedIds.length === 0) return
    const patch: any = {}
    if (bTitle.trim()) {
      patch.manual_session_title = bTitle.trim()
      patch.session_type = bTitle.toLowerCase().includes('1-1') ? 'individual' : 'group'
    }
    if (bCoach.trim()) patch.manual_coach_name = bCoach.trim()
    if (bDate) patch.manual_session_date = bDate
    if (bStatus !== 'keep') patch.attended = bStatus === 'attended'
    if (bDuration) patch.attendance_duration_minutes = Number(bDuration)
    if (Object.keys(patch).length === 0) { toast.error('Change at least one field'); return }
    setBulkSaving(true)
    try {
      const { error } = await supabase.from('session_attendance').update(patch).in('id', selectedIds)
      if (error) throw error
      setRows(prev => prev.map(r => selectedIds.includes(r.id) ? {
        ...r,
        session_title: patch.manual_session_title ?? r.session_title,
        coach_name: patch.manual_coach_name ?? r.coach_name,
        session_date: patch.manual_session_date ?? r.session_date,
        attended: patch.attended !== undefined ? patch.attended : r.attended,
        attendance_duration_minutes: patch.attendance_duration_minutes ?? r.attendance_duration_minutes,
      } : r))
      toast.success(`Updated ${selectedIds.length} logs`)
      setBulkOpen(false)
      setSelectedIds([])
    } catch (e: any) {
      toast.error('Could not update: ' + (e?.message ?? e))
    } finally {
      setBulkSaving(false)
    }
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

  const sortedRows = useMemo(() => {
    if (!sortKey) return filtered
    const sorted = [...filtered]
    const multiplier = sortDirection === 'asc' ? 1 : -1
    sorted.sort((a, b) => {
      let comparison = 0
      switch (sortKey) {
        case 'member': {
          const aVal = (a.user_name || a.user_email || '').toLowerCase()
          const bVal = (b.user_name || b.user_email || '').toLowerCase()
          comparison = aVal.localeCompare(bVal)
          break
        }
        case 'session': {
          const aVal = (a.session_title || '').toLowerCase()
          const bVal = (b.session_title || '').toLowerCase()
          comparison = aVal.localeCompare(bVal)
          break
        }
        case 'coach': {
          const aVal = (a.coach_name || '').toLowerCase()
          const bVal = (b.coach_name || '').toLowerCase()
          comparison = aVal.localeCompare(bVal)
          break
        }
        case 'date': {
          const aVal = a.session_date ? new Date(a.session_date).getTime() : 0
          const bVal = b.session_date ? new Date(b.session_date).getTime() : 0
          comparison = aVal - bVal
          break
        }
        case 'attendance': {
          const aVal = a.attended ? 1 : 0
          const bVal = b.attended ? 1 : 0
          comparison = aVal - bVal
          break
        }
        case 'duration': {
          const aVal = a.attendance_duration_minutes ?? -1
          const bVal = b.attendance_duration_minutes ?? -1
          comparison = aVal - bVal
          break
        }
      }
      return comparison * multiplier
    })
    return sorted
  }, [filtered, sortKey, sortDirection])

  const stats = useMemo(() => {
    const attended = rows.filter(r => r.attended).length
    const manual = rows.filter(r => r.source === 'manual').length
    return { total: rows.length, attended, missed: rows.length - attended, manual }
  }, [rows])

  const toggleSort = (key: typeof sortKey) => {
    if (sortKey === key) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDirection('asc')
    }
  }

  const SortIcon = ({ column }: { column: typeof sortKey }) => {
    if (sortKey !== column) return <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
    return sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
  }

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
                <SelectItem value="fathom">Fathom</SelectItem>
                <SelectItem value="manual">Manual</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" variant="outline" onClick={handleScanFathom} disabled={scanning}>
              {scanning ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-1" />}
              Scan Fathom
            </Button>

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
                    <Label className="text-xs">Members</Label>
                    <Input
                      value={memberSearch}
                      onChange={(e) => setMemberSearch(e.target.value)}
                      placeholder="Search members…"
                      className="h-9 mb-2"
                    />
                    <div className="max-h-48 overflow-y-auto rounded-md border divide-y">
                      {members
                        .filter(m => {
                          const q = memberSearch.trim().toLowerCase()
                          if (!q) return true
                          return m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q)
                        })
                        .map(m => {
                          const checked = fUserIds.includes(m.user_id)
                          return (
                            <button
                              type="button"
                              key={m.user_id}
                              onClick={() => setFUserIds(prev => prev.includes(m.user_id)
                                ? prev.filter(id => id !== m.user_id)
                                : [...prev, m.user_id])}
                              className={`w-full flex items-center px-2 py-2 text-left text-sm hover:bg-muted ${checked ? 'bg-muted/60' : ''}`}
                            >
                              <Check className={`mr-2 h-4 w-4 shrink-0 ${checked ? 'opacity-100' : 'opacity-0'}`} />
                              <span className="truncate">{m.name}</span>
                              <span className="ml-2 text-xs text-muted-foreground truncate">{m.email}</span>
                            </button>
                          )
                        })}
                      {members.length === 0 && (
                        <div className="px-2 py-3 text-sm text-muted-foreground">No members found.</div>
                      )}
                    </div>
                    {fUserIds.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {fUserIds.map(uid => {
                          const m = members.find(x => x.user_id === uid)
                          if (!m) return null
                          return (
                            <Badge key={uid} variant="outline" className="gap-1 pr-1">
                              {m.name}
                              <button
                                type="button"
                                onClick={() => setFUserIds(prev => prev.filter(id => id !== uid))}
                                className="ml-1 rounded hover:bg-muted p-0.5"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          )
                        })}
                      </div>
                    )}
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
                      <Select value={fCoach} onValueChange={setFCoach}>
                        <SelectTrigger><SelectValue placeholder="Select coach" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Attorney Price">Attorney Price</SelectItem>
                          <SelectItem value="Markus Turner">Markus Turner</SelectItem>
                        </SelectContent>
                      </Select>
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
        ) : sortedRows.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">No attendance records yet. Use "Log attendance" to add one.</p>
        ) : (
          <>
          {selectedIds.length > 0 && (
            <div className="flex items-center gap-2 mb-3 rounded-md border bg-muted/40 px-3 py-2 flex-wrap">
              <span className="text-sm font-medium">{selectedIds.length} selected</span>
              <Button size="sm" variant="outline" onClick={openBulkEdit}>
                <Pencil className="h-3.5 w-3.5 mr-1" /> Edit selected
              </Button>
              <Button size="sm" variant="outline" className="text-red-600 border-red-300 hover:bg-red-50" onClick={handleBulkDelete} disabled={bulkDeleting}>
                {bulkDeleting ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Trash2 className="h-3.5 w-3.5 mr-1" />} Delete selected
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setSelectedIds([])}>Clear</Button>
            </div>
          )}
          <ScrollArea className="w-full whitespace-nowrap">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={sortedRows.length > 0 && sortedRows.every(r => selectedIds.includes(r.id))}
                      onCheckedChange={(v) => setSelectedIds(v ? sortedRows.map(r => r.id) : [])}
                      aria-label="Select all"
                    />
                  </TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('member')}>
                    <div className="flex items-center gap-1">Member <SortIcon column="member" /></div>
                  </TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('session')}>
                    <div className="flex items-center gap-1">Session <SortIcon column="session" /></div>
                  </TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('coach')}>
                    <div className="flex items-center gap-1">Coach <SortIcon column="coach" /></div>
                  </TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('date')}>
                    <div className="flex items-center gap-1">Date <SortIcon column="date" /></div>
                  </TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('attendance')}>
                    <div className="flex items-center gap-1">Status <SortIcon column="attendance" /></div>
                  </TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead className="text-right cursor-pointer select-none" onClick={() => toggleSort('duration')}>
                    <div className="flex items-center justify-end gap-1">Duration <SortIcon column="duration" /></div>
                  </TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedRows.map(r => (
                  <TableRow key={r.id} data-state={selectedIds.includes(r.id) ? 'selected' : undefined}>
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.includes(r.id)}
                        onCheckedChange={() => toggleSelect(r.id)}
                        aria-label="Select row"
                      />
                    </TableCell>
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
                      <Badge variant="outline" className={r.source === 'manual' ? 'border-[#ffb500] text-[#290a52]' : r.source === 'fathom' ? 'border-[#2eb2ff] text-[#0b6ea8]' : 'text-muted-foreground'}>
                        {r.source === 'manual' ? 'Manual' : r.source === 'fathom' ? 'Fathom' : 'Auto'}
                      </Badge>
                    </TableCell>

                    <TableCell className="text-right tabular-nums">
                      {r.attendance_duration_minutes != null ? `${r.attendance_duration_minutes}m` : '—'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-[#290a52]" onClick={() => openEdit(r)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-red-600" onClick={() => handleDelete(r.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>

                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
          </>
        )}
      </CardContent>

      <Dialog open={!!editRow} onOpenChange={(o) => { if (!o) setEditRow(null) }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Pencil className="h-4 w-4" /> Edit Attendance Log</DialogTitle>
          </DialogHeader>
          {editRow && (
            <div className="space-y-3">
              <div className="text-sm">
                <div className="font-medium">{editRow.user_name}</div>
                <div className="text-xs text-muted-foreground">{editRow.user_email}</div>
              </div>
              <div>
                <Label className="text-xs">Session type</Label>
                <Select value={eTitle} onValueChange={setETitle}>
                  <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Group Coaching">Group Coaching</SelectItem>
                    <SelectItem value="1-1 Coaching Call">1-1 Coaching Call</SelectItem>
                    {eTitle && !['Group Coaching', '1-1 Coaching Call'].includes(eTitle) && (
                      <SelectItem value={eTitle}>{eTitle}</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Coach</Label>
                  <Input value={eCoach} onChange={(e) => setECoach(e.target.value)} placeholder="Coach name" />
                </div>
                <div>
                  <Label className="text-xs">Date</Label>
                  <Input type="date" value={eDate} onChange={(e) => setEDate(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 items-end">
                <div>
                  <Label className="text-xs">Duration (min)</Label>
                  <Input type="number" min={0} value={eDuration} onChange={(e) => setEDuration(e.target.value)} placeholder="60" />
                </div>
                <div className="flex items-center gap-2 pb-2">
                  <Switch checked={eAttended} onCheckedChange={setEAttended} id="edit-att" />
                  <Label htmlFor="edit-att" className="text-sm">{eAttended ? 'Attended' : 'Missed'}</Label>
                </div>
              </div>
              <div>
                <Label className="text-xs">Notes (optional)</Label>
                <Input value={eNotes} onChange={(e) => setENotes(e.target.value)} placeholder="Anything to remember" />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditRow(null)}>Cancel</Button>
            <Button onClick={handleUpdate} disabled={editSaving} className="bg-[#ffb500] text-[#290a52] hover:bg-[#e6a300]">
              {editSaving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null} Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Pencil className="h-4 w-4" /> Edit {selectedIds.length} Logs</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">Leave a field blank to keep its current value.</p>
            <div>
              <Label className="text-xs">Session type</Label>
              <Select value={bTitle} onValueChange={setBTitle}>
                <SelectTrigger><SelectValue placeholder="Keep current" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Group Coaching">Group Coaching</SelectItem>
                  <SelectItem value="1-1 Coaching Call">1-1 Coaching Call</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Coach</Label>
                <Input value={bCoach} onChange={(e) => setBCoach(e.target.value)} placeholder="Keep current" />
              </div>
              <div>
                <Label className="text-xs">Date</Label>
                <Input type="date" value={bDate} onChange={(e) => setBDate(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Duration (min)</Label>
                <Input type="number" min={0} value={bDuration} onChange={(e) => setBDuration(e.target.value)} placeholder="Keep current" />
              </div>
              <div>
                <Label className="text-xs">Status</Label>
                <Select value={bStatus} onValueChange={(v) => setBStatus(v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="keep">Keep current</SelectItem>
                    <SelectItem value="attended">Attended</SelectItem>
                    <SelectItem value="missed">Missed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setBulkOpen(false)}>Cancel</Button>
            <Button onClick={handleBulkUpdate} disabled={bulkSaving} className="bg-[#ffb500] text-[#290a52] hover:bg-[#e6a300]">
              {bulkSaving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null} Apply to {selectedIds.length}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>

  )
}

export default CoachingCallAttendanceLog
