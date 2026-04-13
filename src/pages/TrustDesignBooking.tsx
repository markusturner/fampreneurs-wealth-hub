import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Calendar, CheckCircle } from 'lucide-react'

export default function TrustDesignBooking() {
  const { user } = useAuth()
  const [hasBooked, setHasBooked] = useState(false)

  useEffect(() => {
    // Load Calendly widget script
    const script = document.createElement('script')
    script.src = 'https://assets.calendly.com/assets/external/widget.js'
    script.async = true
    document.body.appendChild(script)

    return () => {
      document.body.removeChild(script)
    }
  }, [])

  const handleContinue = () => {
    if (user) {
      localStorage.setItem(`trust_design_booking_${user.id}`, 'completed')
    }
    window.location.href = '/workspace-community'
  }

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
          {/* Calendly inline widget */}
          <div 
            className="calendly-inline-widget" 
            data-url="https://calendly.com/turnermarkus50/private-trust-design?primary_color=290a52" 
            style={{ minWidth: '320px', height: '700px' }}
          />

          <Button
            onClick={handleContinue}
            variant="outline"
            className="w-full h-10 mt-4"
          >
            Continue to Community
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
