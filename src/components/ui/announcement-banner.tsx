import { useState, useEffect } from 'react'
import { X, Calendar, Users, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'

export const AnnouncementBanner = () => {
  const [isVisible, setIsVisible] = useState(false)

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

  if (!isVisible) return null

  return (
    <div className="relative w-full bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 text-white shadow-lg animate-fade-in">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3 flex-1">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <Users className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <p className="text-sm md:text-base font-medium">
                <span className="font-bold">🎯 TruHeirs Group Coaching Support:</span>{' '}
                Access group coaching calls every <span className="font-semibold">Monday at 9pm EST</span> in the Skool community for support on this app.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              className="bg-white/20 hover:bg-white/30 text-white border-white/30"
              asChild
            >
              <a
                href="https://www.skool.com/truheirs"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2"
              >
                <Calendar className="w-4 h-4" />
                <span className="hidden sm:inline">Join Skool Community</span>
                <span className="sm:hidden">Join</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20 h-8 w-8"
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
