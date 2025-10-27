import { useAuth } from '@/contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { Hero } from '@/components/landing/Hero'
import { Features } from '@/components/landing/Features'
import { Pricing } from '@/components/landing/Pricing'
import { FAQ } from '@/components/landing/FAQ'
import { Footer } from '@/components/landing/Footer'
import { BuildInfo } from '@/components/BuildInfo'

const Landing = () => {
  const { user, loading } = useAuth()
  const navigate = useNavigate()

  // Track landing page view
  useEffect(() => {
    const trackPageView = async () => {
      try {
        // Generate or retrieve visitor ID from localStorage
        let visitorId = localStorage.getItem('visitor_id')
        if (!visitorId) {
          visitorId = crypto.randomUUID()
          localStorage.setItem('visitor_id', visitorId)
        }

        await supabase.from('page_views').insert({
          page_path: '/',
          visitor_id: visitorId,
          user_agent: navigator.userAgent,
          referrer: document.referrer || null
        })
      } catch (error) {
        console.error('Error tracking page view:', error)
      }
    }

    trackPageView()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Hero />
      <Features />
      <Pricing />
      <FAQ />
      <Footer />
      <BuildInfo />
    </div>
  )
}

export default Landing