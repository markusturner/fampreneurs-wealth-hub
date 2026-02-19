import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { supabase } from '@/integrations/supabase/client'

interface MemberProfile {
  user_id: string
  display_name: string | null
  avatar_url: string | null
}

const PROGRAM_GROUP_MAP: Record<string, string> = {
  fbu: 'Family Business University',
  tfv: 'The Family Vault',
  tfba: 'The Family Business Accelerator',
  tffm: 'The Family Fortune Mastermind',
}

export function CommunityMembersList({ program }: { program: string }) {
  const [members, setMembers] = useState<MemberProfile[]>([])

  useEffect(() => {
    const fetchMembers = async () => {
      const groupName = PROGRAM_GROUP_MAP[program]
      if (!groupName) return

      const { data: group } = await supabase
        .from('community_groups')
        .select('id')
        .eq('name', groupName)
        .maybeSingle()

      if (group) {
        const { data: memberships } = await supabase
          .from('group_memberships')
          .select('user_id')
          .eq('group_id', group.id)
          .limit(50)

        if (memberships && memberships.length > 0) {
          const userIds = memberships.map(m => m.user_id)
          const { data: profiles } = await supabase
            .from('profiles')
            .select('user_id, display_name, avatar_url')
            .in('user_id', userIds)

          setMembers(profiles || [])
          return
        }
      }

      // Fallback: show all profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name, avatar_url')
        .not('display_name', 'is', null)
        .limit(50)
        .order('display_name')

      setMembers(profiles || [])
    }
    fetchMembers()
  }, [program])

  const getInitials = (name: string | null) => {
    if (!name) return 'M'
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  if (members.length === 0) return null

  return (
    <Card className="border-border/50">
      <CardContent className="p-4">
        <h4 className="font-semibold text-sm mb-3">Members ({members.length})</h4>
        <ScrollArea className="max-h-64">
          <div className="space-y-2">
            {members.map(member => (
              <div key={member.user_id} className="flex items-center gap-2.5">
                <Avatar className="h-7 w-7">
                  {member.avatar_url && <AvatarImage src={member.avatar_url} />}
                  <AvatarFallback className="text-[10px]">{getInitials(member.display_name)}</AvatarFallback>
                </Avatar>
                <span className="text-sm truncate">{member.display_name || 'Member'}</span>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
