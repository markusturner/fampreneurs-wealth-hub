import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { useIsAdminOrOwner } from '@/hooks/useIsAdminOrOwner'
import { Button } from '@/components/ui/button'
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

  const handleAdd = async () => {
    if (!user?.id) return
    const title = window.prompt('New SOP title')
    if (!title?.trim()) return
    const { data, error } = await supabase
      .from('sops' as any)
      .insert({ title: title.trim(), content: '', created_by: user.id } as any)
      .select('id')
      .single()
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return }
    navigate(`/sops/${(data as any).id}`)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this SOP?')) return
    const { error } = await supabase.from('sops' as any).delete().eq('id', id)
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' })
    else { toast({ title: 'Deleted' }); fetchSops() }
  }

  return (
    <div className="min-h-screen bg-[#0a0610] text-white">
      <Helmet>
        <title>SOPs | TruHeirs Classroom</title>
        <meta name="description" content="Standard Operating Procedures library for TruHeirs members." />
      </Helmet>

      {/* Header band with brand gradient */}
      <div className="relative bg-gradient-to-b from-[#290a52] via-[#1a0633] to-[#0a0610] border-b border-white/5">
        <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_top,rgba(255,181,0,0.15),transparent_60%)]" />
        <div className="relative container mx-auto max-w-6xl px-4 sm:px-6 py-10">
          <Button variant="ghost" size="sm" onClick={() => navigate('/classroom')} className="text-white/70 hover:text-white hover:bg-white/10 mb-6 -ml-2">
            <ArrowLeft className="h-4 w-4 mr-1.5" /> Back to Classroom
          </Button>
          <div className="flex flex-col items-center text-center gap-3">
            <div className="h-14 w-14 rounded-2xl bg-[#ffb500] flex items-center justify-center shadow-[0_8px_30px_-8px_rgba(255,181,0,0.5)]">
              <BookOpen className="h-7 w-7 text-[#290a52]" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">SOPs Library</h1>
            <p className="text-white/60 text-sm md:text-base max-w-xl">
              Step-by-step procedures, playbooks, and reference docs for the whole team.
            </p>
            {isAdminOrOwner && (
              <Button onClick={handleAdd} className="mt-3 bg-[#ffb500] hover:bg-[#ffc733] text-[#290a52] font-semibold">
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
              <div key={i} className="h-36 rounded-xl bg-white/5 animate-pulse" />
            ))}
          </div>
        ) : sops.length === 0 ? (
          <div className="text-center py-16 text-white/50">
            <FileText className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">No SOPs yet{isAdminOrOwner ? ' — click "Add Document" to create one.' : '.'}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {sops.map((sop) => (
              <button
                key={sop.id}
                onClick={() => navigate(`/sops/${sop.id}`)}
                className="group relative text-left rounded-xl border border-white/10 bg-gradient-to-br from-white/[0.04] to-white/[0.01] hover:border-[#ffb500]/40 hover:from-[#ffb500]/[0.06] transition-all p-5 min-h-[150px] flex flex-col"
              >
                {isAdminOrOwner && (
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition flex gap-1">
                    <span
                      role="button"
                      onClick={(e) => { e.stopPropagation(); navigate(`/sops/${sop.id}?edit=1`) }}
                      className="h-7 w-7 rounded-md bg-black/40 hover:bg-black/60 flex items-center justify-center"
                    >
                      <Pencil className="h-3.5 w-3.5 text-white/70" />
                    </span>
                    <span
                      role="button"
                      onClick={(e) => { e.stopPropagation(); handleDelete(sop.id) }}
                      className="h-7 w-7 rounded-md bg-black/40 hover:bg-red-500/40 flex items-center justify-center"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-white/70" />
                    </span>
                  </div>
                )}
                <p className="text-[10px] uppercase tracking-wider text-[#ffb500]/80 mb-2">SOP</p>
                <div className="h-9 w-9 rounded-lg bg-[#ffb500]/15 border border-[#ffb500]/30 flex items-center justify-center mb-3">
                  <FileText className="h-4 w-4 text-[#ffb500]" />
                </div>
                <h3 className="font-semibold text-white text-sm md:text-base leading-snug line-clamp-2">{sop.title}</h3>
                {sop.description && (
                  <p className="text-xs text-white/50 mt-1 line-clamp-2">{sop.description}</p>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
