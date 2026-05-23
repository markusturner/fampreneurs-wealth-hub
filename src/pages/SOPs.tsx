import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { useIsAdminOrOwner } from '@/hooks/useIsAdminOrOwner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { Plus, FileText, ArrowLeft, BookOpen, Pencil, Trash2 } from 'lucide-react'

interface Sop {
  id: string
  title: string
  description: string | null
  icon: string | null
  cover_image_url: string | null
}

export default function SOPs() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { isAdminOrOwner } = useIsAdminOrOwner()
  const { toast } = useToast()
  const [sops, setSops] = useState<Sop[]>([])
  const [loading, setLoading] = useState(true)
  const [addOpen, setAddOpen] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [creating, setCreating] = useState(false)

  const fetchSops = async () => {
    const { data, error } = await supabase
      .from('sops' as any)
      .select('id, title, description, icon, cover_image_url')
      .order('order_index', { ascending: true })
      .order('created_at', { ascending: true })
    if (!error) setSops((data as unknown as Sop[]) || [])
    setLoading(false)
  }

  useEffect(() => { fetchSops() }, [])

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
      } as any)
      .select('id')
      .single()
    setCreating(false)
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return }
    setAddOpen(false)
    setNewTitle('')
    setNewDescription('')
    navigate(`/sops/${(data as any).id}?edit=1`)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this SOP?')) return
    const { error } = await supabase.from('sops' as any).delete().eq('id', id)
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' })
    else { toast({ title: 'Deleted' }); fetchSops() }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Helmet>
        <title>SOPs | TruHeirs Classroom</title>
        <meta name="description" content="Standard Operating Procedures library for TruHeirs members." />
      </Helmet>

      <div className="border-b border-border bg-card/50">
        <div className="container mx-auto max-w-6xl px-4 sm:px-6 py-8">
          <Button variant="ghost" size="sm" onClick={() => navigate('/classroom')} className="text-muted-foreground hover:text-foreground mb-5 -ml-2">
            <ArrowLeft className="h-4 w-4 mr-1.5" /> Back to Classroom
          </Button>
          <div className="flex flex-col items-center text-center gap-3">
            <div className="h-14 w-14 rounded-2xl bg-[#ffb500] flex items-center justify-center shadow-sm">
              <BookOpen className="h-7 w-7 text-[#290a52]" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">SOPs Library</h1>
            <p className="text-muted-foreground text-sm md:text-base max-w-xl">
              Step-by-step procedures, playbooks, and reference docs for the whole team.
            </p>
            {isAdminOrOwner && (
              <Button onClick={() => setAddOpen(true)} className="mt-3 bg-[#ffb500] hover:bg-[#ffc733] text-[#290a52] font-semibold">
                <Plus className="h-4 w-4 mr-1.5" /> Add Document
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-6xl px-4 sm:px-6 py-8 pb-24">
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-36 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : sops.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <FileText className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">No SOPs yet{isAdminOrOwner ? ' — click "Add Document" to create one.' : '.'}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {sops.map((sop) => (
              <button
                key={sop.id}
                onClick={() => navigate(`/sops/${sop.id}`)}
                className="group relative text-left rounded-xl border border-border bg-card hover:border-[#ffb500]/50 hover:shadow-md transition-all p-5 min-h-[150px] flex flex-col"
              >
                {isAdminOrOwner && (
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition flex gap-1">
                    <span
                      role="button"
                      onClick={(e) => { e.stopPropagation(); navigate(`/sops/${sop.id}?edit=1`) }}
                      className="h-7 w-7 rounded-md bg-muted hover:bg-muted-foreground/20 flex items-center justify-center"
                    >
                      <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                    </span>
                    <span
                      role="button"
                      onClick={(e) => { e.stopPropagation(); handleDelete(sop.id) }}
                      className="h-7 w-7 rounded-md bg-muted hover:bg-red-500/20 flex items-center justify-center"
                    >
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
              </button>
            ))}
          </div>
        )}
      </div>

      <Dialog open={addOpen} onOpenChange={(o) => { if (!creating) setAddOpen(o) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New SOP Document</DialogTitle>
            <DialogDescription>Give your document a name. You'll add the content (text, images, files, embeds) on the next screen.</DialogDescription>
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
