import { Capacitor } from '@capacitor/core'
import { supabase } from '@/integrations/supabase/client'

// Natively bundles the OneSignal Cordova plugin and exposes it as
// `window.plugins.OneSignal` (and often also as `window.OneSignal`).
// We call it dynamically so the web build never breaks.
type AnyRec = Record<string, any>
declare global {
  interface Window {
    plugins?: AnyRec
    OneSignal?: AnyRec
    cordova?: AnyRec
    natively?: AnyRec
    NativelyNotifications?: new () => AnyRec
  }
}

let pushInitialized = false
let currentExternalId: string | null = null
let initializingFor: string | null = null

const ONESIGNAL_APP_ID = 'd333dd1c-93b2-4d7f-abe1-7b768cfc1bc7'

function getNativeOneSignal(): AnyRec | null {
  if (typeof window === 'undefined') return null
  if (window.plugins?.OneSignal) return window.plugins.OneSignal
  return Capacitor.isNativePlatform() ? window.OneSignal || null : null
}

function getNativelyNotifications(): AnyRec | null {
  if (typeof window === 'undefined' || typeof window.NativelyNotifications !== 'function') return null
  try {
    return new window.NativelyNotifications()
  } catch (error) {
    console.warn('[PUSH-CLIENT] NativelyNotifications unavailable:', error)
    return null
  }
}

/**
 * Wire the OneSignal-native SDK (injected by Natively) to the current
 * Supabase user. OneSignal handles APNs/FCM registration & the permission
 * prompt itself — we just need to attach the External ID so our backend can
 * target notifications by supabase user_id.
 */
export async function initPushNotifications(userId: string) {
  if (!userId) return
  if (pushInitialized && currentExternalId === userId) return
  if (initializingFor === userId) return

  initializingFor = userId

  const bridge = await waitForPushBridge(7000)
  if (!bridge) {
    console.log('[PUSH-CLIENT] Skip init: no native/Natively push bridge found')
    initializingFor = null
    return
  }

  try {
    if (bridge.type === 'natively') {
      await initWithNatively(userId, bridge.client)
    } else {
      await initWithOneSignalPlugin(userId, bridge.client)
    }

    currentExternalId = userId
    pushInitialized = true
    console.log('[PUSH-CLIENT] Push device linked successfully')
  } catch (error) {
    console.error('[PUSH-CLIENT] Error initializing push notifications:', error)
  } finally {
    initializingFor = null
  }
}

async function initWithNatively(userId: string, notifications: AnyRec) {
  const permission = await nativelyCall(notifications, 'getPermissionStatus')
  console.log(`[PUSH-CLIENT] Natively permission before request: ${!!permission?.status}`)

  if (!permission?.status) {
    const requested = await nativelyCall(notifications, 'requestPermission', true)
    console.log(`[PUSH-CLIENT] Natively permission request: ${!!requested?.status}`)
  }

  const setExternal = await nativelyCall(notifications, 'setExternalId', { externalId: userId })
  if (setExternal?.error || setExternal?.message) {
    console.warn('[PUSH-CLIENT] Natively setExternalId response:', setExternal.error || setExternal.message)
  } else {
    console.log(`[PUSH-CLIENT] Natively external_id linked: ${setExternal?.externalId || userId}`)
  }

  const player = await nativelyCall(notifications, 'getOneSignalId')
  const playerId = player?.playerId
  if (playerId) await savePushSubscription(userId, playerId, 'natively')
}

