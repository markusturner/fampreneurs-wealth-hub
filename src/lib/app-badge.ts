/**
 * App Icon Badge — sets the unread count on the app icon.
 * Uses the W3C Badging API (PWA on Android/Chrome/Edge/desktop).
 */

export async function setAppBadge(count: number) {
  try {
    if ('setAppBadge' in navigator) {
      if (count > 0) {
        await (navigator as any).setAppBadge(count)
      } else {
        await (navigator as any).clearAppBadge()
      }
    }
  } catch (e) {
    console.warn('[BADGE] Badging API error:', e)
  }
}
