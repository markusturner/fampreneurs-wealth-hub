import { Capacitor } from '@capacitor/core'
import { PushNotifications } from '@capacitor/push-notifications'
import { supabase } from '@/integrations/supabase/client'
import { toast } from '@/hooks/use-toast'

let pushInitialized = false

export async function initPushNotifications(userId: string) {
  if (!Capacitor.isNativePlatform() || pushInitialized) return
  
  try {
    const permResult = await PushNotifications.requestPermissions()
    if (permResult.receive !== 'granted') {
      console.warn('Push notification permission not granted')
      return
    }

    await PushNotifications.register()

    PushNotifications.addListener('registration', async (token) => {
      console.log('Push token received:', token.value)
      const platform = Capacitor.getPlatform()

      const { error } = await supabase
        .from('push_tokens' as any)
        .upsert(
          { user_id: userId, token: token.value, platform, updated_at: new Date().toISOString() },
          { onConflict: 'user_id,token' }
        )

      if (error) {
        console.error('Failed to save push token:', error)
      } else {
        console.log('Push token saved successfully')
      }
    })

    PushNotifications.addListener('registrationError', (err) => {
      console.error('Push registration error:', err)
    })

    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('Push notification received in foreground:', notification)
      toast({
        title: notification.title || 'Notification',
        description: notification.body || '',
      })
    })

    PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
      const data = action.notification.data
      console.log('Push notification tapped:', data)

      // Use data-driven link for deep linking, fallback to type-based routing
      if (data?.link) {
        window.location.href = data.link
        return
      }

      const type = data?.notification_type
      const fallbackRoutes: Record<string, string> = {
        'message': '/messenger',
        'family_message': '/community',
        'group_message': '/community',
        'community_post': '/workspace-community',
        'meeting_scheduled': '/workspace-calendar',
        'course_created': '/classroom',
        'new_member': '/workspace-members',
        'trust_created': '/workspace-community?program=tfv',
        'video_call_started': '/community',
        'tutorial_reminder': '/tutorial-videos',
      }

      window.location.href = fallbackRoutes[type] || '/dashboard'
    })

    pushInitialized = true
    console.log('Push notifications initialized successfully')
  } catch (error) {
    console.error('Error initializing push notifications:', error)
  }
}

export async function removePushToken(userId: string) {
  if (!Capacitor.isNativePlatform()) return
  
  try {
    await supabase
      .from('push_tokens' as any)
      .delete()
      .eq('user_id', userId)
    
    pushInitialized = false
  } catch (error) {
    console.error('Error removing push token:', error)
  }
}
