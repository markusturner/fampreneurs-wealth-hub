import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Trophy, Crown, Medal, Award } from 'lucide-react'
import { subDays } from 'date-fns'

interface Props { program: string }

// Skool-style level thresholds (cumulative points to reach the level)
const LEVEL_THRESHOLDS = [0, 5, 20, 65, 155, 515, 2015, 8015, 33015]

function levelFor(points: number) {
  let level = 1
  for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) {
    if (points >= LEVEL_THRESHOLDS[i]) level = i + 1
  }
  const next = LEVEL_THRESHOLDS[level] ?? LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1]
  const prev = LEVEL_THRESHOLDS[level - 1] ?? 0
  const pct = next === prev ? 100 : Math.min(100, Math.round(((points - prev) / (next - prev)) * 100))
  return { level, pct, next, prev }
}

type Row = { user_id: string; display_name: string; avatar_url: string | null; points: number }

type Range = '7' | '30' | 'all'

export function CommunityLeaderboardSection({ program }: Props) {
  const [rows7, setRows7] = useState<Row[]>([])
  const [rows30, setRows30] = useState<Row[]>([])
  const [rowsAll, setRowsAll] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      const [d7, d30, dAll] = await Promise.all([
        fetchScores(program, subDays(new Date(), 7).toISOString()),
        fetchScores(program, subDays(new Date(), 30).toISOString()),
        fetchScores(program, null),
      ])
      if (cancelled) return
      setRows7(d7); setRows30(d30); setRowsAll(dAll)
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [program])

  if (loading) return <p className="text-sm text-muted-foreground py-6 text-center">Loading leaderboard…</p>

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Leaderboard</h3>
        <p className="text-xs text-muted-foreground">Points come from likes received on posts and comments in this community.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <LeaderboardColumn title="Last 7 days" rows={rows7} />
        <LeaderboardColumn title="Last 30 days" rows={rows30} />
        <LeaderboardColumn title="All time" rows={rowsAll} />
      </div>

      <LevelsCard rows={rowsAll} />
    </div>
  )
}

async function fetchScores(program: string, sinceIso: string | null): Promise<Row[]> {
  // Get post ids + authors in this program
  const { data: posts } = await supabase
    .from('community_posts')
    .select('id, user_id')
    .eq('program', program)
  const postIds = (posts || []).map(p => p.id)
  const postAuthor: Record<string, string> = {}
  ;(posts || []).forEach(p => { if (p.user_id) postAuthor[p.id] = p.user_id })

  // Get comment ids + authors on those posts
  let commentAuthor: Record<string, string> = {}
  let commentIds: string[] = []
  if (postIds.length) {
    const { data: comments } = await supabase
      .from('community_comments')
      .select('id, user_id, post_id')
      .in('post_id', postIds)
    ;(comments || []).forEach(c => {
      commentIds.push(c.id)
      if (c.user_id) commentAuthor[c.id] = c.user_id
    })
  }

  const userScores = new Map<string, number>()
  const add = (uid: string) => userScores.set(uid, (userScores.get(uid) || 0) + 1)

  if (postIds.length) {
    let q = supabase.from('community_reactions').select('post_id, created_at').in('post_id', postIds).not('post_id', 'is', null)
    if (sinceIso) q = q.gte('created_at', sinceIso)
    const { data } = await q
    ;(data || []).forEach((r: any) => { const uid = postAuthor[r.post_id]; if (uid) add(uid) })
  }
  if (commentIds.length) {
    let q = supabase.from('community_reactions').select('comment_id, created_at').in('comment_id', commentIds).not('comment_id', 'is', null)
    if (sinceIso) q = q.gte('created_at', sinceIso)
    const { data } = await q
    ;(data || []).forEach((r: any) => { const uid = commentAuthor[r.comment_id]; if (uid) add(uid) })
    let q2 = supabase.from('community_comment_reactions').select('comment_id, created_at').in('comment_id', commentIds)
    if (sinceIso) q2 = q2.gte('created_at', sinceIso)
    const { data: d2 } = await q2
    ;(d2 || []).forEach((r: any) => { const uid = commentAuthor[r.comment_id]; if (uid) add(uid) })
  }

  const ids = Array.from(userScores.keys())
  if (ids.length === 0) return []
  const { data: profiles } = await supabase
    .from('profiles')
    .select('user_id, display_name, avatar_url')
    .in('user_id', ids)
  const rows: Row[] = (profiles || []).map(p => ({
    user_id: p.user_id,
    display_name: p.display_name || 'Member',
    avatar_url: p.avatar_url,
    points: userScores.get(p.user_id) || 0,
  }))
  return rows.sort((a, b) => b.points - a.points).slice(0, 20)
}

function LeaderboardColumn({ title, rows }: { title: string; rows: Row[] }) {
  return (
    <Card className="border-border/60">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Trophy className="h-4 w-4 text-[#ffb500]" />
          <h4 className="font-semibold text-sm">{title}</h4>
        </div>
        {rows.length === 0 ? (
          <p className="text-xs text-muted-foreground py-4 text-center">No activity yet.</p>
        ) : (
          <ol className="space-y-2">
            {rows.slice(0, 10).map((r, i) => {
              const rankIcon =
                i === 0 ? <Crown className="h-4 w-4 text-[#ffb500]" /> :
                i === 1 ? <Medal className="h-4 w-4 text-slate-400" /> :
                i === 2 ? <Award className="h-4 w-4 text-orange-500" /> :
                <span className="text-xs text-muted-foreground w-4 text-center">{i + 1}</span>
              return (
                <li key={r.user_id} className="flex items-center gap-2">
                  <div className="w-4 flex justify-center">{rankIcon}</div>
                  <Avatar className="h-7 w-7">
                    {r.avatar_url && <AvatarImage src={r.avatar_url} />}
                    <AvatarFallback className="text-[10px]">
                      {r.display_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm truncate flex-1">{r.display_name}</span>
                  <span className="text-xs font-semibold text-muted-foreground">+{r.points}</span>
                </li>
              )
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  )
}

function LevelsCard({ rows }: { rows: Row[] }) {
  const counts = useMemo(() => {
    const c: Record<number, number> = {}
    rows.forEach(r => { const { level } = levelFor(r.points); c[level] = (c[level] || 0) + 1 })
    return c
  }, [rows])

  return (
    <Card className="border-border/60">
      <CardContent className="p-4">
        <h4 className="font-semibold text-sm mb-3">Levels</h4>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
          {LEVEL_THRESHOLDS.map((thresh, idx) => {
            const lvl = idx + 1
            return (
              <div key={lvl} className="rounded-lg border border-border/60 p-3 text-center">
                <div className="text-xs text-muted-foreground">Level</div>
                <div className="text-lg font-bold text-[#290a52]">{lvl}</div>
                <div className="text-[10px] text-muted-foreground">{thresh}+ pts</div>
                <div className="text-[10px] mt-1">{counts[lvl] || 0} members</div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
