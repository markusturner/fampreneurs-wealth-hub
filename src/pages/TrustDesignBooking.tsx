import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Calendar, ExternalLink, CheckCircle } from 'lucide-react'

export default function TrustDesignBooking() {
  const { user } = useAuth()
  const [hasBooked, setHasBooked] = useState(false)

  const handleBookCall = () => {
    window.open('https://calendly.com/turnermarkus50/private-trust-design', '_blank')
    setHasBooked(true)
  }

  const handleContinue = () => {
    if (user) {
      localStorage.setItem(`trust_design_booking_${user.id}`, 'completed')
    }
    window.location.href = '/workspace-community'
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg shadow-soft">
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
          <Button
            onClick={handleBookCall}
            className="w-full h-12 text-base"
            style={{ backgroundColor: '#ffb500', color: '#290a52' }}
          >
            <ExternalLink className="mr-2 h-5 w-5" />
            Book Your Call on Calendly
          </Button>

          {hasBooked && (
            <div className="flex items-center gap-2 text-sm text-green-600 justify-center">
              <CheckCircle className="h-4 w-4" />
              <span>Calendly opened — book your preferred time</span>
            </div>
          )}

          <Button
            onClick={handleContinue}
            variant="outline"
            className="w-full h-10"
          >
            {hasBooked ? 'Continue to Community' : 'Skip for Now'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
