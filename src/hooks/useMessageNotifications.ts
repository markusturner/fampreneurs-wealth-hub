import { useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/contexts/AuthContext'

export function useMessageNotifications() {
  const { user } = useAuth()

  useEffect(() => {
    if (!user) return

    // Set up real-time subscriptions for message notifications
    const familyChannel = supabase
      .channel('family-message-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'family_messages',
          filter: `recipient_id=eq.${user.id}`
        },
        (payload) => {
          console.log('New family message received:', payload)
        }
      )
      .subscribe()

    const groupChannel = supabase
      .channel('group-message-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'group_messages'
        },
        (payload) => {
          console.log('New group message received:', payload)
        }
      )
      .subscribe()

    const directChannel = supabase
      .channel('direct-message-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `recipient_id=eq.${user.id}`
        },
        (payload) => {
          console.log('New direct message received:', payload)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(familyChannel)
      supabase.removeChannel(groupChannel)
      supabase.removeChannel(directChannel)
    }
  }, [user])
}