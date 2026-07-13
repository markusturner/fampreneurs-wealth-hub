import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { supabase } from '@/integrations/supabase/client'
import { MemberMessageDialog } from './MemberMessageDialog'
import { useUnreadDMCounts } from '@/hooks/useUnreadDMCounts'

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
  tfv: 'The Family Vault',
  tfba: 'The Family Business Accelerator',
  tffm: 'The Family Fortune Mastermind',
}

export function CommunityMembersList({ program }: { program: string }) {
  const [members, setMembers] = useState<MemberProfile[]>([])
  const [selected, setSelected] = useState<MemberProfile | null>(null)
  const { bySender, markReadFromSender } = useUnreadDMCounts()

  const openMember = (m: MemberProfile) => {
    setSelected(m)
    // Auto-mark all their unread DMs as read (desktop-only feature per spec,
    // but harmless anywhere the popup is opened).
    if (bySender[m.user_id]) {
      markReadFromSender(m.user_id)
    }
  }

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

  const getInitials = (name: string | null) => {
    if (!name) return 'M'
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  if (members.length === 0) return null

  return (
    <>
      <Card className="border-border/50">
        <CardContent className="p-4">
          <h4 className="font-semibold text-sm mb-3">Members ({members.length})</h4>
          <ScrollArea className="h-80 pr-2">
            <div className="space-y-1">
              {members.map(member => (
                <button
                  key={member.user_id}
                  onClick={() => setSelected(member)}
                  className="w-full flex items-center gap-2.5 rounded-md p-1.5 hover:bg-muted/60 transition-colors text-left"
                >
                  <Avatar className="h-7 w-7">
                    {member.avatar_url && <AvatarImage src={member.avatar_url} />}
                    <AvatarFallback className="text-[10px]">{getInitials(member.display_name)}</AvatarFallback>
                  </Avatar>
                  <span className="text-sm truncate">{member.display_name || 'Member'}</span>
                </button>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      <MemberMessageDialog
        open={!!selected}
        onOpenChange={(o) => { if (!o) setSelected(null) }}
        recipientId={selected?.user_id ?? null}
        recipientName={selected?.display_name ?? null}
        recipientAvatar={selected?.avatar_url ?? null}
      />
    </>
  )
}

