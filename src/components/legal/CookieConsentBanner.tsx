import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Cookie } from 'lucide-react'
import { cn } from '@/lib/utils'
import { needsCookieBanner, OPEN_COOKIE_SETTINGS_EVENT, saveCookieConsent, type CookieChoice } from '@/lib/cookie-consent'

const isFormField = (el: EventTarget | null) =>
  el instanceof HTMLElement && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable)

/** Small bottom banner asking before any optional cookies. Reopened from Profile Settings, Privacy. */
export function CookieConsentBanner() {
  const [open, setOpen] = useState(() => needsCookieBanner())
  const [typing, setTyping] = useState(false)
  const { pathname } = useLocation()
  const onAuthPage = pathname === '/' || pathname.startsWith('/auth') || pathname.startsWith('/apply') || pathname.startsWith('/signup') || pathname.startsWith('/register') || pathname.startsWith('/login')

  useEffect(() => {
    const reopen = () => setOpen(true)
    window.addEventListener(OPEN_COOKIE_SETTINGS_EVENT, reopen)
    return () => window.removeEventListener(OPEN_COOKIE_SETTINGS_EVENT, reopen)
  }, [])

  // Hide on phones while someone is typing so it never covers fields or the keyboard.
  useEffect(() => {
    const onIn = (e: FocusEvent) => { if (isFormField(e.target)) setTyping(true) }
    const onOut = () => setTimeout(() => setTyping(isFormField(document.activeElement)), 0)
    document.addEventListener('focusin', onIn)
    document.addEventListener('focusout', onOut)
    return () => {
      document.removeEventListener('focusin', onIn)
      document.removeEventListener('focusout', onOut)
    }
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
      className={cn(
        'fixed z-[90] border border-border bg-card text-card-foreground shadow-lg',
        // Phones: slim strip pinned to the very bottom edge
        'inset-x-0 bottom-0 rounded-t-xl px-3 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))]',
        !onAuthPage && 'bottom-24 inset-x-3 rounded-xl pb-2',
        typing && 'max-md:hidden',
        // Desktop: floating card
        'md:inset-x-3 md:bottom-4 md:mx-auto md:max-w-xl md:rounded-xl md:p-4'
      )}
    >
      <div className="flex items-center gap-2 md:items-start md:gap-3">
        <Cookie className="hidden h-5 w-5 shrink-0 text-secondary md:mt-0.5 md:block" aria-hidden="true" />
        <div className="flex min-w-0 flex-1 items-center gap-2 md:block md:space-y-3">
          <p className="min-w-0 flex-1 text-xs leading-snug md:text-sm">
            <span className="md:hidden">We use cookies to keep you signed in.{' '}</span>
            <span className="hidden md:inline">We use essential cookies to keep you signed in and safe. With your OK, we may also use optional cookies to see how the app is used.{' '}</span>
            <Link to="/cookie-policy" className="underline underline-offset-2">Learn more</Link>
          </p>
          <div className="flex shrink-0 gap-1.5 md:flex-wrap md:gap-2">
            <Button size="sm" className="h-8 px-3 text-xs bg-secondary text-secondary-foreground hover:bg-accent hover:text-accent-foreground md:h-9 md:text-sm" onClick={() => choose('all')}>Accept</Button>
            <Button size="sm" variant="outline" className="h-8 px-3 text-xs md:h-9 md:text-sm" onClick={() => choose('essential')}>
              <span className="md:hidden">Essential</span>
              <span className="hidden md:inline">Essential only</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
