import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/contexts/AuthContext'

/**
 * Tracks unread direct_messages for the current user.
 * Returns:
 *  - total: total unread count
 *  - bySender: map of sender_id -> unread count
 *  - markReadFromSender(senderId): mark all messages from that sender as read
 *  - refresh(): manual refetch
 */
export function useUnreadDMCounts() {
  const { user } = useAuth()
  const [bySender, setBySender] = useState<Record<string, number>>({})

  const fetchCounts = useCallback(async () => {
    if (!user?.id) {
      setBySender({})
      return
    }
    const { data, error } = await supabase
      .from('direct_messages')
      .select('sender_id')
      .eq('receiver_id', user.id)
      .eq('is_read', false)
    if (error) {
      console.error('[useUnreadDMCounts] fetch error:', error)
      return
    }
    const map: Record<string, number> = {}
    for (const row of data || []) {
      map[row.sender_id] = (map[row.sender_id] || 0) + 1
    }
    setBySender(map)
  }, [user?.id])

  useEffect(() => {
    fetchCounts()
  }, [fetchCounts])

  useEffect(() => {
    if (!user?.id) return
    const channel = supabase
      .channel(`dm-unread-${user.id}-${Math.random().toString(36).slice(2, 8)}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'direct_messages',
          filter: `receiver_id=eq.${user.id}`,
        },
        () => {
          fetchCounts()
        }
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [user?.id, fetchCounts])

  const markReadFromSender = useCallback(
    async (senderId: string) => {
      if (!user?.id || !senderId) return
      // Optimistic
      setBySender((prev) => {
        if (!prev[senderId]) return prev
        const next = { ...prev }
        delete next[senderId]
        return next
      })
      const { error } = await supabase
        .from('direct_messages')
        .update({ is_read: true })
        .eq('receiver_id', user.id)
        .eq('sender_id', senderId)
        .eq('is_read', false)
      if (error) {
        console.error('[useUnreadDMCounts] mark read error:', error)
        fetchCounts()
      }
    },
    [user?.id, fetchCounts]
  )

  const total = Object.values(bySender).reduce((a, b) => a + b, 0)

  return { total, bySender, markReadFromSender, refresh: fetchCounts }
}
