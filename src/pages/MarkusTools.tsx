import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, GraduationCap, Loader2, Lock, Pencil, Phone, Plus, Search, Trash2, X } from 'lucide-react'
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
import { canEditSkill, skillSlug, splitSkills } from '@/lib/markus-skills'
import { useMarkusSkills, type StoredMarkusSkill } from '@/hooks/useMarkusSkills'
import { useOwnerRole } from '@/hooks/useOwnerRole'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { MARKUS_NAV_ICONS } from '@/components/markus/MarkusNav'
import { AddCourseDialog } from '@/components/classroom/AddCourseDialog'
import { EditCourseDialog } from '@/components/classroom/EditCourseDialog'
import { useIsAdminOrOwner } from '@/hooks/useIsAdminOrOwner'

const MARKUS_COURSE_COMMUNITY = 'Markus AI Members'

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

// Works like ChatGPT and Claude memory: Markus saves facts from chats, and members can turn it off, edit or delete them.
export function MarkusMemoriesPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [items, setItems] = useState<Memory[]>([])
  const [loading, setLoading] = useState(true)
  const [enabled, setEnabled] = useState(true)
  const [draft, setDraft] = useState('')
  const [search, setSearch] = useState('')
  const [busy, setBusy] = useState(false)
  const [editing, setEditing] = useState<{ id: string; text: string } | null>(null)

  const load = async () => {
    if (!user?.id) return
    const [{ data }, { data: setting }] = await Promise.all([
      supabase.from('markus_user_knowledge').select('id,content,created_at').eq('user_id', user.id).eq('source_type', 'memory').order('created_at', { ascending: false }),
      supabase.from('markus_memory_settings').select('memory_enabled').eq('user_id', user.id).maybeSingle(),
    ])
    setItems((data as Memory[]) ?? []); setEnabled(setting?.memory_enabled !== false); setLoading(false)
  }
  useEffect(() => { void load() }, [user?.id])

  const toggle = async (value: boolean) => {
    if (!user?.id) return
    setEnabled(value)
    const { error } = await supabase.from('markus_memory_settings').upsert({ user_id: user.id, memory_enabled: value, updated_at: new Date().toISOString() })
    if (error) { setEnabled(!value); toast({ title: 'Could not change memory setting', variant: 'destructive' }) }
  }
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
  const clearAll = async () => {
    if (!user?.id || !window.confirm('Delete all memories? Markus will forget everything saved here.')) return
    const { error } = await supabase.from('markus_user_knowledge').delete().eq('user_id', user.id).eq('source_type', 'memory')
    if (error) toast({ title: 'Could not delete memories', variant: 'destructive' }); else setItems([])
  }
  const shown = search.trim() ? items.filter((m) => m.content.toLowerCase().includes(search.trim().toLowerCase())) : items

  return (
    <MarkusPage title="Memories" description="Markus remembers helpful things you share in chats, so you do not have to repeat yourself. Only you can see them.">
      <div className="flex items-start justify-between gap-4 rounded-2xl border border-border bg-card p-4 sm:p-5">
        <div>
          <Label htmlFor="memory-on" className="text-base font-semibold">Memory</Label>
          <p className="mt-1 text-sm text-muted-foreground">{enabled ? 'On. Markus saves and uses memories in your chats and calls.' : 'Off. Markus will not save new memories or use saved ones.'}</p>
        </div>
        <Switch id="memory-on" checked={enabled} onCheckedChange={(v) => void toggle(v)} disabled={loading} />
      </div>
      <form onSubmit={add} className="mt-4 rounded-2xl border border-border bg-card p-4 sm:p-5">
        <Label htmlFor="memory-new" className="text-sm font-semibold">Add a memory</Label>
        <Textarea id="memory-new" value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={500} rows={2} placeholder="Example: My wife is Sarah and we have two kids, Maya (16) and Jordan (12)." className="mt-2 resize-none" />
        <div className="mt-3 flex justify-end"><Button type="submit" disabled={busy || !draft.trim()} className="bg-secondary text-secondary-foreground hover:bg-accent hover:text-accent-foreground">{busy && <Loader2 className="animate-spin" />}Remember this</Button></div>
      </form>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-montserrat text-lg font-semibold">Saved memories{items.length ? ` (${items.length})` : ''}</h2>
        <div className="flex items-center gap-2">
          {items.length > 3 && <div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search memories" aria-label="Search memories" className="h-9 w-48 pl-9" /></div>}
          {items.length > 0 && <Button variant="outline" size="sm" onClick={() => void clearAll()} className="text-destructive hover:text-destructive">Delete all</Button>}
        </div>
      </div>
      <div className="mt-3 space-y-2">
        {loading ? <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" /> : shown.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">{items.length ? 'No memories match your search.' : 'No memories yet. Chat with Markus or add one above.'}</p> : shown.map((m) => (
          <div key={m.id} className="flex items-start gap-3 rounded-xl border border-border bg-card px-4 py-3">
            {editing?.id === m.id ? <>
              <Textarea value={editing.text} onChange={(e) => setEditing({ id: m.id, text: e.target.value })} maxLength={500} rows={2} className="flex-1 resize-none" autoFocus />
              <Button variant="ghost" size="icon" aria-label="Save memory" onClick={() => void save()}><Check /></Button>
              <Button variant="ghost" size="icon" aria-label="Cancel" onClick={() => setEditing(null)}><X /></Button>
            </> : <>
              <div className="min-w-0 flex-1">
                <p className="whitespace-pre-wrap text-sm">{m.content}</p>
                <p className="mt-1 text-xs text-muted-foreground">{new Date(m.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</p>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Edit memory" onClick={() => setEditing({ id: m.id, text: m.content })}><Pencil /></Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Remove memory" onClick={() => void remove(m.id)}><Trash2 /></Button>
            </>}
          </div>
        ))}
      </div>
    </MarkusPage>
  )
}

function SkillCard({ skill, canEdit, onOpen, onEdit, onRemove, onToggle }: { skill: StoredMarkusSkill; canEdit: boolean; onOpen: () => void; onEdit: () => void; onRemove: () => void; onToggle?: (on: boolean) => void }) {
  const Icon = MARKUS_NAV_ICONS.skills
  const inherited = skill.ownerUserId === null
  return (
    <div className={`group relative rounded-2xl border border-border bg-card transition-all hover:-translate-y-0.5 hover:border-accent hover:shadow-lg ${skill.isActive ? '' : 'opacity-60'}`}>
      <button onClick={onOpen} disabled={!skill.isActive} className="flex w-full items-start gap-4 p-5 text-left">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary/15 text-secondary-foreground"><Icon className="h-5 w-5" /></span>
        <span className="min-w-0 flex-1 pr-20">
          <span className="block font-montserrat font-semibold">{skill.title}</span>
          {skill.body && <span className="mt-1 block text-sm text-muted-foreground">{skill.body}</span>}
          {!skill.isActive && <span className="mt-1 block text-xs font-medium text-muted-foreground">{inherited ? 'Hidden from members' : 'Turned off'}</span>}
        </span>
      </button>
      <div className="absolute right-3 top-3 flex items-center gap-1">
        {canEdit ? <>
          {onToggle && <Switch checked={skill.isActive} onCheckedChange={onToggle} aria-label={`Turn ${skill.title} ${skill.isActive ? 'off' : 'on'}`} className="mr-1" />}
          <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`Edit ${skill.title}`} onClick={onEdit}><Pencil className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`Remove ${skill.title}`} onClick={onRemove}><Trash2 className="h-4 w-4" /></Button>
        </> : inherited && <span title="Inherited from Markus. You can use it but not change it." className="flex h-8 w-8 items-center justify-center text-muted-foreground"><Lock className="h-4 w-4" /></span>}
      </div>
    </div>
  )
}

