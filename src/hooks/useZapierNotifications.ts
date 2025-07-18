import { useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/integrations/supabase/client'

export function useZapierNotifications() {
  const { user } = useAuth()

  useEffect(() => {
    if (!user) return

    // Subscribe to personal messages
    const personalMessagesChannel = supabase
      .channel('personal_messages_zapier')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `recipient_id=eq.${user.id}`
        },
        async (payload) => {
          const message = payload.new
          
          // Get sender profile
          const { data: senderProfile } = await supabase
            .from('profiles')
            .select('display_name, first_name, last_name')
            .eq('user_id', message.sender_id)
            .single()

          // Trigger Zapier notification
          try {
            await supabase.functions.invoke('zapier-notifications', {
              body: {
                eventType: 'personal_message',
                data: {
                  message_id: message.id,
                  from: senderProfile?.display_name || `${senderProfile?.first_name} ${senderProfile?.last_name}` || 'Unknown User',
                  content: message.content,
                  created_at: message.created_at,
                  recipient_id: message.recipient_id
                }
              }
            })
          } catch (error) {
            console.error('Error sending Zapier notification for personal message:', error)
          }
        }
      )
      .subscribe()

    // Subscribe to group messages
    const groupMessagesChannel = supabase
      .channel('group_messages_zapier')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'group_messages'
        },
        async (payload) => {
          const message = payload.new
          
          // Skip if this is the user's own message
          if (message.user_id === user.id) return

          // Check if user is a member of this group
          const { data: membership } = await supabase
            .from('group_memberships')
            .select('id')
            .eq('group_id', message.group_id)
            .eq('user_id', user.id)
            .single()

          if (!membership) return

          // Get sender profile and group info
          const [senderResult, groupResult] = await Promise.all([
            supabase
              .from('profiles')
              .select('display_name, first_name, last_name')
              .eq('user_id', message.user_id)
              .single(),
            supabase
              .from('community_groups')
              .select('name')
              .eq('id', message.group_id)
              .single()
          ])

          // Trigger Zapier notification
          try {
            await supabase.functions.invoke('zapier-notifications', {
              body: {
                eventType: 'group_message',
                data: {
                  message_id: message.id,
                  from: senderResult.data?.display_name || `${senderResult.data?.first_name} ${senderResult.data?.last_name}` || 'Unknown User',
                  group_name: groupResult.data?.name || 'Unknown Group',
                  content: message.content,
                  created_at: message.created_at,
                  group_id: message.group_id
                }
              }
            })
          } catch (error) {
            console.error('Error sending Zapier notification for group message:', error)
          }
        }
      )
      .subscribe()

    // Subscribe to coaching session enrollments
    const coachingSessionsChannel = supabase
      .channel('coaching_sessions_zapier')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'session_enrollments',
          filter: `user_id=eq.${user.id}`
        },
        async (payload) => {
          const enrollment = payload.new
          
          // Get session details
          const { data: session } = await supabase
            .from('group_coaching_sessions')
            .select('title, session_date, session_time, coach_name')
            .eq('id', enrollment.session_id)
            .single()

          if (session) {
            // Trigger Zapier notification
            try {
              await supabase.functions.invoke('zapier-notifications', {
                body: {
                  eventType: 'coaching_call',
                  data: {
                    enrollment_id: enrollment.id,
                    session_title: session.title,
                    coach_name: session.coach_name,
                    session_date: session.session_date,
                    session_time: session.session_time,
                    enrolled_at: enrollment.enrolled_at
                  }
                }
              })
            } catch (error) {
              console.error('Error sending Zapier notification for coaching session:', error)
            }
          }
        }
      )
      .subscribe()

    // Cleanup function
    return () => {
      supabase.removeChannel(personalMessagesChannel)
      supabase.removeChannel(groupMessagesChannel)
      supabase.removeChannel(coachingSessionsChannel)
    }
  }, [user])
}