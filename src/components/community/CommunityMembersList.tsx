import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { supabase } from '@/integrations/supabase/client'

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

export function CommunityMembersList({ program, compact = false }: { program: string; compact?: boolean }) {
  const [members, setMembers] = useState<MemberProfile[]>([])
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
          <ScrollArea className={compact ? 'h-40 pr-2' : 'h-80 pr-2'}>
            <div className="space-y-1">
              {members.map(member => (
                <div key={member.user_id} className="flex w-full items-center gap-2.5 rounded-md p-1.5 text-left">
                  <Avatar className="h-7 w-7">
                    {member.avatar_url && <AvatarImage src={member.avatar_url} />}
                    <AvatarFallback className="text-[10px]">{getInitials(member.display_name)}</AvatarFallback>
                  </Avatar>
                  <span className="text-sm truncate flex-1">{member.display_name || 'Member'}</span>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

    </>
  )
}

