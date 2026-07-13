import { Capacitor } from '@capacitor/core'

// Natively bundles the OneSignal Cordova plugin and exposes it as
// `window.plugins.OneSignal` (and often also as `window.OneSignal`).
// We call it dynamically so the web build never breaks.
type AnyRec = Record<string, any>
declare global {
  interface Window {
    plugins?: AnyRec
    OneSignal?: AnyRec
    cordova?: AnyRec
  }
}

let pushInitialized = false
let currentExternalId: string | null = null

function getOneSignal(): AnyRec | null {
  if (typeof window === 'undefined') return null
  return (window.plugins && window.plugins.OneSignal) || window.OneSignal || null
}

/**
 * Wire the OneSignal-native SDK (injected by Natively) to the current
 * Supabase user. OneSignal handles APNs/FCM registration & the permission
 * prompt itself — we just need to attach the External ID so our backend can
 * target notifications by supabase user_id.
 */
export async function initPushNotifications(userId: string) {
  if (!Capacitor.isNativePlatform()) {
    console.log(`[PUSH-CLIENT] Skip init: native=false`)
    return
  }

  // Wait briefly for the Cordova/OneSignal plugin to attach on cold start.
  const OneSignal = await waitForOneSignal(5000)
  if (!OneSignal) {
    console.warn('[PUSH-CLIENT] OneSignal plugin not found on window. Is the Natively build using OneSignal?')
    return
  }

  try {
    // v5 API (login) vs legacy setExternalUserId — try both.
    if (typeof OneSignal.login === 'function') {
      await OneSignal.login(userId)
      console.log(`[PUSH-CLIENT] OneSignal.login(${userId}) called`)
    } else if (OneSignal.User && typeof OneSignal.User.addAlias === 'function') {
      OneSignal.User.addAlias('external_id', userId)
      console.log(`[PUSH-CLIENT] OneSignal.User.addAlias('external_id', ${userId}) called`)
    } else if (typeof OneSignal.setExternalUserId === 'function') {
      OneSignal.setExternalUserId(userId)
      console.log(`[PUSH-CLIENT] OneSignal.setExternalUserId(${userId}) called`)
    } else {
      console.warn('[PUSH-CLIENT] No known OneSignal login API present on plugin')
    }

    // Ask for permission if not already granted (v5 Notifications namespace).
    try {
      if (OneSignal.Notifications) {
        if (typeof OneSignal.Notifications.requestPermission === 'function') {
          const granted = await OneSignal.Notifications.requestPermission(true)
          console.log(`[PUSH-CLIENT] Notifications.requestPermission -> ${granted}`)
        }
      } else if (typeof OneSignal.promptForPushNotificationsWithUserResponse === 'function') {
        OneSignal.promptForPushNotificationsWithUserResponse((accepted: boolean) => {
          console.log(`[PUSH-CLIENT] promptForPushNotifications accepted=${accepted}`)
        })
      }
    } catch (e) {
      console.warn('[PUSH-CLIENT] Permission request failed:', e)
    }

    currentExternalId = userId
    pushInitialized = true
    console.log('[PUSH-CLIENT] OneSignal external id linked successfully')
  } catch (error) {
    console.error('[PUSH-CLIENT] Error initializing OneSignal:', error)
  }
}

export async function removePushToken(_userId: string) {
  if (!Capacitor.isNativePlatform()) return
  const OneSignal = getOneSignal()
  if (!OneSignal) return
  try {
    if (typeof OneSignal.logout === 'function') {
      await OneSignal.logout()
    } else if (typeof OneSignal.removeExternalUserId === 'function') {
      OneSignal.removeExternalUserId()
    }
    currentExternalId = null
    pushInitialized = false
    console.log('[PUSH-CLIENT] OneSignal user logged out')
  } catch (e) {
    console.error('[PUSH-CLIENT] Error logging out of OneSignal:', e)
  }
}

async function waitForOneSignal(timeoutMs: number): Promise<AnyRec | null> {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    const os = getOneSignal()
    if (os) return os
    await new Promise((r) => setTimeout(r, 200))
  }
  return getOneSignal()
}