async function initWithOneSignalPlugin(userId: string, OneSignal: AnyRec) {
  if (typeof OneSignal.initialize === 'function') {
    try {
      await OneSignal.initialize(ONESIGNAL_APP_ID)
    } catch {
      try { await OneSignal.initialize({ appId: ONESIGNAL_APP_ID }) } catch { /* already initialized */ }
    }
  }

  if (OneSignal.Notifications && typeof OneSignal.Notifications.requestPermission === 'function') {
    const granted = await OneSignal.Notifications.requestPermission(true)
    console.log(`[PUSH-CLIENT] OneSignal permission request -> ${granted}`)
  } else if (typeof OneSignal.promptForPushNotificationsWithUserResponse === 'function') {
    await new Promise<void>((resolve) => {
      OneSignal.promptForPushNotificationsWithUserResponse((accepted: boolean) => {
        console.log(`[PUSH-CLIENT] OneSignal prompt accepted=${accepted}`)
        resolve()
      })
    })
  }

  if (typeof OneSignal.login === 'function') {
    await OneSignal.login(userId)
    console.log(`[PUSH-CLIENT] OneSignal.login linked external_id`)
  } else if (OneSignal.User && typeof OneSignal.User.addAlias === 'function') {
    await OneSignal.User.addAlias('external_id', userId)
    console.log(`[PUSH-CLIENT] OneSignal.User.addAlias linked external_id`)
  } else if (typeof OneSignal.setExternalUserId === 'function') {
    await OneSignal.setExternalUserId(userId)
    console.log(`[PUSH-CLIENT] OneSignal.setExternalUserId linked external_id`)
  } else {
    console.warn('[PUSH-CLIENT] No known OneSignal external ID API present')
  }

  const subscriptionId = await getOneSignalSubscriptionId(OneSignal)
  if (subscriptionId) await savePushSubscription(userId, subscriptionId, Capacitor.getPlatform())
}

export async function removePushToken(_userId: string) {
  const OneSignal = getNativeOneSignal()
  const notifications = getNativelyNotifications()
  try {
    if (notifications && typeof notifications.removeExternalId === 'function') {
      await nativelyCall(notifications, 'removeExternalId')
    } else if (OneSignal && typeof OneSignal.logout === 'function') {
      await OneSignal.logout()
    } else if (OneSignal && typeof OneSignal.removeExternalUserId === 'function') {
      await OneSignal.removeExternalUserId()
    }
    currentExternalId = null
    pushInitialized = false
    console.log('[PUSH-CLIENT] OneSignal user logged out')
  } catch (e) {
    console.error('[PUSH-CLIENT] Error logging out of OneSignal:', e)
  }
}

async function waitForPushBridge(timeoutMs: number): Promise<{ type: 'natively' | 'onesignal'; client: AnyRec } | null> {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    const natively = getNativelyNotifications()
    if (natively) return { type: 'natively', client: natively }
    const os = getNativeOneSignal()
    if (os) return { type: 'onesignal', client: os }
    await new Promise((r) => setTimeout(r, 200))
  }
  const natively = getNativelyNotifications()
  if (natively) return { type: 'natively', client: natively }
  const os = getNativeOneSignal()
  return os ? { type: 'onesignal', client: os } : null
}

function nativelyCall(client: AnyRec, method: string, ...args: unknown[]): Promise<AnyRec | null> {
  return new Promise((resolve) => {
    if (typeof client?.[method] !== 'function') {
      resolve(null)
      return
    }

    client[method](...args, (resp: unknown) => {
      const first = Array.isArray(resp) ? resp[0] : resp
      resolve((first as AnyRec) || null)
    })
  })
}

async function getOneSignalSubscriptionId(OneSignal: AnyRec): Promise<string | null> {
  try {
    if (OneSignal.User?.pushSubscription?.id) return OneSignal.User.pushSubscription.id
    if (typeof OneSignal.User?.pushSubscription?.getIdAsync === 'function') {
      return await OneSignal.User.pushSubscription.getIdAsync()
    }
    if (typeof OneSignal.getDeviceState === 'function') {
      const state = await OneSignal.getDeviceState()
      return state?.userId || state?.pushToken || null
    }
  } catch (error) {
    console.warn('[PUSH-CLIENT] Could not read OneSignal subscription id:', error)
  }
  return null
}

async function savePushSubscription(userId: string, token: string, platform: string) {
  const { error } = await supabase
    .from('push_tokens' as any)
    .upsert(
      {
        user_id: userId,
        token,
        platform,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,token' }
    )

  if (error) {
    console.warn('[PUSH-CLIENT] Could not save OneSignal subscription id:', error)
  } else {
    console.log('[PUSH-CLIENT] OneSignal subscription id saved')
  }
}
