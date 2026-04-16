import { Capacitor } from '@capacitor/core'
import { PushNotifications } from '@capacitor/push-notifications'
import { supabase } from '@/integrations/supabase/client'
import { toast } from '@/hooks/use-toast'

let pushInitialized = false

export async function initPushNotifications(userId: string) {
  if (!Capacitor.isNativePlatform() || pushInitialized) {
    console.log(`[PUSH-CLIENT] Skip init: native=${Capacitor.isNativePlatform()} initialized=${pushInitialized}`)
    return
  }

  console.log(`[PUSH-CLIENT] Initializing push notifications for user=${userId}`)

  try {
    const permResult = await PushNotifications.requestPermissions()
    console.log(`[PUSH-CLIENT] Permission result: ${permResult.receive}`)

    if (permResult.receive !== 'granted') {
      console.warn('[PUSH-CLIENT] Push notification permission not granted')
      return
    }

    await PushNotifications.register()
    console.log('[PUSH-CLIENT] PushNotifications.register() called')

    PushNotifications.addListener('registration', async (token) => {
      console.log(`[PUSH-CLIENT] Token received: ${token.value.substring(0, 20)}...`)
      const platform = Capacitor.getPlatform()

      const { error } = await supabase
        .from('push_tokens' as any)
        .upsert(
          { user_id: userId, token: token.value, platform, updated_at: new Date().toISOString() },
          { onConflict: 'user_id,token' }
        )

      if (error) {
        console.error('[PUSH-CLIENT] Failed to save push token:', JSON.stringify(error))
      } else {
        console.log(`[PUSH-CLIENT] Token saved: platform=${platform} token=${token.value.substring(0, 20)}...`)
      }
    })

    PushNotifications.addListener('registrationError', (err) => {
      console.error('[PUSH-CLIENT] Registration error:', JSON.stringify(err))
    })

    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('[PUSH-CLIENT] Foreground push received:', JSON.stringify(notification))
      toast({
        title: notification.title || 'Notification',
        description: notification.body || '',
      })
    })

    PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
      const data = action.notification.data
      console.log('[PUSH-CLIENT] Push tapped, data:', JSON.stringify(data))

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
    console.log('[PUSH-CLIENT] Push notifications initialized successfully')
  } catch (error) {
    console.error('[PUSH-CLIENT] Error initializing push notifications:', error)
  }
}

export async function removePushToken(userId: string) {
  if (!Capacitor.isNativePlatform()) return

  try {
    console.log(`[PUSH-CLIENT] Removing push tokens for user=${userId}`)
    await supabase
      .from('push_tokens' as any)
      .delete()
      .eq('user_id', userId)

    pushInitialized = false
    console.log('[PUSH-CLIENT] Push tokens removed')
  } catch (error) {
    console.error('[PUSH-CLIENT] Error removing push token:', error)
  }
}
