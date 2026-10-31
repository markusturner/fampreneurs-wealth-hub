import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Cookie } from 'lucide-react'
import { needsCookieBanner, OPEN_COOKIE_SETTINGS_EVENT, saveCookieConsent, type CookieChoice } from '@/lib/cookie-consent'

/** Small bottom banner asking before any optional cookies. Reopened from Profile Settings, Privacy. */
export function CookieConsentBanner() {
  const [open, setOpen] = useState(() => needsCookieBanner())

  useEffect(() => {
    const reopen = () => setOpen(true)
    window.addEventListener(OPEN_COOKIE_SETTINGS_EVENT, reopen)
    return () => window.removeEventListener(OPEN_COOKIE_SETTINGS_EVENT, reopen)
  }, [])

  if (!open) return null

  const choose = (choice: CookieChoice) => {
    saveCookieConsent(choice)
    setOpen(false)
  }

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Cookie choices"
      className="fixed inset-x-3 bottom-24 z-[90] mx-auto max-w-xl rounded-xl border border-border bg-card p-4 text-card-foreground shadow-lg md:bottom-4"
    >
      <div className="flex items-start gap-3">
        <Cookie className="mt-0.5 h-5 w-5 shrink-0 text-secondary" aria-hidden="true" />
        <div className="space-y-3">
          <p className="text-sm">
            We use essential cookies to keep you signed in and safe. With your OK, we may also use optional cookies to see how the app is used.{' '}
            <Link to="/cookie-policy" className="underline underline-offset-2">Cookie Policy</Link>
          </p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" className="bg-secondary text-secondary-foreground hover:bg-accent hover:text-accent-foreground" onClick={() => choose('all')}>Accept all</Button>
            <Button size="sm" variant="outline" onClick={() => choose('essential')}>Essential only</Button>
          </div>
        </div>
      </div>
    </div>
  )
}
