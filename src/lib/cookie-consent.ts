// Cookie / browser-storage consent. Essential storage (sign-in, security, saved settings)
// always runs. Optional storage (analytics, marketing) runs only after an explicit "Accept all",
// and never when the browser sends a Global Privacy Control signal.
export const COOKIE_CONSENT_KEY = 'truheirs_cookie_consent'
export const COOKIE_CONSENT_VERSION = 1
export const OPEN_COOKIE_SETTINGS_EVENT = 'truheirs:open-cookie-settings'

export type CookieChoice = 'all' | 'essential'
export type StoredCookieConsent = { choice: CookieChoice; version: number; decidedAt: string }

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>

export function hasGlobalPrivacyControl(nav: unknown = typeof navigator !== 'undefined' ? navigator : undefined): boolean {
  return (nav as { globalPrivacyControl?: boolean } | undefined)?.globalPrivacyControl === true
}

export function readCookieConsent(storage: StorageLike | undefined = safeStorage()): StoredCookieConsent | null {
  try {
    const raw = storage?.getItem(COOKIE_CONSENT_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as StoredCookieConsent
    if (parsed?.version !== COOKIE_CONSENT_VERSION) return null
    if (parsed.choice !== 'all' && parsed.choice !== 'essential') return null
    return parsed
  } catch {
    return null
  }
}

export function saveCookieConsent(choice: CookieChoice, storage: StorageLike | undefined = safeStorage(), now: Date = new Date()): StoredCookieConsent {
  const record: StoredCookieConsent = { choice, version: COOKIE_CONSENT_VERSION, decidedAt: now.toISOString() }
  try { storage?.setItem(COOKIE_CONSENT_KEY, JSON.stringify(record)) } catch { /* storage blocked */ }
  return record
}

/** Optional analytics/marketing storage is allowed only after "Accept all" and without a GPC signal. */
export function optionalCookiesAllowed(storage: StorageLike | undefined = safeStorage(), nav?: unknown): boolean {
  if (hasGlobalPrivacyControl(nav)) return false
  return readCookieConsent(storage)?.choice === 'all'
}

/** The banner is needed only when no choice is saved and the browser has not already said no via GPC. */
export function needsCookieBanner(storage: StorageLike | undefined = safeStorage(), nav?: unknown): boolean {
  if (hasGlobalPrivacyControl(nav)) return false
  return readCookieConsent(storage) === null
}

export function openCookieSettings() {
  window.dispatchEvent(new Event(OPEN_COOKIE_SETTINGS_EVENT))
}

function safeStorage(): StorageLike | undefined {
  try { return typeof window !== 'undefined' ? window.localStorage : undefined } catch { return undefined }
}
