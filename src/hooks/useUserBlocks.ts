import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/contexts/AuthContext'

/** The signed-in member's block list. Blocked members' content is hidden from them. */
export function useUserBlocks() {
  const { user } = useAuth()
  const [blockedIds, setBlockedIds] = useState<Set<string>>(new Set())

  const load = useCallback(async () => {
    if (!user) { setBlockedIds(new Set()); return }
    const { data } = await supabase.from('user_blocks').select('blocked_id').eq('blocker_id', user.id)
    setBlockedIds(new Set((data ?? []).map(r => r.blocked_id)))
  }, [user])

  useEffect(() => { load() }, [load])

  const block = useCallback(async (blockedId: string) => {
    if (!user || blockedId === user.id) return false
    const { error } = await supabase.from('user_blocks').upsert({ blocker_id: user.id, blocked_id: blockedId }, { onConflict: 'blocker_id,blocked_id' })
    if (!error) setBlockedIds(prev => new Set(prev).add(blockedId))
    return !error
  }, [user])

  const unblock = useCallback(async (blockedId: string) => {
    if (!user) return false
    const { error } = await supabase.from('user_blocks').delete().eq('blocker_id', user.id).eq('blocked_id', blockedId)
    if (!error) setBlockedIds(prev => { const next = new Set(prev); next.delete(blockedId); return next })
    return !error
  }, [user])

  return { blockedIds, block, unblock, reload: load }
}
