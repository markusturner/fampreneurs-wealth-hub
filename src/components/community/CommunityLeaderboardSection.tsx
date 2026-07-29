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
  const cacheKey = `lb-cache-v1:${program}`
  const initial = (() => {
    try {
      const raw = localStorage.getItem(cacheKey)
      if (raw) return JSON.parse(raw) as { rows7: Row[]; rows30: Row[]; rowsAll: Row[] }
    } catch {}
    return null
  })()
  const [rows7, setRows7] = useState<Row[]>(initial?.rows7 || [])
  const [rows30, setRows30] = useState<Row[]>(initial?.rows30 || [])
  const [rowsAll, setRowsAll] = useState<Row[]>(initial?.rowsAll || [])
  const [loading, setLoading] = useState(!initial)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const { rows7: d7, rows30: d30, rowsAll: dAll } = await fetchAllScores(program)
      if (cancelled) return
      setRows7(d7); setRows30(d30); setRowsAll(dAll)
      setLoading(false)
      try { localStorage.setItem(cacheKey, JSON.stringify({ rows7: d7, rows30: d30, rowsAll: dAll })) } catch {}
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

async function fetchAllScores(program: string): Promise<{ rows7: Row[]; rows30: Row[]; rowsAll: Row[] }> {
  const since7 = subDays(new Date(), 7).getTime()
  const since30 = subDays(new Date(), 30).getTime()

  // Fetch posts, comments in this program in parallel
  const { data: posts } = await supabase
    .from('community_posts')
    .select('id, user_id')
    .eq('program', program)
  const postIds = (posts || []).map(p => p.id)
  const postAuthor: Record<string, string> = {}
  ;(posts || []).forEach(p => { if (p.user_id) postAuthor[p.id] = p.user_id })

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

  // Fetch ALL reactions once (no date filter), then compute the three windows in JS
  const promises: Promise<any>[] = []
  if (postIds.length) {
    promises.push(Promise.resolve(supabase.from('community_reactions').select('post_id, created_at').in('post_id', postIds).not('post_id', 'is', null)))
  }
  if (commentIds.length) {
    promises.push(Promise.resolve(supabase.from('community_reactions').select('comment_id, created_at').in('comment_id', commentIds).not('comment_id', 'is', null)))
    promises.push(Promise.resolve(supabase.from('community_comment_reactions').select('comment_id, created_at').in('comment_id', commentIds)))
  }

  const results = await Promise.all(promises)

  const s7 = new Map<string, number>()
  const s30 = new Map<string, number>()
  const sAll = new Map<string, number>()
  const bump = (m: Map<string, number>, uid: string) => m.set(uid, (m.get(uid) || 0) + 1)

  const addRow = (uid: string | undefined, createdAt: string) => {
    if (!uid) return
    bump(sAll, uid)
    const t = new Date(createdAt).getTime()
    if (t >= since30) bump(s30, uid)
    if (t >= since7) bump(s7, uid)
  }

  let idx = 0
  if (postIds.length) {
    ;(results[idx++]?.data || []).forEach((r: any) => addRow(postAuthor[r.post_id], r.created_at))
  }
  if (commentIds.length) {
    ;(results[idx++]?.data || []).forEach((r: any) => addRow(commentAuthor[r.comment_id], r.created_at))
    ;(results[idx++]?.data || []).forEach((r: any) => addRow(commentAuthor[r.comment_id], r.created_at))
  }

  const allIds = Array.from(new Set([...sAll.keys()]))
  if (allIds.length === 0) return { rows7: [], rows30: [], rowsAll: [] }

  const { data: profiles } = await supabase
    .from('profiles')
    .select('user_id, display_name, avatar_url')
    .in('user_id', allIds)
  const pmap = new Map<string, { display_name: string; avatar_url: string | null }>()
  ;(profiles || []).forEach((p: any) => pmap.set(p.user_id, { display_name: p.display_name || 'Member', avatar_url: p.avatar_url }))

  const build = (m: Map<string, number>): Row[] => Array.from(m.entries())
    .map(([user_id, points]) => ({ user_id, points, display_name: pmap.get(user_id)?.display_name || 'Member', avatar_url: pmap.get(user_id)?.avatar_url || null }))
    .sort((a, b) => b.points - a.points).slice(0, 20)

  return { rows7: build(s7), rows30: build(s30), rowsAll: build(sAll) }
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
