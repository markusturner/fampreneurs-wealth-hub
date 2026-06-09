import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Loader2, Link2, X, Search } from 'lucide-react'
import { toast } from 'sonner'

interface MiniUser {
  user_id: string
  full_name: string
  email: string | null
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  userId: string | null
  userName?: string | null
  onSaved?: () => void
}

export function LinkUsersDialog({ open, onOpenChange, userId, userName, onSaved }: Props) {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [allUsers, setAllUsers] = useState<MiniUser[]>([])
  const [linkedIds, setLinkedIds] = useState<string[]>([])
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (!open || !userId) return
    let cancel = false
    ;(async () => {
      setLoading(true)
      try {
        const { data: me } = await supabase
          .from('profiles')
          .select('linked_user_ids')
          .eq('user_id', userId)
          .maybeSingle()
        if (cancel) return
        setLinkedIds(((me as any)?.linked_user_ids as string[]) ?? [])

        const { data: list } = await supabase
          .from('profiles')
          .select('user_id, first_name, last_name, display_name, email')
          .order('first_name', { ascending: true })
          .limit(1000)
        if (cancel) return
        const mapped: MiniUser[] = (list ?? [])
          .filter((r: any) => r.user_id !== userId)
          .map((r: any) => ({
            user_id: r.user_id,
            full_name: [r.first_name, r.last_name].filter(Boolean).join(' ') || r.display_name || r.email || 'Unnamed',
            email: r.email,
          }))
        setAllUsers(mapped)
      } catch (e: any) {
        toast.error('Failed to load: ' + (e?.message ?? e))
      } finally {
        if (!cancel) setLoading(false)
      }
    })()
    return () => { cancel = true }
  }, [open, userId])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const linkedSet = new Set(linkedIds)
    const others = allUsers.filter((u) => !linkedSet.has(u.user_id))
    if (!q) return others.slice(0, 50)
    return others.filter((u) => u.full_name.toLowerCase().includes(q) || (u.email ?? '').toLowerCase().includes(q)).slice(0, 50)
  }, [allUsers, linkedIds, search])

  const linkedUsers = useMemo(() => {
    const map = new Map(allUsers.map((u) => [u.user_id, u]))
    return linkedIds.map((id) => map.get(id)).filter(Boolean) as MiniUser[]
  }, [allUsers, linkedIds])

  const toggleLink = (otherId: string, link: boolean) => {
    setLinkedIds((prev) => (link ? Array.from(new Set([...prev, otherId])) : prev.filter((x) => x !== otherId)))
  }

  const handleSave = async () => {
    if (!userId) return
    setSaving(true)
    try {
      // 1) Write canonical list on me
      const { error: e1 } = await supabase
        .from('profiles')
        .update({ linked_user_ids: linkedIds } as any)
        .eq('user_id', userId)
      if (e1) throw e1

      // 2) Mirror on every linked user (add me)
      for (const other of linkedIds) {
        const { data: row } = await supabase
          .from('profiles')
          .select('linked_user_ids')
          .eq('user_id', other)
          .maybeSingle()
        const existing: string[] = ((row as any)?.linked_user_ids as string[]) ?? []
        if (!existing.includes(userId)) {
          await supabase
            .from('profiles')
            .update({ linked_user_ids: Array.from(new Set([...existing, userId])) } as any)
            .eq('user_id', other)
        }
      }

      // 3) Remove me from anyone no longer linked
      const { data: stale } = await supabase
        .from('profiles')
        .select('user_id, linked_user_ids')
        .contains('linked_user_ids', [userId])
      for (const row of (stale ?? []) as any[]) {
        if (row.user_id === userId) continue
        if (linkedIds.includes(row.user_id)) continue
        const cleaned = (row.linked_user_ids as string[]).filter((x) => x !== userId)
        await supabase
          .from('profiles')
          .update({ linked_user_ids: cleaned } as any)
          .eq('user_id', row.user_id)
      }

      toast.success('Linked users saved')
      onSaved?.()
      onOpenChange(false)
    } catch (e: any) {
      toast.error('Failed to save: ' + (e?.message ?? e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Link2 className="h-4 w-4" /> Link Users</DialogTitle>
          <DialogDescription>
            Link related users (e.g. siblings or spouses) to {userName || 'this user'}. Linking is two-way — both profiles update.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-8 text-center text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin inline mr-2" /> Loading…</div>
        ) : (
          <div className="space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Currently linked ({linkedUsers.length})</p>
              {linkedUsers.length === 0 ? (
                <p className="text-sm text-muted-foreground">No linked users yet.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {linkedUsers.map((u) => (
                    <Badge key={u.user_id} variant="secondary" className="flex items-center gap-1">
                      {u.full_name}
                      <button onClick={() => toggleLink(u.user_id, false)} className="ml-1 hover:text-destructive">
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Add a link</p>
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name or email" className="pl-7 h-9" />
              </div>
              <div className="max-h-64 overflow-auto border rounded-md mt-2 divide-y">
                {filtered.length === 0 ? (
                  <p className="text-xs text-muted-foreground p-3">No matches.</p>
                ) : filtered.map((u) => (
                  <button
                    key={u.user_id}
                    onClick={() => toggleLink(u.user_id, true)}
                    className="w-full flex items-center justify-between px-3 py-2 text-left text-sm hover:bg-muted/50"
                  >
                    <span>
                      <span className="font-medium">{u.full_name}</span>
                      {u.email && <span className="text-xs text-muted-foreground ml-2">{u.email}</span>}
                    </span>
                    <span className="text-xs text-primary">Link</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || loading}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
            Save links
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
