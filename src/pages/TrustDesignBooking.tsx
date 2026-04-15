import { useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/integrations/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Calendar } from 'lucide-react'

export default function TrustDesignBooking() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()

  // If already booked, redirect immediately
  useEffect(() => {
    if (profile?.trust_design_booked) {
      navigate('/workspace-community', { replace: true })
    }
  }, [profile, navigate])

  const markBookingComplete = useCallback(async () => {
    if (user) {
      console.log('[TrustDesignBooking] Booking marked complete for', user.id)
      // Persist in database
      await supabase
        .from('profiles')
        .update({ trust_design_booked: true })
        .eq('id', user.id)
      // Also set localStorage as a fast cache
      localStorage.setItem(`trust_design_booking_${user.id}`, 'true')
      setTimeout(() => navigate('/workspace-community', { replace: true }), 1500)
    }
  }, [user, navigate])

  useEffect(() => {
    const script = document.createElement('script')
    script.src = 'https://assets.calendly.com/assets/external/widget.js'
    script.async = true
    document.body.appendChild(script)

    const handleMessage = (e: MessageEvent) => {
      if (e.data?.event === 'calendly.event_scheduled') {
        console.log('[TrustDesignBooking] Calendly event_scheduled received')
        markBookingComplete()
      }
    }
    window.addEventListener('message', handleMessage)

    return () => {
      window.removeEventListener('message', handleMessage)
      if (document.body.contains(script)) {
        document.body.removeChild(script)
      }
    }
  }, [markBookingComplete])

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl shadow-soft">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Calendar className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">Schedule Your Private Trust Design Call</CardTitle>
          <CardDescription className="text-base mt-2">
            Before accessing the community, schedule a private consultation to design your trust structure with our team.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div 
            className="calendly-inline-widget" 
            data-url="https://calendly.com/turnermarkus50/private-trust-design?primary_color=290a52" 
            style={{ minWidth: '320px', height: '700px' }}
          />
        </CardContent>
      </Card>
    </div>
  )
}