// Like Claude skills: inherited skills from Markus everyone can use, plus each member's own skills.
export function MarkusSkillsPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { isOwner } = useOwnerRole(user?.id ?? null)
  const { toast } = useToast()
  const { skills, loaded, reload } = useMarkusSkills()
  const [editing, setEditing] = useState<SkillDraft | null>(null)
  const [saving, setSaving] = useState(false)
  const { inherited, mine } = splitSkills(skills, user?.id)
  const shownInherited = isOwner ? inherited : inherited.filter((s) => s.isActive)

  const save = async () => {
    if (!editing || saving || !user?.id) return
    const title = editing.title.trim(), body = editing.body.trim(), prompt = editing.prompt.trim()
    if (!title || !prompt) { toast({ title: 'Add a name and what Markus should do', variant: 'destructive' }); return }
    setSaving(true)
    const fields = { title, body, prompt, is_active: editing.isActive }
    const group = editing.personal ? mine : inherited
    const { error } = editing.rowId
      ? await supabase.from('markus_skills').update(fields).eq('id', editing.rowId)
      : await supabase.from('markus_skills').insert({ ...fields, slug: skillSlug(editing.personal ? `my ${title}` : title, skills.map((s) => s.id)), sort_order: Math.max(0, ...group.map((s) => s.sortOrder)) + 10, created_by: user.id, owner_user_id: editing.personal ? user.id : null })
    setSaving(false)
    if (error) { toast({ title: 'Could not save skill', description: error.message, variant: 'destructive' }); return }
    toast({ title: editing.rowId ? 'Skill updated' : 'Skill added' })
    setEditing(null); void reload()
  }
  const remove = async (skill: StoredMarkusSkill) => {
    if (!window.confirm(skill.ownerUserId ? 'Delete this skill?' : 'Remove this inherited skill for everyone?')) return
    const { error } = await supabase.from('markus_skills').delete().eq('id', skill.rowId)
    if (error) { toast({ title: 'Could not remove skill', description: error.message, variant: 'destructive' }); return }
    void reload()
  }
  const toggle = async (skill: StoredMarkusSkill, on: boolean) => {
    const { error } = await supabase.from('markus_skills').update({ is_active: on }).eq('id', skill.rowId)
    if (error) toast({ title: 'Could not change skill', variant: 'destructive' }); else void reload()
  }
  const edit = (s: StoredMarkusSkill) => setEditing({ rowId: s.rowId, title: s.title, body: s.body, prompt: s.prompt, isActive: s.isActive, personal: s.ownerUserId !== null })
  const open = (s: StoredMarkusSkill) => navigate(`/markus-ai?skill=${s.id}`)

  return (
    <MarkusPage title="Skills" description="Pick a skill and Markus starts a new chat that walks you through it. Use the skills from Markus or make your own.">
      <section>
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-montserrat text-lg font-semibold">My skills</h2>
            <p className="text-sm text-muted-foreground">Skills you make. Only you can see and change them.</p>
          </div>
          <Button onClick={() => setEditing({ title: '', body: '', prompt: '', isActive: true, personal: true })} className="gap-2 bg-secondary text-secondary-foreground hover:bg-accent hover:text-accent-foreground"><Plus className="h-4 w-4" />Create skill</Button>
        </div>
        {!loaded ? <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" /> : mine.length === 0 ? (
          <button onClick={() => setEditing({ title: '', body: '', prompt: '', isActive: true, personal: true })} className="flex w-full flex-col items-center rounded-2xl border border-dashed border-border py-8 text-center transition-colors hover:border-accent">
            <Plus className="h-6 w-6 text-muted-foreground" />
            <span className="mt-2 font-semibold">Create your first skill</span>
            <span className="mt-1 text-sm text-muted-foreground">Save a task you ask Markus often, like reviewing your monthly statements.</span>
          </button>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {mine.map((s) => <SkillCard key={s.rowId} skill={s} canEdit onOpen={() => open(s)} onEdit={() => edit(s)} onRemove={() => void remove(s)} onToggle={(on) => void toggle(s, on)} />)}
          </div>
        )}
      </section>

      <section className="mt-10">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 font-montserrat text-lg font-semibold">Inherited skills <Lock className="h-4 w-4 text-muted-foreground" /></h2>
            <p className="text-sm text-muted-foreground">{isOwner ? 'Skills every member gets from you. Only you can change them.' : 'Skills from Markus. You can use them, but they cannot be changed.'}</p>
          </div>
          {isOwner && <Button variant="outline" onClick={() => setEditing({ title: '', body: '', prompt: '', isActive: true, personal: false })} className="gap-2"><Plus className="h-4 w-4" />Add inherited skill</Button>}
        </div>
        {!loaded ? <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" /> : (
          <div className="grid gap-3 sm:grid-cols-2">
            {shownInherited.map((s) => <SkillCard key={s.rowId} skill={s} canEdit={canEditSkill(s, user?.id, isOwner)} onOpen={() => open(s)} onEdit={() => edit(s)} onRemove={() => void remove(s)} />)}
          </div>
        )}
      </section>

      <Dialog open={!!editing} onOpenChange={(o) => { if (!o) setEditing(null) }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>{editing?.rowId ? 'Edit skill' : editing?.personal ? 'Create a skill' : 'Add an inherited skill'}</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div className="space-y-1.5"><Label htmlFor="skill-title">Skill name</Label><Input id="skill-title" value={editing.title} maxLength={80} onChange={(e) => setEditing({ ...editing, title: e.target.value })} placeholder="Example: Protect my rental properties" /></div>
              <div className="space-y-1.5"><Label htmlFor="skill-body">Short description</Label><Input id="skill-body" value={editing.body} maxLength={200} onChange={(e) => setEditing({ ...editing, body: e.target.value })} placeholder="One line shown under the name" /></div>
              <div className="space-y-1.5"><Label htmlFor="skill-prompt">What Markus should do</Label><Textarea id="skill-prompt" value={editing.prompt} maxLength={3000} rows={5} onChange={(e) => setEditing({ ...editing, prompt: e.target.value })} placeholder="Example: Ask me about my properties one at a time, then explain how I would hold each one." /></div>
              <div className="flex items-center justify-between rounded-xl border border-border px-4 py-3"><Label htmlFor="skill-active">{editing.personal ? 'Turned on' : 'Show to members'}</Label><Switch id="skill-active" checked={editing.isActive} onCheckedChange={(v) => setEditing({ ...editing, isActive: v })} /></div>
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

type SkillDraft = { rowId?: string; title: string; body: string; prompt: string; isActive: boolean; personal: boolean }

type Course = { id: string; title: string; description: string | null; image_url: string | null; community_ids: string[]; status: string; progress: number }

// Owners and admins add, edit and delete Markus AI courses here, with the same tools as the program classrooms.
export function MarkusCoursesPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { isAdminOrOwner } = useIsAdminOrOwner()
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [editingCourse, setEditingCourse] = useState<Course | null>(null)

  const load = useCallback(async () => {
    if (!user?.id) return
    const { data: group } = await supabase.from('community_groups').select('id').eq('name', MARKUS_COURSE_COMMUNITY).maybeSingle()
    if (!group?.id) { setLoading(false); return }
    let query = supabase.from('courses').select('id,title,description,image_url,community_ids,status').order('order_index', { ascending: true })
    if (!isAdminOrOwner) query = query.eq('status', 'published')
    const [{ data }, { data: enrolled }] = await Promise.all([
      query,
      supabase.from('course_enrollments').select('course_id,progress').eq('user_id', user.id),
    ])
    const list = (data ?? []).filter((c: any) => (c.community_ids || []).includes(group.id))
    setCourses(list.map((c: any) => ({ ...c, community_ids: c.community_ids || [], progress: enrolled?.find((e: any) => e.course_id === c.id)?.progress || 0 })))
    setLoading(false)
  }, [user?.id, isAdminOrOwner])
  useEffect(() => { void load() }, [load])

  return (
    <MarkusPage title="Courses" description="Short lessons from Markus on protecting your family wealth.">
      {isAdminOrOwner && (
        <div className="mb-4 flex justify-end">
          <Button onClick={() => setAdding(true)} className="gap-2 bg-secondary text-secondary-foreground hover:bg-accent hover:text-accent-foreground"><Plus className="h-4 w-4" />Add course</Button>
        </div>
      )}
      {loading ? <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" /> : courses.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-border py-14 text-center">
          <GraduationCap className="h-8 w-8 text-muted-foreground" />
          <p className="mt-3 font-semibold">Courses are coming soon</p>
          <p className="mt-1 text-sm text-muted-foreground">{isAdminOrOwner ? 'Add a course and it will show up here for Markus AI members.' : 'New lessons will show up here.'}</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((c) => (
            <div key={c.id} className="group relative overflow-hidden rounded-2xl border border-border bg-card transition-all hover:-translate-y-0.5 hover:border-accent hover:shadow-lg">
              <button onClick={() => navigate(`/classroom/${c.id}`)} className="block w-full text-left">
                {c.image_url ? <img src={c.image_url} alt="" className="aspect-video w-full object-cover" /> : <div className="flex aspect-video items-center justify-center bg-muted"><GraduationCap className="h-8 w-8 text-muted-foreground" /></div>}
                <div className="p-4">
                  <p className="font-montserrat font-semibold">{c.title}</p>
                  {c.description && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{c.description}</p>}
                  {c.status !== 'published' && <p className="mt-1 text-xs font-medium text-muted-foreground">Draft</p>}
                  <Progress value={c.progress} className="mt-3 h-1.5" />
                </div>
              </button>
              {isAdminOrOwner && (
                <Button variant="secondary" size="icon" aria-label={`Edit ${c.title}`} title="Edit or delete course" onClick={() => setEditingCourse(c)} className="absolute right-2 top-2 h-8 w-8 rounded-full shadow"><Pencil className="h-4 w-4" /></Button>
              )}
            </div>
          ))}
        </div>
      )}
      <AddCourseDialog open={adding} onOpenChange={setAdding} onCreated={() => void load()} defaultCommunityNames={[MARKUS_COURSE_COMMUNITY]} />
      <EditCourseDialog course={editingCourse} open={!!editingCourse} onOpenChange={(o) => { if (!o) setEditingCourse(null) }} onUpdated={() => void load()} onDeleted={() => { setEditingCourse(null); void load() }} />
    </MarkusPage>
  )
}
