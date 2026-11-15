import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Check, GraduationCap, Loader2, Pencil, Phone, Plus, Trash2, X } from 'lucide-react'
import markusPhoto from '@/assets/markus_call_photo.png.asset.json'
import { MarkusPage } from '@/components/markus/MarkusNav'
import { MarkusVoiceCall } from '@/components/chat/MarkusVoiceCall'
import { MarkusKnowledgePanel } from '@/components/chat/MarkusKnowledgeBase'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { skillSlug } from '@/lib/markus-skills'
import { useMarkusSkills } from '@/hooks/useMarkusSkills'
import { useOwnerRole } from '@/hooks/useOwnerRole'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { MARKUS_NAV_ICONS } from '@/components/markus/MarkusNav'

export function MarkusVoicePage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  return (
    <MarkusPage title="Voice Call" description="Talk out loud with Markus. He remembers your chats, and every call is saved as a written chat.">
      <div className="relative overflow-hidden rounded-3xl border border-border bg-card p-8 text-center sm:p-12">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--secondary)/0.15),transparent_60%)]" />
        <div className="relative flex flex-col items-center">
          <img src={markusPhoto.url} alt="Markus Turner" className="h-36 w-36 rounded-full border-4 border-secondary/60 object-cover shadow-xl" />
          <h2 className="mt-5 font-montserrat text-xl font-bold">Call Markus</h2>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">Ask about your trusts, your assets or your family plan. You will see the words as you both talk, and you can keep going by text after.</p>
          <MarkusVoiceCall userId={user?.id} projectId={null} onSaved={() => navigate('/markus-ai')}
            trigger={(open) => <Button size="lg" className="mt-6 h-12 gap-2 rounded-full bg-secondary px-8 text-secondary-foreground hover:bg-accent hover:text-accent-foreground" onClick={open}><Phone className="h-4 w-4" />Start voice call</Button>} />
        </div>
      </div>
    </MarkusPage>
  )
}

export function MarkusKnowledgePage() {
  const { user } = useAuth()
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([])
  useEffect(() => {
    if (!user?.id) return
    supabase.from('chat_projects').select('id,name').eq('user_id', user.id).order('created_at', { ascending: false }).then(({ data }) => setProjects(data ?? []))
  }, [user?.id])
  return (
    <MarkusPage title="Knowledge Base" description="Add notes or files about your family and goals. Only you can see them, and Markus uses them in chats and calls.">
      <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
        {user?.id ? <MarkusKnowledgePanel userId={user.id} projects={projects} projectId={null} /> : <Loader2 className="h-5 w-5 animate-spin" />}
      </div>
    </MarkusPage>
  )
}

type Memory = { id: string; content: string; created_at: string }

export function MarkusMemoriesPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [items, setItems] = useState<Memory[]>([])
  const [loading, setLoading] = useState(true)
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [editing, setEditing] = useState<{ id: string; text: string } | null>(null)

  const load = async () => {
    if (!user?.id) return
    const { data } = await supabase.from('markus_user_knowledge').select('id,content,created_at').eq('user_id', user.id).eq('source_type', 'memory').order('created_at', { ascending: false })
    setItems((data as Memory[]) ?? []); setLoading(false)
  }
  useEffect(() => { void load() }, [user?.id])

  const add = async (e: React.FormEvent) => {
    e.preventDefault()
    const text = draft.trim()
    if (!text || !user?.id || busy) return
    setBusy(true)
    const { error } = await supabase.from('markus_user_knowledge').insert({ user_id: user.id, source_type: 'memory', title: text.slice(0, 80), content: text })
    setBusy(false)
    if (error) { toast({ title: 'Could not save memory', variant: 'destructive' }); return }
    setDraft(''); void load()
  }
  const save = async () => {
    if (!editing) return
    const text = editing.text.trim()
    if (!text) return
    const { error } = await supabase.from('markus_user_knowledge').update({ title: text.slice(0, 80), content: text }).eq('id', editing.id)
    if (error) { toast({ title: 'Could not update memory', variant: 'destructive' }); return }
    setItems((prev) => prev.map((m) => m.id === editing.id ? { ...m, content: text } : m)); setEditing(null)
  }
  const remove = async (id: string) => {
    const { error } = await supabase.from('markus_user_knowledge').delete().eq('id', id)
    if (error) toast({ title: 'Could not remove memory', variant: 'destructive' }); else setItems((prev) => prev.filter((m) => m.id !== id))
  }

  return (
    <MarkusPage title="Memories" description="Short facts Markus should always remember about you and your family. Only you can see them.">
      <form onSubmit={add} className="rounded-2xl border border-border bg-card p-4 sm:p-5">
        <Textarea value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={500} rows={2} placeholder="Example: My wife is Sarah and we have two kids, Maya (16) and Jordan (12)." className="resize-none" />
        <div className="mt-3 flex justify-end"><Button type="submit" disabled={busy || !draft.trim()} className="bg-secondary text-secondary-foreground hover:bg-accent hover:text-accent-foreground">{busy && <Loader2 className="animate-spin" />}Remember this</Button></div>
      </form>
      <div className="mt-5 space-y-2">
        {loading ? <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" /> : items.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">No memories yet. Add your first one above.</p> : items.map((m) => (
          <div key={m.id} className="flex items-start gap-3 rounded-xl border border-border bg-card px-4 py-3">
            {editing?.id === m.id ? <>
              <Textarea value={editing.text} onChange={(e) => setEditing({ id: m.id, text: e.target.value })} maxLength={500} rows={2} className="flex-1 resize-none" autoFocus />
              <Button variant="ghost" size="icon" aria-label="Save memory" onClick={() => void save()}><Check /></Button>
              <Button variant="ghost" size="icon" aria-label="Cancel" onClick={() => setEditing(null)}><X /></Button>
            </> : <>
              <p className="min-w-0 flex-1 whitespace-pre-wrap text-sm">{m.content}</p>
              <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Edit memory" onClick={() => setEditing({ id: m.id, text: m.content })}><Pencil /></Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Remove memory" onClick={() => void remove(m.id)}><Trash2 /></Button>
            </>}
          </div>
        ))}
      </div>
    </MarkusPage>
  )
}

