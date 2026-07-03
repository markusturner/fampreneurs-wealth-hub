import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { useIsAdminOrOwner } from '@/hooks/useIsAdminOrOwner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { Plus, FileText, Pencil, Trash2, Lock } from 'lucide-react'
import { SOP_PROGRAM_CODES, programLabel, profileProgramCodes } from '@/lib/programs'
import { cn } from '@/lib/utils'

interface Sop {
  id: string
  title: string
  description: string | null
  icon: string | null
  cover_image_url: string | null
  program_tags: string[]
}

export default function SopLibraryPanel() {
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const { isAdminOrOwner } = useIsAdminOrOwner()
  const { toast } = useToast()
  const [sops, setSops] = useState<Sop[]>([])
  const [loading, setLoading] = useState(true)
  const [addOpen, setAddOpen] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [newPrograms, setNewPrograms] = useState<string[]>([])
  const [creating, setCreating] = useState(false)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dropIndex, setDropIndex] = useState<number | null>(null)

  const userPrograms = useMemo(() => profileProgramCodes(profile?.program_name), [profile?.program_name])
  const canAccessSops = isAdminOrOwner || userPrograms.some(p => SOP_PROGRAM_CODES.includes(p))

  const fetchSops = async () => {
    const { data, error } = await supabase
      .from('sops' as any)
      .select('id, title, description, icon, cover_image_url, program_tags')
      .order('order_index', { ascending: true })
      .order('created_at', { ascending: true })
    if (!error) setSops((data as unknown as Sop[]) || [])
    setLoading(false)
  }

  useEffect(() => { fetchSops() }, [])

  const visibleSops = useMemo(() => {
    if (isAdminOrOwner) return sops
    return sops.filter(s => {
      const tags = s.program_tags || []
      if (tags.length === 0) return false
      return tags.some(t => userPrograms.includes(t as any))
    })
  }, [sops, isAdminOrOwner, userPrograms])

  const togglePrgm = (p: string) => {
    setNewPrograms(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p])
  }

  const handleCreate = async () => {
    if (!user?.id) return
    if (!newTitle.trim()) {
      toast({ title: 'Title required', description: 'Please enter a name for the document.', variant: 'destructive' })
      return
    }
    setCreating(true)
    const { data, error } = await supabase
      .from('sops' as any)
      .insert({
        title: newTitle.trim(),
        description: newDescription.trim() || null,
        content: '',
        created_by: user.id,
        program_tags: newPrograms,
      } as any)
      .select('id')
      .single()
    setCreating(false)
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return }
    setAddOpen(false)
    setNewTitle(''); setNewDescription(''); setNewPrograms([])
    navigate(`/sops/${(data as any).id}?edit=1`)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this SOP?')) return
    const { error } = await supabase.from('sops' as any).delete().eq('id', id)
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' })
    else { toast({ title: 'Deleted' }); fetchSops() }
  }

  const handleDrop = async (toIndex: number) => {
    if (!draggingId) return
    const fromIndex = visibleSops.findIndex(s => s.id === draggingId)
    setDraggingId(null)
    setDropIndex(null)
    if (fromIndex < 0 || fromIndex === toIndex || fromIndex === toIndex - 1) return
    const reordered = [...visibleSops]
    const [moved] = reordered.splice(fromIndex, 1)
    const insertAt = toIndex > fromIndex ? toIndex - 1 : toIndex
    reordered.splice(insertAt, 0, moved)
    const idToNewOrder = new Map(reordered.map((s, i) => [s.id, i]))
    setSops(prev => [...prev].sort((a, b) => (idToNewOrder.get(a.id) ?? 999) - (idToNewOrder.get(b.id) ?? 999)))
    const updates = reordered.map((s, i) =>
      supabase.from('sops' as any).update({ order_index: i } as any).eq('id', s.id)
    )
    const results = await Promise.all(updates)
    if (results.some(r => r.error)) {
      toast({ title: 'Reorder failed', description: 'Some changes could not be saved.', variant: 'destructive' })
      fetchSops()
    }
  }

  if (!canAccessSops && !loading) {
    return (
      <div className="text-center py-12 rounded-xl border border-border bg-card/50">
        <Lock className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-bold mb-2">SOPs Library Locked</h3>
        <p className="text-muted-foreground text-sm">
          Standard Operating Procedures are available for members of <strong>The Family Vault</strong>, <strong>The Family Business Accelerator</strong>, and <strong>The Succession Society</strong>.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {isAdminOrOwner && (
        <div className="flex justify-end">
          <Button onClick={() => setAddOpen(true)} className="bg-[#ffb500] hover:bg-[#ffc733] text-[#290a52] font-semibold">
            <Plus className="h-4 w-4 mr-1.5" /> Add Document
          </Button>
        </div>
      )}


      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-36 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : visibleSops.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground rounded-xl border border-border bg-card/50">
          <FileText className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">No SOPs yet{isAdminOrOwner ? ' — click "Add Document" to create one.' : '.'}</p>
        </div>
      ) : (
        <>
          {isAdminOrOwner && (
            <p className="text-xs text-muted-foreground mb-3 text-center">
              Drag and drop documents to reorder them. A gold line shows where the document will drop.
            </p>
          )}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {visibleSops.map((sop, index) => (
              <div
                key={sop.id}
                className="relative"
                onDragOver={(e) => {
                  if (!isAdminOrOwner || !draggingId) return
                  e.preventDefault()
                  const rect = e.currentTarget.getBoundingClientRect()
                  const isAfter = e.clientX - rect.left > rect.width / 2
                  setDropIndex(isAfter ? index + 1 : index)
                }}
                onDrop={(e) => {
                  if (!isAdminOrOwner || !draggingId) return
                  e.preventDefault()
                  handleDrop(dropIndex ?? index)
                }}
              >
                {isAdminOrOwner && dropIndex === index && draggingId && (
                  <div className="absolute -left-2 top-0 bottom-0 w-1 rounded-full bg-[#ffb500] shadow-[0_0_8px_2px_rgba(255,181,0,0.5)] z-10" />
                )}
                {isAdminOrOwner && dropIndex === index + 1 && draggingId && index === visibleSops.length - 1 && (
                  <div className="absolute -right-2 top-0 bottom-0 w-1 rounded-full bg-[#ffb500] shadow-[0_0_8px_2px_rgba(255,181,0,0.5)] z-10" />
                )}
                <button
                  draggable={isAdminOrOwner}
                  onDragStart={() => setDraggingId(sop.id)}
                  onDragEnd={() => { setDraggingId(null); setDropIndex(null) }}
                  onClick={() => navigate(`/sops/${sop.id}`)}
                  className={cn(
                    "group relative text-left rounded-xl border border-border bg-card hover:border-[#ffb500]/50 hover:shadow-md transition-all p-5 min-h-[150px] flex flex-col w-full",
                    isAdminOrOwner && "cursor-grab active:cursor-grabbing",
                    draggingId === sop.id && "opacity-40"
                  )}
                >
                  {isAdminOrOwner && (
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition flex gap-1">
                      <span role="button" onClick={(e) => { e.stopPropagation(); navigate(`/sops/${sop.id}?edit=1`) }} className="h-7 w-7 rounded-md bg-muted hover:bg-muted-foreground/20 flex items-center justify-center">
                        <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                      </span>
                      <span role="button" onClick={(e) => { e.stopPropagation(); handleDelete(sop.id) }} className="h-7 w-7 rounded-md bg-muted hover:bg-red-500/20 flex items-center justify-center">
                        <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                      </span>
                    </div>
                  )}
                  <p className="text-[10px] uppercase tracking-wider text-[#ffb500] mb-2 font-semibold">SOP</p>
                  <div className="h-9 w-9 rounded-lg bg-[#ffb500]/15 border border-[#ffb500]/30 flex items-center justify-center mb-3">
                    <FileText className="h-4 w-4 text-[#ffb500]" />
                  </div>
                  <h3 className="font-semibold text-foreground text-sm md:text-base leading-snug line-clamp-2">{sop.title}</h3>
                  {sop.description && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{sop.description}</p>
                  )}
                  {sop.program_tags && sop.program_tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {sop.program_tags.map(t => (
                        <Badge key={t} variant="secondary" className="text-[9px] py-0 px-1.5">{programLabel(t)}</Badge>
                      ))}
                    </div>
                  )}
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      <Dialog open={addOpen} onOpenChange={(o) => { if (!creating) setAddOpen(o) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New SOP Document</DialogTitle>
            <DialogDescription>Give your document a name and choose who can see it. You'll add the content (text, images, files, embeds) on the next screen.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="sop-title">Title</Label>
              <Input
                id="sop-title"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g. Onboarding new clients"
                autoFocus
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleCreate() } }}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sop-desc">Short description <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Textarea
                id="sop-desc"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="What is this document about?"
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>Visible to programs</Label>
              <div className="rounded-md border border-border divide-y divide-border">
                {SOP_PROGRAM_CODES.map(p => (
                  <label key={p} className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-muted/40">
                    <Checkbox checked={newPrograms.includes(p)} onCheckedChange={() => togglePrgm(p)} />
                    <span className="text-sm">{programLabel(p)}</span>
                  </label>
                ))}
              </div>
              <p className="text-[11px] text-muted-foreground">Members not in any selected program will not see this SOP.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)} disabled={creating}>Cancel</Button>
            <Button onClick={handleCreate} disabled={creating || !newTitle.trim()} className="bg-[#ffb500] hover:bg-[#ffc733] text-[#290a52] font-semibold">
              {creating ? 'Creating…' : 'Create & open editor'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
