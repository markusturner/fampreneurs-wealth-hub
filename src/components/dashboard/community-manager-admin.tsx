import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { Loader2, MessageCircle, ThumbsUp, Eye, Send, RefreshCw } from 'lucide-react'
import { format } from 'date-fns'

interface PostLog {
  id: string
  post_id: string | null
  program: string
  template_key: string
  title: string | null
  posted_at: string
  likes?: number
  comments?: number
}

interface ReplyLog {
  id: string
  parent_post_id: string | null
  reply_post_id: string | null
  replied_to_user_id: string | null
  created_at: string
}

export function CommunityManagerAdmin() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [settings, setSettings] = useState<any>(null)
  const [posts, setPosts] = useState<PostLog[]>([])
  const [replies, setReplies] = useState<ReplyLog[]>([])
  const [triggering, setTriggering] = useState(false)

  const load = async () => {
    setLoading(true)
    const [s, p, r] = await Promise.all([
      supabase.from('community_manager_settings').select('*').limit(1).maybeSingle(),
      supabase.from('community_manager_post_log').select('*').order('posted_at', { ascending: false }).limit(30),
      supabase.from('community_manager_reply_log').select('*').order('created_at', { ascending: false }).limit(20),
    ])
    setSettings(s.data)

    // Enrich each post with like/comment counts
    const postLogs = (p.data || []) as PostLog[]
    const enriched = await Promise.all(postLogs.map(async (pl) => {
      if (!pl.post_id) return pl
      const [likeRes, commentRes] = await Promise.all([
        supabase.from('community_reactions').select('id', { count: 'exact', head: true }).eq('post_id', pl.post_id),
        supabase.from('community_posts').select('id', { count: 'exact', head: true }).eq('parent_id', pl.post_id),
      ])
      return { ...pl, likes: likeRes.count || 0, comments: commentRes.count || 0 }
    }))
    setPosts(enriched)
    setReplies((r.data || []) as ReplyLog[])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const toggle = async (field: 'enabled' | 'reply_enabled', value: boolean) => {
    if (!settings) return
    const { error } = await supabase
      .from('community_manager_settings')
      .update({ [field]: value, updated_at: new Date().toISOString() })
      .eq('id', settings.id)
    if (error) {
      toast({ title: 'Update failed', description: error.message, variant: 'destructive' })
      return
    }
    setSettings({ ...settings, [field]: value })
    toast({ title: 'Updated' })
  }

  const triggerNow = async () => {
    setTriggering(true)
    try {
      const { data, error } = await supabase.functions.invoke('community-manager-daily-post', { body: {} })
      if (error) throw error
      toast({ title: 'Triggered', description: `Posts created: ${(data?.results || []).filter((r: any) => r.post_id).length}` })
      await load()
    } catch (e: any) {
      toast({ title: 'Failed', description: e?.message, variant: 'destructive' })
    } finally {
      setTriggering(false)
    }
  }

  const triggerReminders = async () => {
    setTriggering(true)
    try {
      const { data, error } = await supabase.functions.invoke('pending-users-daily-reminder', { body: {} })
      if (error) throw error
      toast({ title: 'Reminders sent', description: `${data?.count ?? 0} emails sent` })
    } catch (e: any) {
      toast({ title: 'Failed', description: e?.message, variant: 'destructive' })
    } finally {
      setTriggering(false)
    }
  }

  if (loading) {
    return (
      <Card><CardContent className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin" />
      </CardContent></Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-[#290a52]" />
                Community Manager — Markus Turner
              </CardTitle>
              <CardDescription>
                Posts daily at 9:00 AM EST to every community. Replies to member comments automatically.
              </CardDescription>
            </div>
            <Button size="sm" variant="outline" onClick={load}>
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <Label className="font-medium">Daily posts enabled</Label>
              <p className="text-xs text-muted-foreground">Posts one fresh message in each community every morning.</p>
            </div>
            <Switch checked={!!settings?.enabled} onCheckedChange={(v) => toggle('enabled', v)} />
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <Label className="font-medium">Auto-reply enabled</Label>
              <p className="text-xs text-muted-foreground">Replies to every comment left on Markus's posts.</p>
            </div>
            <Switch checked={!!settings?.reply_enabled} onCheckedChange={(v) => toggle('reply_enabled', v)} />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={triggerNow} disabled={triggering} className="bg-[#290a52] hover:bg-[#290a52]/90 text-white">
              {triggering ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
              Post Now
            </Button>
            <Button variant="outline" onClick={triggerReminders} disabled={triggering}>
              Send Pending Reminders Now
            </Button>
          </div>
          {settings?.last_post_at && (
            <p className="text-xs text-muted-foreground">
              Last daily run: {format(new Date(settings.last_post_at), 'MMM d, yyyy h:mm a')}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Posts & Analytics</CardTitle>
          <CardDescription>Last 30 posts Markus has sent across communities</CardDescription>
        </CardHeader>
        <CardContent>
          {posts.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No posts yet. Click "Post Now" to send the first batch.</p>
          ) : (
            <div className="space-y-2">
              {posts.map((p) => (
                <div key={p.id} className="flex items-start justify-between gap-3 rounded-lg border p-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <Badge variant="outline" className="text-xs uppercase">{p.program}</Badge>
                      <span className="text-xs text-muted-foreground">{format(new Date(p.posted_at), 'MMM d, h:mm a')}</span>
                    </div>
                    <p className="text-sm font-medium truncate">{p.title || p.template_key}</p>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground shrink-0">
                    <span className="flex items-center gap-1"><ThumbsUp className="h-3 w-3" /> {p.likes ?? 0}</span>
                    <span className="flex items-center gap-1"><MessageCircle className="h-3 w-3" /> {p.comments ?? 0}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Auto-Replies</CardTitle>
          <CardDescription>Last 20 replies Markus has sent to members</CardDescription>
        </CardHeader>
        <CardContent>
          {replies.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No replies sent yet.</p>
          ) : (
            <div className="space-y-2">
              {replies.map((r) => (
                <div key={r.id} className="rounded-lg border p-3 text-sm">
                  <p className="text-xs text-muted-foreground">{format(new Date(r.created_at), 'MMM d, h:mm a')}</p>
                  <p className="text-xs">Replied on post <code className="text-[10px]">{r.parent_post_id?.slice(0, 8)}</code></p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
