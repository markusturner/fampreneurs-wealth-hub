import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { setAppBadge } from '@/lib/app-badge'

export interface Notification {
  id: string
  user_id: string
  sender_id: string
  notification_type: string
  title: string
  message: string
  reference_id: string | null
  is_read: boolean
  created_at: string
  updated_at: string
  link: string | null
}

// Cross-tab sync channel name
const BROADCAST_CHANNEL_NAME = 'notification-sync'

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()
  const navigate = useNavigate()
  const browserPermissionRequested = useRef(false)
  const broadcastChannel = useRef<BroadcastChannel | null>(null)

  // Request browser notification permission once
  useEffect(() => {
    if (browserPermissionRequested.current) return
    if (typeof window === 'undefined' || !('Notification' in window)) return
    if (Notification.permission === 'default') {
      browserPermissionRequested.current = true
      Notification.requestPermission().then(perm => {
        console.log('[NOTIF] Browser notification permission:', perm)
      })
    }
  }, [])

  // Cross-tab sync via BroadcastChannel
  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return

    const channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME)
    broadcastChannel.current = channel

    channel.onmessage = (event) => {
      const { type, payload } = event.data || {}
      if (type === 'mark_read' && payload?.notificationId) {
        setNotifications(prev =>
          prev.map(n => n.id === payload.notificationId ? { ...n, is_read: true } : n)
        )
        setUnreadCount(prev => Math.max(0, prev - 1))
      } else if (type === 'mark_all_read') {
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
        setUnreadCount(0)
      } else if (type === 'new_notification' && payload?.notification) {
        setNotifications(prev => {
          if (prev.some(n => n.id === payload.notification.id)) return prev
          return [payload.notification, ...prev]
        })
        setUnreadCount(prev => prev + 1)
      } else if (type === 'deleted' && payload?.notificationId) {
        setNotifications(prev => {
          const target = prev.find(n => n.id === payload.notificationId)
          if (target && !target.is_read) {
            setUnreadCount(c => Math.max(0, c - 1))
          }
          return prev.filter(n => n.id !== payload.notificationId)
        })
      }
    }

    return () => {
      channel.close()
      broadcastChannel.current = null
    }
  }, [])

  const broadcastEvent = useCallback((type: string, payload: any) => {
    try {
      broadcastChannel.current?.postMessage({ type, payload })
    } catch {
      // BroadcastChannel may be closed
    }
  }, [])

  const fetchNotifications = useCallback(async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('[NOTIF] Error fetching notifications:', error)
        throw error
      }

      setNotifications(data || [])
      setUnreadCount(data?.filter(n => !n.is_read).length || 0)
    } catch (error) {
      console.error('[NOTIF] Error fetching notifications:', error)
    } finally {
      setLoading(false)
    }
  }, [user])

  const markAsRead = async (notificationId: string) => {
    if (!user) return

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId)
        .eq('user_id', user.id)

      if (error) throw error

      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
      broadcastEvent('mark_read', { notificationId })
    } catch (error) {
      console.error('[NOTIF] Error marking notification as read:', error)
    }
  }

  const markAllAsRead = async () => {
    if (!user) return

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false)

      if (error) throw error

      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
      setUnreadCount(0)
      broadcastEvent('mark_all_read', {})
    } catch (error) {
      console.error('[NOTIF] Error marking all notifications as read:', error)
    }
  }

  const deleteNotification = async (notificationId: string) => {
    if (!user) return

    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId)
        .eq('user_id', user.id)

      if (error) throw error

      const wasUnread = notifications.find(n => n.id === notificationId && !n.is_read)
      setNotifications(prev => prev.filter(n => n.id !== notificationId))
      if (wasUnread) {
        setUnreadCount(prev => Math.max(0, prev - 1))
      }
      broadcastEvent('deleted', { notificationId })
    } catch (error) {
      console.error('[NOTIF] Error deleting notification:', error)
    }
  }

  useEffect(() => {
    if (!user) return

    fetchNotifications()

    const channel = supabase
      .channel(`notifications-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          const newNotif = payload.new as Notification
          console.log('[NOTIF] Real-time INSERT received:', newNotif.id, newNotif.notification_type)

          // Add to state immediately (no re-fetch needed for INSERT)
          setNotifications(prev => {
            if (prev.some(n => n.id === newNotif.id)) return prev
            return [newNotif, ...prev]
          })
          setUnreadCount(prev => prev + 1)

          // Sync to other tabs
          broadcastEvent('new_notification', { notification: newNotif })

          // Fire browser notification when tab is NOT visible
          if (
            document.visibilityState !== 'visible' &&
            'Notification' in window &&
            Notification.permission === 'granted'
          ) {
            console.log('[NOTIF] Firing browser notification for:', newNotif.title)
            try {
              const browserNotif = new window.Notification(newNotif.title || 'New Notification', {
                body: newNotif.message || '',
                icon: '/favicon.ico',
                tag: newNotif.id,
              })

              browserNotif.onclick = () => {
                window.focus()
                browserNotif.close()
                if (newNotif.link) {
                  navigate(newNotif.link)
                }
              }
            } catch (err) {
              console.error('[NOTIF] Browser notification error:', err)
            }
          } else {
            console.log('[NOTIF] Browser notification skipped: tab visible or permission not granted')
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          const updated = payload.new as Notification
          console.log('[NOTIF] Real-time UPDATE received:', updated.id)
          setNotifications(prev =>
            prev.map(n => n.id === updated.id ? updated : n)
          )
          // Recalculate unread count
          setNotifications(prev => {
            setUnreadCount(prev.filter(n => !n.is_read).length)
            return prev
          })
        }
      )
      .subscribe((status) => {
        console.log('[NOTIF] Realtime subscription status:', status)
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user, fetchNotifications, navigate, broadcastEvent])

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refetch: fetchNotifications
  }
}
