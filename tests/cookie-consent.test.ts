import { describe, expect, test } from 'bun:test'
import { needsCookieBanner, optionalCookiesAllowed, readCookieConsent, saveCookieConsent } from '../src/lib/cookie-consent'

function memoryStorage() {
  const data = new Map<string, string>()
  return { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => { data.set(k, v) } }
}

describe('cookie consent', () => {
  test('optional cookies are off until the person picks Accept all', () => {
    const s = memoryStorage()
    expect(optionalCookiesAllowed(s, {})).toBe(false)
    expect(needsCookieBanner(s, {})).toBe(true)
  })

  test('Essential only keeps optional cookies off and hides the banner', () => {
    const s = memoryStorage()
    saveCookieConsent('essential', s)
    expect(optionalCookiesAllowed(s, {})).toBe(false)
    expect(needsCookieBanner(s, {})).toBe(false)
  })

  test('Accept all turns optional cookies on', () => {
    const s = memoryStorage()
    saveCookieConsent('all', s)
    expect(readCookieConsent(s)?.choice).toBe('all')
    expect(optionalCookiesAllowed(s, {})).toBe(true)
  })

  test('Global Privacy Control blocks optional cookies even after Accept all', () => {
    const s = memoryStorage()
    saveCookieConsent('all', s)
    expect(optionalCookiesAllowed(s, { globalPrivacyControl: true })).toBe(false)
    expect(needsCookieBanner(memoryStorage(), { globalPrivacyControl: true })).toBe(false)
  })
})
