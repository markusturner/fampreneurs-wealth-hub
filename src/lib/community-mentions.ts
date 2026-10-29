import { supabase } from '@/integrations/supabase/client'

export interface MemberOption {
  user_id: string
  display_name: string
  avatar_url: string | null
}

export const everyoneOption: MemberOption = { user_id: 'everyone', display_name: 'everyone', avatar_url: null }

export function mentionOptions(members: MemberOption[], query: string): MemberOption[] {
  return [everyoneOption, ...members].filter(m => m.display_name.toLocaleLowerCase().includes(query.toLocaleLowerCase())).slice(0, 8)
}

export async function loadMentionMembers(program: string): Promise<MemberOption[]> {
  if (!program) return []
  const { data, error } = await supabase.rpc('get_community_mention_members', { p_program: program })
  if (error) throw error
  return data || []
}