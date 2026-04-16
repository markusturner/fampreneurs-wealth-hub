/**
 * App Icon Badge — sets the unread count on the app icon.
 *
 * Uses the W3C Badging API (PWA on Android/Chrome/Edge) and
 * falls back to Capacitor Badge plugin when running as a native app.
 */

export async function setAppBadge(count: number) {
  // 1. W3C Badging API (PWA / desktop browsers)
  try {
    if ('setAppBadge' in navigator) {
      if (count > 0) {
        await (navigator as any).setAppBadge(count)
      } else {
        await (navigator as any).clearAppBadge()
      }
      return
    }
  } catch (e) {
    console.warn('[BADGE] Badging API error:', e)
  }

  // 2. Capacitor Badge plugin (native iOS / Android) — dynamic import to avoid build errors
  try {
    // @ts-ignore — optional native dependency
    const mod = await import(/* @vite-ignore */ '@capacitor-community/badge')
    const Badge = mod?.Badge
    if (Badge) {
      if (count > 0) {
        await Badge.set({ count })
      } else {
        await Badge.clear()
      }
    }
  } catch {
    // Plugin not installed or not running in Capacitor — silently ignore
  }
}
