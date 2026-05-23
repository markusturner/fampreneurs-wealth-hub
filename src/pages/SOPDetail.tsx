import { useEffect, useRef, useState, useMemo } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { useIsAdminOrOwner } from '@/hooks/useIsAdminOrOwner'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { SopEditor } from '@/components/sops/SopEditor'
import { ArrowLeft, Pencil, Save, X, Loader2, FileText, Play, Lock } from 'lucide-react'
import { SOP_PROGRAM_CODES, programLabel, profileProgramCodes } from '@/lib/programs'

interface LinkedLesson { id: string; title: string; course_id: string }

function normalize(s: string) {
  return (s || '').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim()
}

export default function SOPDetail() {
  const { sopId } = useParams<{ sopId: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const { isAdminOrOwner } = useIsAdminOrOwner()
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState(searchParams.get('edit') === '1')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [content, setContent] = useState('')
  const [programTags, setProgramTags] = useState<string[]>([])
  const [linkedLessons, setLinkedLessons] = useState<LinkedLesson[]>([])
  const [accessDenied, setAccessDenied] = useState(false)

  const userPrograms = useMemo(() => profileProgramCodes(profile?.program_name), [profile?.program_name])

  const scrollRef = useRef<HTMLDivElement | null>(null)
  const maxScrollRef = useRef(0)
  const startedAtRef = useRef<number>(Date.now())
  const accumSecondsRef = useRef(0)

  const loadLinks = async (id: string) => {
    const { data } = await supabase
      .from('sop_lesson_links' as any)
      .select('lesson_id')
      .eq('sop_id', id)
    const lessonIds = (data || []).map((x: any) => x.lesson_id)
    if (lessonIds.length === 0) { setLinkedLessons([]); return }
    const { data: lessons } = await supabase
      .from('course_videos')
      .select('id, title, course_id')
      .in('id', lessonIds)
    setLinkedLessons((lessons || []) as any)
  }

  useEffect(() => {
    const load = async () => {
      if (!sopId) return
      const { data, error } = await supabase.from('sops' as any).select('*').eq('id', sopId).maybeSingle()
      if (error || !data) { toast({ title: 'Not found', variant: 'destructive' }); navigate('/sops'); return }
      const d = data as any
      // Access check
      const tags: string[] = d.program_tags || []
      if (!isAdminOrOwner && (tags.length === 0 || !tags.some(t => userPrograms.includes(t as any)))) {
        setAccessDenied(true); setLoading(false); return
      }
      setTitle(d.title); setDescription(d.description || ''); setContent(d.content || ''); setProgramTags(tags)
      setLoading(false)
      loadLinks(sopId)
    }
    load()
  }, [sopId, isAdminOrOwner, userPrograms.join(',')])

  // Scroll tracking (unchanged)
  useEffect(() => {
    if (editing || !sopId || !user?.id) return
    startedAtRef.current = Date.now()
    accumSecondsRef.current = 0
    const onScroll = () => {
      const el = scrollRef.current; if (!el) return
      const pct = Math.min(100, Math.round(((el.scrollTop + el.clientHeight) / Math.max(el.scrollHeight, 1)) * 100))
      if (pct > maxScrollRef.current) maxScrollRef.current = pct
    }
    const el = scrollRef.current
    el?.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    const tick = setInterval(() => { if (document.visibilityState === 'visible') accumSecondsRef.current += 5 }, 5000)
    const persist = async () => {
      const seconds = accumSecondsRef.current; const pct = maxScrollRef.current
      if (seconds <= 0 && pct <= 0) return
      try {
        const { data: existing } = await supabase.from('sop_views' as any).select('id, max_scroll_pct, total_time_seconds, view_count').eq('sop_id', sopId).eq('user_id', user.id).maybeSingle()
        if (existing) {
          const e = existing as any
          await supabase.from('sop_views' as any).update({ max_scroll_pct: Math.max(e.max_scroll_pct || 0, pct), total_time_seconds: (e.total_time_seconds || 0) + seconds, view_count: (e.view_count || 1) + 1, last_viewed_at: new Date().toISOString() } as any).eq('id', e.id)
        } else {
          await supabase.from('sop_views' as any).insert({ sop_id: sopId, user_id: user.id, max_scroll_pct: pct, total_time_seconds: seconds, view_count: 1 } as any)
        }
      } catch {}
      accumSecondsRef.current = 0
    }
    const onBeforeUnload = () => { persist() }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => { el?.removeEventListener('scroll', onScroll); clearInterval(tick); window.removeEventListener('beforeunload', onBeforeUnload); persist() }
  }, [editing, sopId, user?.id])

  // Auto-link by title (on save & on first edit-open)
  const autoLinkByTitle = async (id: string, t: string) => {
    if (!t.trim()) return
    const norm = normalize(t)
    if (!norm) return
    const { data: lessons } = await supabase.from('course_videos').select('id, title')
    const matches = (lessons || []).filter((l: any) => {
      const ln = normalize(l.title)
      if (!ln) return false
      return ln === norm || ln.includes(norm) || norm.includes(ln)
    })
    if (matches.length === 0) return
    const rows = matches.map((m: any) => ({ sop_id: id, lesson_id: m.id, link_type: 'auto' }))
    await supabase.from('sop_lesson_links' as any).upsert(rows, { onConflict: 'sop_id,lesson_id' } as any)
    loadLinks(id)
  }

  const togglePrgm = (p: string) => setProgramTags(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p])

  const save = async () => {
    if (!sopId) return
    setSaving(true)
    const { error } = await supabase.from('sops' as any).update({ title, description, content, program_tags: programTags } as any).eq('id', sopId)
    if (error) { setSaving(false); toast({ title: 'Save failed', description: error.message, variant: 'destructive' }); return }
    await autoLinkByTitle(sopId, title)
    setSaving(false)
    toast({ title: 'Saved' }); setEditing(false)
  }

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-[#ffb500]" /></div>
  if (accessDenied) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="max-w-md text-center p-6">
          <Lock className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <h1 className="text-xl font-bold mb-1">This SOP is restricted</h1>
          <p className="text-sm text-muted-foreground">You don't have access to this document.</p>
          <Button variant="ghost" size="sm" onClick={() => navigate('/sops')} className="mt-4"><ArrowLeft className="h-4 w-4 mr-1.5" /> Back to SOPs</Button>
        </div>
      </div>
    )
  }

  return (
    <div ref={scrollRef} className="h-[calc(100vh-3.5rem)] md:h-screen overflow-y-auto bg-background text-foreground">
      <Helmet><title>{title} | SOPs</title></Helmet>

      <div className="sticky top-0 z-20 backdrop-blur bg-background/85 border-b border-border">
        <div className="container mx-auto max-w-3xl px-4 py-2 flex items-center justify-between gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/sops')} className="text-muted-foreground hover:text-foreground -ml-2 h-8">
            <ArrowLeft className="h-4 w-4 mr-1.5" /> SOPs
          </Button>
          {isAdminOrOwner && (
            editing ? (
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" onClick={() => setEditing(false)} className="h-8 text-muted-foreground hover:text-foreground"><X className="h-4 w-4 mr-1" /> Cancel</Button>
                <Button size="sm" disabled={saving} onClick={save} className="h-8 bg-[#ffb500] hover:bg-[#ffc733] text-[#290a52] font-semibold">
                  {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />} Save
                </Button>
              </div>
            ) : (
              <Button size="sm" variant="ghost" onClick={() => setEditing(true)} className="h-8 text-muted-foreground hover:text-foreground"><Pencil className="h-4 w-4 mr-1.5" /> Edit</Button>
            )
          )}
        </div>
      </div>

      <div className="container mx-auto max-w-3xl px-4 md:px-8 pt-10 pb-32">
        <div className="mb-4">
          <div className="h-12 w-12 rounded-lg bg-[#ffb500]/10 border border-[#ffb500]/20 flex items-center justify-center">
            <FileText className="h-6 w-6 text-[#ffb500]" />
          </div>
        </div>

        {editing ? (
          <>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Untitled" className="w-full bg-transparent border-0 outline-none text-4xl md:text-5xl font-bold tracking-tight placeholder:text-muted-foreground/40 mb-2" />
            <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Add a description…" className="w-full bg-transparent border-0 outline-none text-base text-muted-foreground placeholder:text-muted-foreground/50 mb-6" />

            <div className="mb-6 rounded-lg border border-border p-3 bg-muted/30">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Visible to programs</p>
              <div className="flex flex-wrap gap-2">
                {SOP_PROGRAM_CODES.map(p => (
                  <label key={p} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox checked={programTags.includes(p)} onCheckedChange={() => togglePrgm(p)} />
                    {programLabel(p)}
                  </label>
                ))}
              </div>
            </div>

            <SopEditor content={content} onChange={setContent} bare />
          </>
        ) : (
          <>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-3 leading-tight">{title || 'Untitled'}</h1>
            {description && <p className="text-base text-muted-foreground mb-6">{description}</p>}
            {programTags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-6">
                {programTags.map(t => <Badge key={t} variant="secondary" className="text-[10px]">{programLabel(t)}</Badge>)}
              </div>
            )}
            <SopEditor content={content} onChange={() => {}} editable={false} bare />

            {linkedLessons.length > 0 && (
              <div className="mt-10 pt-6 border-t border-border">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">Linked Lessons</h3>
                <div className="space-y-2">
                  {linkedLessons.map(l => (
                    <button key={l.id} onClick={() => navigate(`/classroom/${l.course_id}?lesson=${l.id}`)} className="w-full text-left flex items-center gap-3 px-4 py-3 rounded-xl bg-muted/40 hover:bg-muted/70 border border-transparent hover:border-border transition-all">
                      <div className="h-8 w-8 rounded-lg bg-[#290a52] flex items-center justify-center">
                        <Play className="h-4 w-4 text-[#ffb500]" />
                      </div>
                      <span className="text-sm font-medium flex-1">{l.title}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
