import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Shield, ClipboardList, FileCheck, Camera, Users, ArrowRight, Lock } from 'lucide-react'

const steps = [
  {
    icon: ClipboardList,
    title: '1. Onboarding Form',
    description: 'Complete a brief onboarding form so we can personalize your experience and ensure you get the most out of your membership.',
    color: 'text-amber-600',
    bg: 'bg-amber-50',
  },
  {
    icon: FileCheck,
    title: '2. Program Agreement',
    description: 'Review and sign your program services agreement — a binding agreement that outlines the terms, deliverables, and expectations of your membership.',
    color: 'text-purple-600',
    bg: 'bg-purple-50',
  },
  {
    icon: Shield,
    title: '3. Verification Process',
    description: 'For your security and privacy, we require identity verification. As a private company, protecting our members\' information is at the core of who we are and what we stand for. This verification process represents our commitment to maintaining a trusted and secure environment for every member.',
    color: 'text-blue-600',
    bg: 'bg-blue-50',
  },
  {
    icon: Camera,
    title: '4. Profile Photo',
    description: 'Upload a profile photo so your fellow members and coaches can recognize you in the community.',
    color: 'text-green-600',
    bg: 'bg-green-50',
  },
  {
    icon: Users,
    title: '5. Community Access',
    description: 'Once all steps are complete, you\'ll gain full access to the TruHeirs community, courses, AI tools, and your personalized dashboard.',
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
    <div className="min-h-[100dvh] bg-gradient-to-br from-background via-background to-primary/5 flex items-start md:items-center justify-center p-4 pt-6 md:pt-4 overflow-y-auto">
      <Card className="w-full max-w-2xl shadow-soft mb-6">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-3">
            <img
              src="/lovable-uploads/cb7af8d2-0809-4d9d-8fa4-acfb507144de.png"
              alt="TruHeirs Logo"
              className="w-16 h-16 object-contain"
            />
          </div>
          <CardTitle className="text-2xl font-bold">Welcome to TruHeirs</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Here's what to expect during your onboarding process
          </p>
          <div className="flex items-center justify-center gap-2 mt-3 px-4 py-2 rounded-lg bg-muted/50 border mx-auto w-fit">
            <Lock className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">
              Your information is encrypted and never shared with third parties
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          {steps.map((step, index) => (
            <div
              key={index}
              className={`flex gap-4 p-4 rounded-lg ${step.bg} border border-transparent`}
            >
              <div className={`shrink-0 mt-0.5 ${step.color}`}>
                <step.icon className="h-6 w-6" />
              </div>
              <div>
                <h3 className={`font-semibold text-sm ${step.color}`}>{step.title}</h3>
                <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                  {step.description}
                </p>
              </div>
            </div>
          ))}

          <Button
            onClick={handleContinue}
            className="w-full mt-6 gap-2"
            size="lg"
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
