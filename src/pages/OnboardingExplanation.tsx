import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Shield, ClipboardList, FileCheck, Camera, Users, ArrowRight, Lock, Calendar } from 'lucide-react'

const steps = [
  {
    icon: ClipboardList,
    title: '1. Onboarding Form',
    description: 'Complete a brief form so we can personalize your experience.',
    color: 'text-amber-600',
    bg: 'bg-amber-50',
  },
  {
    icon: FileCheck,
    title: '2. Program Agreement',
    description: 'Review and sign your binding membership agreement.',
    color: 'text-purple-600',
    bg: 'bg-purple-50',
  },
  {
    icon: Shield,
    title: '3. Verification Process',
    description: 'Identity verification keeps our private community secure.',
    color: 'text-blue-600',
    bg: 'bg-blue-50',
  },
  {
    icon: Camera,
    title: '4. Profile Photo',
    description: 'Upload a photo so members and coaches recognize you.',
    color: 'text-green-600',
    bg: 'bg-green-50',
  },
  {
    icon: Calendar,
    title: '5. Onboarding Call',
    description: 'Schedule a private call to review your trust design.',
    color: 'text-orange-600',
    bg: 'bg-orange-50',
  },
  {
    icon: Users,
    title: '6. Community Access',
    description: 'Gain full access to the community, courses, AI tools, and dashboard.',
    color: 'text-sky-600',
    bg: 'bg-sky-50',
  },
]

export default function OnboardingExplanation() {
  const navigate = useNavigate()
  const { user, loading } = useAuth()

  if (loading || !user) return null

  const handleContinue = () => {
    localStorage.setItem(`onboarding_explained_${user.id}`, 'true')
    navigate('/onboarding')
  }

  return (
    <div className="h-[100dvh] overflow-hidden bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-2 sm:p-4">
      <Card className="w-full max-w-3xl shadow-soft max-h-full flex flex-col">
        <CardHeader className="text-center py-3 space-y-1">
          <img
            src="/lovable-uploads/cb7af8d2-0809-4d9d-8fa4-acfb507144de.png"
            alt="TruHeirs Logo"
            className="w-10 h-10 object-contain mx-auto"
          />
          <CardTitle className="text-lg sm:text-xl font-bold">Welcome to TruHeirs</CardTitle>
          <p className="text-xs text-muted-foreground">
            Here's what to expect during your onboarding process
          </p>
        </CardHeader>
        <CardContent className="pt-0 pb-3 px-3 sm:px-6 flex-1 min-h-0 flex flex-col gap-2">
          <div className="flex flex-col gap-1.5 flex-1 min-h-0 overflow-hidden">
            {steps.map((step, index) => (
              <div
                key={index}
                className={`flex items-center gap-2.5 p-1.5 rounded-lg ${step.bg} border border-transparent`}
              >
                <div className={`shrink-0 ${step.color}`}>
                  <step.icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className={`font-semibold text-xs ${step.color} leading-tight`}>{step.title}</h3>
                  <p className="text-[11px] text-muted-foreground leading-snug line-clamp-1">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-center gap-2 text-[10px] text-muted-foreground">
            <Lock className="h-3 w-3" />
            Your information is encrypted and never shared with third parties
          </div>

          <Button
            onClick={handleContinue}
            className="w-full gap-2 shrink-0"
            style={{ backgroundColor: '#ffb500', color: '#290a52', transition: 'background-color 0.2s' }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#2eb2ff')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#ffb500')}
          >
            Continue to Onboarding
            <ArrowRight className="h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

