import { Capacitor } from '@capacitor/core'
import { supabase } from '@/integrations/supabase/client'

type AnyRec = Record<string, any>
const SDK_URL = 'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js'
export const WEB_PUSH_PROMPT_KEY = 'truheirs_web_push_prompted'

let initPromise: Promise<AnyRec | null> | null = null

export function isWebPushSupported() {
  if (typeof window === 'undefined') return false
  if (Capacitor.isNativePlatform() || (window as AnyRec).NativelyNotifications || (window as AnyRec).plugins?.OneSignal) return false
  return 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window
}

async function getAppId(): Promise<string | null> {
  const { data, error } = await supabase.functions.invoke('send-push-notification', { body: { action: 'config' } })
  if (error) { console.warn('[WEB-PUSH] config error', error); return null }
  return data?.app_id ?? null
}

function loadSdk(): Promise<AnyRec> {
  return new Promise((resolve) => {
    const w = window as AnyRec
    w.OneSignalDeferred = w.OneSignalDeferred || []
    w.OneSignalDeferred.push((OneSignal: AnyRec) => resolve(OneSignal))
    if (!document.querySelector(`script[src="${SDK_URL}"]`)) {
      const s = document.createElement('script')
      s.src = SDK_URL
      s.defer = true
      document.head.appendChild(s)
    }
  })
}

export function initWebPush(): Promise<AnyRec | null> {
  if (!isWebPushSupported()) return Promise.resolve(null)
  if (initPromise) return initPromise
  initPromise = (async () => {
    const appId = await getAppId()
    if (!appId) return null
    const OneSignal = await loadSdk()
    try {
      await OneSignal.init({
        appId,
        serviceWorkerPath: '/OneSignalSDKWorker.js',
        allowLocalhostAsSecureOrigin: true,
        notifyButton: { enable: false },
        promptOptions: { slidedown: { prompts: [] } },
      })
    } catch (e) {
      console.warn('[WEB-PUSH] init error', e)
    }
    return OneSignal
  })()
  return initPromise
}

async function saveWebSubscription(userId: string, OneSignal: AnyRec) {
  for (let i = 0; i < 10; i++) {
    const id = OneSignal.User?.PushSubscription?.id
    if (id) {
      const { error } = await supabase.from('push_tokens' as any).upsert(
        { user_id: userId, token: id, platform: 'web', updated_at: new Date().toISOString() },
        { onConflict: 'user_id,token' }
      )
      if (error) console.warn('[WEB-PUSH] save error', error)
      return id as string
    }
    await new Promise((r) => setTimeout(r, 1000))
  }
  return null
}

/** Links an already-permitted browser to the member silently. */
export async function syncWebPush(userId: string) {
  if (!isWebPushSupported() || Notification.permission !== 'granted') return
  const OneSignal = await initWebPush()
  if (!OneSignal) return
  try {
    await OneSignal.login(userId)
    if (OneSignal.User?.PushSubscription?.optedIn === false) await OneSignal.User.PushSubscription.optIn()
    await saveWebSubscription(userId, OneSignal)
  } catch (e) { console.warn('[WEB-PUSH] sync error', e) }
}

/** Asks for permission and registers this browser. Returns true when enabled. */
export async function enableWebPush(userId: string): Promise<boolean> {
  const OneSignal = await initWebPush()
  if (!OneSignal) return false
  try {
    await OneSignal.login(userId)
    await OneSignal.Notifications.requestPermission()
    if (Notification.permission !== 'granted') return false
    await OneSignal.User.PushSubscription.optIn()
    return !!(await saveWebSubscription(userId, OneSignal))
  } catch (e) {
    console.warn('[WEB-PUSH] enable error', e)
    return false
  }
}

export async function disableWebPush(userId: string) {
  const OneSignal = await initWebPush()
  const id = OneSignal?.User?.PushSubscription?.id
  try { await OneSignal?.User?.PushSubscription?.optOut() } catch { /* ignore */ }
  if (id) await supabase.from('push_tokens' as any).delete().eq('user_id', userId).eq('token', id).eq('platform', 'web')
}

export function isWebPushOn(): boolean {
  if (!isWebPushSupported()) return false
  const OneSignal = (window as AnyRec).OneSignal
  return Notification.permission === 'granted' && OneSignal?.User?.PushSubscription?.optedIn !== false
}