export function MarkusSkillsPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { isOwner } = useOwnerRole(user?.id ?? null)
  const { toast } = useToast()
  const { skills, loaded, reload } = useMarkusSkills()
  const [editing, setEditing] = useState<SkillDraft | null>(null)
  const [saving, setSaving] = useState(false)
  const Icon = MARKUS_NAV_ICONS.skills
  const visible = isOwner ? skills : skills.filter((s) => s.isActive)

  const save = async () => {
    if (!editing || saving) return
    const title = editing.title.trim(), body = editing.body.trim(), prompt = editing.prompt.trim()
    if (!title || !prompt) { toast({ title: 'Add a name and what Markus should do', variant: 'destructive' }); return }
    setSaving(true)
    const fields = { title, body, prompt, is_active: editing.isActive }
    const { error } = editing.rowId
      ? await supabase.from('markus_skills').update(fields).eq('id', editing.rowId)
      : await supabase.from('markus_skills').insert({ ...fields, slug: skillSlug(title, skills.map((s) => s.id)), sort_order: Math.max(0, ...skills.map((s) => s.sortOrder)) + 10, created_by: user?.id })
    setSaving(false)
    if (error) { toast({ title: 'Could not save skill', description: error.message, variant: 'destructive' }); return }
    toast({ title: editing.rowId ? 'Skill updated' : 'Skill added' })
    setEditing(null); void reload()
  }
  const remove = async (rowId: string) => {
    if (!window.confirm('Remove this skill for everyone?')) return
    const { error } = await supabase.from('markus_skills').delete().eq('id', rowId)
    if (error) { toast({ title: 'Could not remove skill', description: error.message, variant: 'destructive' }); return }
    void reload()
  }

  return (
    <MarkusPage title="Skills" description="Pick a skill and Markus starts a new chat that walks you through it.">
      {isOwner && (
        <div className="mb-4 flex justify-end">
          <Button onClick={() => setEditing({ title: '', body: '', prompt: '', isActive: true })} className="gap-2 bg-secondary text-secondary-foreground hover:bg-accent hover:text-accent-foreground"><Plus className="h-4 w-4" />Add skill</Button>
        </div>
      )}
      {!loaded ? <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" /> : (
        <div className="grid gap-3 sm:grid-cols-2">
          {visible.map((s) => (
            <div key={s.rowId} className={`group relative rounded-2xl border border-border bg-card transition-all hover:-translate-y-0.5 hover:border-accent hover:shadow-lg ${s.isActive ? '' : 'opacity-60'}`}>
              <button onClick={() => navigate(`/markus-ai?skill=${s.id}`)} className="flex w-full items-start gap-4 p-5 text-left">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary/15 text-secondary-foreground"><Icon className="h-5 w-5" /></span>
                <span className={`min-w-0 flex-1 ${isOwner ? 'pr-16' : ''}`}>
                  <span className="block font-montserrat font-semibold">{s.title}</span>
                  {s.body && <span className="mt-1 block text-sm text-muted-foreground">{s.body}</span>}
                  {!s.isActive && <span className="mt-1 block text-xs font-medium text-muted-foreground">Hidden from members</span>}
                </span>
                {!isOwner && <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-accent" />}
              </button>
              {isOwner && (
                <div className="absolute right-3 top-3 flex gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`Edit ${s.title}`} onClick={() => setEditing({ rowId: s.rowId, title: s.title, body: s.body, prompt: s.prompt, isActive: s.isActive })}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`Remove ${s.title}`} onClick={() => void remove(s.rowId)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      <Dialog open={!!editing} onOpenChange={(open) => { if (!open) setEditing(null) }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>{editing?.rowId ? 'Edit skill' : 'Add a skill'}</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div className="space-y-1.5"><Label htmlFor="skill-title">Skill name</Label><Input id="skill-title" value={editing.title} maxLength={80} onChange={(e) => setEditing({ ...editing, title: e.target.value })} placeholder="Example: Protect my rental properties" /></div>
              <div className="space-y-1.5"><Label htmlFor="skill-body">Short description</Label><Input id="skill-body" value={editing.body} maxLength={200} onChange={(e) => setEditing({ ...editing, body: e.target.value })} placeholder="One line members see under the name" /></div>
              <div className="space-y-1.5"><Label htmlFor="skill-prompt">What Markus should do</Label><Textarea id="skill-prompt" value={editing.prompt} maxLength={3000} rows={5} onChange={(e) => setEditing({ ...editing, prompt: e.target.value })} placeholder="Example: Ask me about my properties one at a time, then explain how I would hold each one." /></div>
              <div className="flex items-center justify-between rounded-xl border border-border px-4 py-3"><Label htmlFor="skill-active">Show to members</Label><Switch id="skill-active" checked={editing.isActive} onCheckedChange={(v) => setEditing({ ...editing, isActive: v })} /></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={() => void save()} disabled={saving} className="bg-secondary text-secondary-foreground hover:bg-accent hover:text-accent-foreground">{saving && <Loader2 className="animate-spin" />}Save skill</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MarkusPage>
  )
}

type SkillDraft = { rowId?: string; title: string; body: string; prompt: string; isActive: boolean }

type Course = { id: string; title: string; description: string | null; image_url: string | null; progress: number }

export function MarkusCoursesPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    if (!user?.id) return
    void (async () => {
      const { data: group } = await supabase.from('community_groups').select('id').eq('name', 'Markus AI Members').maybeSingle()
      if (!group?.id) { setLoading(false); return }
      const [{ data }, { data: enrolled }] = await Promise.all([
        supabase.from('courses').select('id,title,description,image_url,community_ids').eq('status', 'published').order('order_index', { ascending: true }),
        supabase.from('course_enrollments').select('course_id,progress').eq('user_id', user.id),
      ])
      const list = (data ?? []).filter((c: any) => (c.community_ids || []).includes(group.id))
      setCourses(list.map((c: any) => ({ ...c, progress: enrolled?.find((e: any) => e.course_id === c.id)?.progress || 0 })))
      setLoading(false)
    })()
  }, [user?.id])

  return (
    <MarkusPage title="Courses" description="Short lessons from Markus on protecting your family wealth.">
      {loading ? <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" /> : courses.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-border py-14 text-center">
          <GraduationCap className="h-8 w-8 text-muted-foreground" />
          <p className="mt-3 font-semibold">Courses are coming soon</p>
          <p className="mt-1 text-sm text-muted-foreground">New lessons will show up here.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((c) => (
            <button key={c.id} onClick={() => navigate(`/classroom/${c.id}`)} className="overflow-hidden rounded-2xl border border-border bg-card text-left transition-all hover:-translate-y-0.5 hover:border-accent hover:shadow-lg">
              {c.image_url ? <img src={c.image_url} alt="" className="aspect-video w-full object-cover" /> : <div className="flex aspect-video items-center justify-center bg-muted"><GraduationCap className="h-8 w-8 text-muted-foreground" /></div>}
              <div className="p-4">
                <p className="font-montserrat font-semibold">{c.title}</p>
                {c.description && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{c.description}</p>}
                <Progress value={c.progress} className="mt-3 h-1.5" />
              </div>
            </button>
          ))}
        </div>
      )}
    </MarkusPage>
  )
}
