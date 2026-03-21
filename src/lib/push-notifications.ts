import { Capacitor } from '@capacitor/core'
import { PushNotifications } from '@capacitor/push-notifications'
import { supabase } from '@/integrations/supabase/client'
import { toast } from '@/hooks/use-toast'

let pushInitialized = false

export async function initPushNotifications(userId: string) {
  if (!Capacitor.isNativePlatform() || pushInitialized) return
  
  try {
    // Request permission
    const permResult = await PushNotifications.requestPermissions()
    if (permResult.receive !== 'granted') {
      console.warn('Push notification permission not granted')
      return
    }

    // Register with Apple/Google
    await PushNotifications.register()

    // Listen for registration success — save token
    PushNotifications.addListener('registration', async (token) => {
      console.log('Push token received:', token.value)
      const platform = Capacitor.getPlatform() // 'ios' or 'android'

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

    // Registration error
    PushNotifications.addListener('registrationError', (err) => {
      console.error('Push registration error:', err)
    })

    // Notification received while app is in foreground
    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('Push notification received in foreground:', notification)
      toast({
        title: notification.title || 'Notification',
        description: notification.body || '',
      })
    })

    // User tapped on a notification
    PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
      const data = action.notification.data
      console.log('Push notification tapped:', data)

      // Navigate based on notification type
      const type = data?.notification_type
      if (type === 'message') {
        window.location.href = '/messenger'
      } else if (type === 'family_message' || type === 'group_message' || type === 'community_post') {
        window.location.href = '/workspace-community'
      } else if (type === 'meeting_scheduled') {
        window.location.href = '/workspace-calendar'
      } else if (type === 'course_created') {
        window.location.href = '/classroom'
      } else if (type === 'new_member') {
        window.location.href = '/workspace-members'
      } else if (type === 'trust_created') {
        window.location.href = '/workspace-community?program=tfv'
      } else {
        window.location.href = '/dashboard'
      }
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
