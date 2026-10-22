import { useEffect, useState } from 'react'
import { Eye } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'

type Viewer = { user_id: string; display_name: string | null; avatar_url: string | null; viewed_at: string }

const initials = (n: string | null) => (n || 'M').split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2)

// Records the current user's view and, for admins/owner, shows who viewed the post.
export function PostViewers({ postId, userId, canSeeViewers }: { postId: string; userId?: string; canSeeViewers: boolean }) {
  const [viewers, setViewers] = useState<Viewer[]>([])
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!userId) return
    void supabase.from('community_post_views' as any).upsert({ post_id: postId, user_id: userId }, { onConflict: 'post_id,user_id', ignoreDuplicates: true })
  }, [postId, userId])

  useEffect(() => {
    if (!canSeeViewers) return
    let cancelled = false
    ;(async () => {
      const { data } = await supabase.from('community_post_views' as any).select('user_id, viewed_at').eq('post_id', postId).order('viewed_at', { ascending: false })
      const rows = (data || []) as unknown as { user_id: string; viewed_at: string }[]
      if (!rows.length) { if (!cancelled) setViewers([]); return }
      const { data: profiles } = await supabase.rpc('get_community_profiles', { p_user_ids: rows.map(r => r.user_id) } as any)
      const map = new Map(((profiles || []) as any[]).map(p => [p.user_id, p]))
      if (!cancelled) setViewers(rows.map(r => ({ ...r, display_name: map.get(r.user_id)?.display_name ?? null, avatar_url: map.get(r.user_id)?.avatar_url ?? null })))
    })()
    return () => { cancelled = true }
  }, [postId, canSeeViewers])

  if (!canSeeViewers || viewers.length === 0) return null

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="ml-auto flex items-center gap-2 text-xs text-foreground/60 hover:text-foreground" aria-label={`Seen by ${viewers.length}`}>
        <div className="flex -space-x-2">
          {viewers.slice(0, 5).map(v => (
            <Avatar key={v.user_id} className="h-6 w-6 border-2 border-background">
              {v.avatar_url && <AvatarImage src={v.avatar_url} />}
              <AvatarFallback className="text-[9px]">{initials(v.display_name)}</AvatarFallback>
            </Avatar>
          ))}
        </div>
        <Eye className="h-3.5 w-3.5" />{viewers.length}
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Seen by {viewers.length}</DialogTitle></DialogHeader>
          <ScrollArea className="max-h-80">
            <div className="space-y-1">
              {viewers.map(v => (
                <div key={v.user_id} className="flex items-center gap-2.5 rounded-md p-1.5">
                  <Avatar className="h-8 w-8">
                    {v.avatar_url && <AvatarImage src={v.avatar_url} />}
                    <AvatarFallback className="text-[10px]">{initials(v.display_name)}</AvatarFallback>
                  </Avatar>
                  <span className="flex-1 truncate text-sm">{v.display_name || 'Member'}</span>
                  <span className="text-[11px] text-muted-foreground">{new Date(v.viewed_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                </div>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  )
}
