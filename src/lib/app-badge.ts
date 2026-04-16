/**
 * App Icon & Tab Badge — syncs unread count across:
 * 1. W3C Badging API (PWA icon badge on Android/Chrome/Edge)
 * 2. Browser tab title (e.g. "(3) TruHeirs")
 */

const BASE_TITLE = 'TruHeirs'

export async function setAppBadge(count: number) {
  // 1. PWA / installed app icon badge (W3C Badging API)
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

  // 2. Browser tab title badge
  try {
    document.title = count > 0 ? `(${count}) ${BASE_TITLE}` : BASE_TITLE
  } catch {
    // SSR guard
  }
}
