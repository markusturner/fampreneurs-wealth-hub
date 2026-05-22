import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { useIsAdminOrOwner } from '@/hooks/useIsAdminOrOwner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { SopEditor } from '@/components/sops/SopEditor'
import { ArrowLeft, Pencil, Save, X, Loader2 } from 'lucide-react'

export default function SOPDetail() {
  const { sopId } = useParams<{ sopId: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { isAdminOrOwner } = useIsAdminOrOwner()
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState(searchParams.get('edit') === '1')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [content, setContent] = useState('')

  // Scroll / time tracking
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const maxScrollRef = useRef(0)
  const startedAtRef = useRef<number>(Date.now())
  const accumSecondsRef = useRef(0)

  useEffect(() => {
    const load = async () => {
      if (!sopId) return
      const { data, error } = await supabase.from('sops' as any).select('*').eq('id', sopId).maybeSingle()
      if (error || !data) { toast({ title: 'Not found', variant: 'destructive' }); navigate('/sops'); return }
      const d = data as any
      setTitle(d.title); setDescription(d.description || ''); setContent(d.content || '')
      setLoading(false)
    }
    load()
  }, [sopId])

  // Scroll-depth & dwell-time tracking
  useEffect(() => {
    if (editing || !sopId || !user?.id) return
    startedAtRef.current = Date.now()
    accumSecondsRef.current = 0

    const onScroll = () => {
      const el = scrollRef.current
      if (!el) return
      const pct = Math.min(100, Math.round(((el.scrollTop + el.clientHeight) / Math.max(el.scrollHeight, 1)) * 100))
      if (pct > maxScrollRef.current) maxScrollRef.current = pct
    }

    const el = scrollRef.current
    el?.addEventListener('scroll', onScroll, { passive: true })
    onScroll()

    const tick = setInterval(() => {
      if (document.visibilityState === 'visible') accumSecondsRef.current += 5
    }, 5000)

    const persist = async () => {
      const seconds = accumSecondsRef.current
      const pct = maxScrollRef.current
      if (seconds <= 0 && pct <= 0) return
      try {
        // Upsert-by-unique (sop_id, user_id)
        const { data: existing } = await supabase
          .from('sop_views' as any)
          .select('id, max_scroll_pct, total_time_seconds, view_count')
          .eq('sop_id', sopId)
          .eq('user_id', user.id)
          .maybeSingle()
        if (existing) {
          const e = existing as any
          await supabase.from('sop_views' as any).update({
            max_scroll_pct: Math.max(e.max_scroll_pct || 0, pct),
            total_time_seconds: (e.total_time_seconds || 0) + seconds,
            view_count: (e.view_count || 1) + 1,
            last_viewed_at: new Date().toISOString(),
          } as any).eq('id', e.id)
        } else {
          await supabase.from('sop_views' as any).insert({
            sop_id: sopId, user_id: user.id,
            max_scroll_pct: pct, total_time_seconds: seconds, view_count: 1,
          } as any)
        }
      } catch { /* no-op */ }
      accumSecondsRef.current = 0
    }

    const onBeforeUnload = () => { persist() }
    window.addEventListener('beforeunload', onBeforeUnload)

    return () => {
      el?.removeEventListener('scroll', onScroll)
      clearInterval(tick)
      window.removeEventListener('beforeunload', onBeforeUnload)
      persist()
    }
  }, [editing, sopId, user?.id])

  const save = async () => {
    if (!sopId) return
    setSaving(true)
    const { error } = await supabase.from('sops' as any).update({ title, description, content } as any).eq('id', sopId)
    setSaving(false)
    if (error) toast({ title: 'Save failed', description: error.message, variant: 'destructive' })
    else { toast({ title: 'Saved' }); setEditing(false) }
  }

  if (loading) {
    return <div className="min-h-screen bg-[#0a0610] flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-[#ffb500]" /></div>
  }

  return (
    <div ref={scrollRef} className="h-[calc(100vh-3.5rem)] md:h-screen overflow-y-auto bg-[#0a0610] text-white">
      <Helmet><title>{title} | SOPs</title></Helmet>

      <div className="sticky top-0 z-20 backdrop-blur bg-[#0a0610]/85 border-b border-white/5">
        <div className="container mx-auto max-w-4xl px-4 py-3 flex items-center justify-between gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/sops')} className="text-white/70 hover:text-white hover:bg-white/10 -ml-2">
            <ArrowLeft className="h-4 w-4 mr-1.5" /> SOPs
          </Button>
          {isAdminOrOwner && (
            editing ? (
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" onClick={() => setEditing(false)} className="text-white/70 hover:text-white hover:bg-white/10">
                  <X className="h-4 w-4 mr-1" /> Cancel
                </Button>
                <Button size="sm" disabled={saving} onClick={save} className="bg-[#ffb500] hover:bg-[#ffc733] text-[#290a52] font-semibold">
                  {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />} Save
                </Button>
              </div>
            ) : (
              <Button size="sm" variant="ghost" onClick={() => setEditing(true)} className="text-white/70 hover:text-white hover:bg-white/10">
                <Pencil className="h-4 w-4 mr-1.5" /> Edit
              </Button>
            )
          )}
        </div>
      </div>

      <div className="container mx-auto max-w-4xl px-4 py-8 pb-24">
        {editing ? (
          <div className="space-y-4">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="SOP title" className="text-2xl font-bold bg-transparent border-white/10 text-white" />
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Short description (optional)" className="bg-transparent border-white/10 text-white" />
            <div className="bg-white text-foreground rounded-lg">
              <SopEditor content={content} onChange={setContent} />
            </div>
          </div>
        ) : (
          <>
            <h1 className="text-3xl md:text-4xl font-bold mb-3 leading-tight">{title}</h1>
            {description && <p className="text-white/60 mb-6">{description}</p>}
            <div className="bg-white text-foreground rounded-lg p-2 md:p-4">
              <SopEditor content={content} onChange={() => {}} editable={false} />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
