import { useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/integrations/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Calendar, CheckCircle2 } from 'lucide-react'

export default function TrustDesignBooking() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const calendlyRef = useRef<HTMLDivElement>(null)
  const scriptRef = useRef<HTMLScriptElement | null>(null)

  // If already booked, redirect immediately
  useEffect(() => {
    if (profile?.trust_design_booked) {
      navigate('/workspace-community', { replace: true })
    }
  }, [profile, navigate])

  const markBookingComplete = useCallback(async () => {
    if (user) {
      console.log('[TrustDesignBooking] Booking marked complete for', user.id)
      await supabase
        .from('profiles')
        .update({ trust_design_booked: true })
        .eq('id', user.id)
      localStorage.setItem(`trust_design_booking_${user.id}`, 'true')
      setTimeout(() => navigate('/workspace-community', { replace: true }), 1500)
    }
  }, [user, navigate])

  useEffect(() => {
    // Load LeadConnector form embed script
    const script = document.createElement('script')
    script.src = 'https://link.msgsndr.com/js/form_embed.js'
    script.async = true
    script.type = 'text/javascript'
    document.body.appendChild(script)
    scriptRef.current = script

    const handleMessage = (e: MessageEvent) => {
      const data = e.data
      const type = typeof data === 'string' ? data : data?.type || data?.event
      if (typeof type === 'string' && /appointment|booking|scheduled|form[_-]?submit/i.test(type)) {
        console.log('[TrustDesignBooking] Booking event received:', type)
        markBookingComplete()
      }
    }
    window.addEventListener('message', handleMessage)

    return () => {
      window.removeEventListener('message', handleMessage)
      try {
        if (scriptRef.current && scriptRef.current.parentNode) {
          scriptRef.current.parentNode.removeChild(scriptRef.current)
        }
      } catch (e) {
        // Ignore if already removed
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
        <CardContent>
          <div ref={calendlyRef}>
            <iframe
              src="https://api.leadconnectorhq.com/widget/booking/57gmsk4ehRnukpLdEFxH"
              style={{ width: '100%', border: 'none', overflow: 'hidden', minHeight: '700px' }}
              scrolling="no"
              id="jbuepPNPpLxO6qSzlAW9_1784489201296"
            />
          </div>
          <div className="mt-6 flex flex-col items-center gap-2 border-t pt-6">
            <p className="text-sm text-muted-foreground text-center">
              Already booked your call? Click below to continue to your dashboard.
            </p>
            <Button onClick={markBookingComplete} size="lg" className="gap-2">
              <CheckCircle2 className="h-4 w-4" />
              I've booked my call
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
