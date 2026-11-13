import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { supabase } from '@/integrations/supabase/client'
import { activityGroup, lastActiveLabel, type ActivityGroup } from '@/lib/member-activity'

interface MemberProfile {
  user_id: string
  display_name: string | null
  avatar_url: string | null
  membership_type: string | null
  is_admin: boolean
  is_moderator: boolean
}

const PROGRAM_GROUP_MAP: Record<string, string> = {
  fbu: 'Family Business University',
  tfv: 'The Trust Vault',
  tfba: 'The Private Estate Accelerator',
  tffm: 'The Legacy InnerCircle',
}

const GROUP_LABELS: Record<ActivityGroup, string> = {
  now: 'Active now',
  today: 'Active today',
  earlier: 'Earlier',
}

export function CommunityMembersList({ program, compact = false, onlineIds }: { program: string; compact?: boolean; onlineIds?: Set<string> }) {
  const [members, setMembers] = useState<MemberProfile[]>([])
  const [lastSeen, setLastSeen] = useState<Record<string, string>>({})
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const fetchMembers = async () => {
      if (!program) return

      const assignedProgramName = PROGRAM_GROUP_MAP[program]
      if (!assignedProgramName) {
        setMembers([])
        return
      }

      const { data: programProfiles } = await supabase
        .from('profiles')
        .select('user_id, display_name, avatar_url, membership_type, is_admin, is_moderator')
        .ilike('program_name', `%${assignedProgramName}%`)
        .not('program_name', 'ilike', '%(VIP Weekend)%')
        .not('display_name', 'is', null)
        .or('needs_profile_completion.is.null,needs_profile_completion.eq.false')
        .order('display_name')

      if (!programProfiles || programProfiles.length === 0) {
        setMembers([])
        return
      }

      const { data: onboarded } = await supabase
        .from('onboarding_responses')
        .select('user_id')
        .in('user_id', programProfiles.map(p => p.user_id))

      const onboardedIds = new Set((onboarded || []).map(o => o.user_id))
      setMembers(programProfiles.filter(p => onboardedIds.has(p.user_id)))
    }

    fetchMembers()
  }, [program])

  // Load last-active times, refresh every 2 minutes so "x ago" stays current
  useEffect(() => {
    if (members.length === 0) return
    let cancelled = false
    const load = async () => {
      const ids = members.map(m => m.user_id)
      const map: Record<string, string> = {}
      for (let i = 0; i < ids.length; i += 200) {
        const { data } = await (supabase.rpc as any)('get_member_last_seen', { p_user_ids: ids.slice(i, i + 200) })
        for (const row of (data || []) as { user_id: string; last_seen_at: string }[]) map[row.user_id] = row.last_seen_at
      }
      if (!cancelled) setLastSeen(map)
    }
    load()
    const timer = setInterval(() => { load(); setTick(t => t + 1) }, 120000)
    return () => { cancelled = true; clearInterval(timer) }
  }, [members])

  const grouped = useMemo(() => {
    const now = new Date()
    const groups: Record<ActivityGroup, (MemberProfile & { label: string; seen: number })[]> = { now: [], today: [], earlier: [] }
    for (const m of members) {
      const online = !!onlineIds?.has(m.user_id)
      const seen = lastSeen[m.user_id]
      groups[activityGroup(seen, online, now)].push({ ...m, label: lastActiveLabel(seen, online, now), seen: seen ? new Date(seen).getTime() : 0 })
    }
    groups.now.sort((a, b) => (a.display_name || '').localeCompare(b.display_name || ''))
    groups.today.sort((a, b) => b.seen - a.seen)
    groups.earlier.sort((a, b) => b.seen - a.seen)
    return groups
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [members, lastSeen, onlineIds, tick])

  const getInitials = (name: string | null) => {
    if (!name) return 'M'
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  if (members.length === 0) return null

  return (
    <Card className="border-border/50">
      <CardContent className="p-4">
        <div className="mb-3 flex items-baseline justify-between gap-2">
          <h4 className="font-semibold text-sm">Members ({members.length})</h4>
          <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className="h-2 w-2 rounded-full bg-success" aria-hidden />
            {grouped.now.length} online
          </span>
        </div>
        <ScrollArea className={compact ? 'h-56 pr-2' : 'h-80 pr-2'}>
          <div className="space-y-3">
            {(['now', 'today', 'earlier'] as ActivityGroup[]).map(key => grouped[key].length > 0 && (
              <div key={key}>
                <p className="mb-1 px-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {GROUP_LABELS[key]} - {grouped[key].length}
                </p>
                <div className="space-y-0.5">
                  {grouped[key].map(member => (
                    <div key={member.user_id} className="flex w-full items-center gap-2.5 rounded-md p-1.5 text-left">
                      <span className="relative shrink-0">
                        <Avatar className={`h-7 w-7 ${key === 'earlier' ? 'opacity-70' : ''}`}>
                          {member.avatar_url && <AvatarImage src={member.avatar_url} />}
                          <AvatarFallback className="text-[10px]">{getInitials(member.display_name)}</AvatarFallback>
                        </Avatar>
                        {key === 'now' && <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-card bg-success" aria-label="Online" />}
                      </span>
                      <span className="text-sm truncate flex-1">{member.display_name || 'Member'}</span>
                      <span className={`shrink-0 text-[11px] ${key === 'now' ? 'text-success font-medium' : 'text-muted-foreground'}`}>{member.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
