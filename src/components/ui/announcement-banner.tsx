import { useState, useEffect } from 'react'
import { X, Calendar, Users, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/AuthContext'
import { useLocation } from 'react-router-dom'

export const AnnouncementBanner = () => {
  const { user } = useAuth()
  const location = useLocation()
  const [isVisible, setIsVisible] = useState(false)
  
  // Don't show on public pages
  const publicPages = ['/', '/auth', '/privacy-policy', '/terms-of-service', '/cookie-policy', '/contact', '/help', '/contact-support']
  const isPublicPage = publicPages.includes(location.pathname)

  useEffect(() => {
    const dismissed = localStorage.getItem('truheirs-announcement-dismissed')
    if (!dismissed) {
      setIsVisible(true)
    }
  }, [])

  const handleDismiss = () => {
    const dismissalData = {
      dismissed: true,
      timestamp: new Date().toISOString()
    }
    localStorage.setItem('truheirs-announcement-dismissed', JSON.stringify(dismissalData))
    setIsVisible(false)
  }

  if (!isVisible || !user || isPublicPage) return null

  return (
    <div className="relative w-full bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 text-white shadow-lg animate-fade-in">
      <div className="container mx-auto px-3 sm:px-4 py-2.5 sm:py-3">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
          <div className="flex items-start sm:items-center gap-2 sm:gap-3 flex-1 min-w-0">
            <div className="flex items-center gap-2 shrink-0 mt-0.5 sm:mt-0">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <Users className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm md:text-base font-medium leading-snug">
                <span className="font-bold">🎯 TruHeirs Group Coaching Support:</span>{' '}
                Access group coaching calls every <span className="font-semibold">Monday at 9pm EST</span> in the Skool community for support on this app.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
            <Button
              variant="secondary"
              size="sm"
              className="bg-white/20 hover:bg-white/30 text-white border-white/30 h-8 sm:h-9 text-xs sm:text-sm"
              asChild
            >
              <a
                href="https://www.skool.com/the-family-dynasty-1157/calendar"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 sm:gap-2"
              >
                <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span>Join</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20 h-8 w-8 shrink-0"
              onClick={handleDismiss}
              aria-label="Dismiss announcement"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
