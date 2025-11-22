import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle, ArrowRight } from 'lucide-react'
import { useTheme } from '@/components/theme-provider'

export default function ThankYou() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { theme } = useTheme()
  const [planName, setPlanName] = useState('')
  const [sessionId, setSessionId] = useState('')

  useEffect(() => {
    const plan = searchParams.get('plan') || 'TruHeirs Subscription'
    const session = searchParams.get('session_id') || ''
    setPlanName(decodeURIComponent(plan))
    setSessionId(session)
  }, [searchParams])

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl shadow-soft">
        <CardHeader className="text-center">
          <div className="mx-auto w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center mb-4">
            <CheckCircle className="w-12 h-12 text-green-500" />
          </div>
          <CardTitle className="text-3xl font-bold">Thank You for Your Purchase!</CardTitle>
          <CardDescription className="text-lg">
            Welcome to the TruHeirs family
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Purchase Summary */}
          <div className="border rounded-lg p-6 space-y-4">
            <h3 className="text-xl font-semibold">Purchase Summary</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Plan:</span>
                <span className="font-semibold">{planName}</span>
              </div>
              {sessionId && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Order ID:</span>
                  <span className="font-mono text-sm">{sessionId.substring(0, 20)}...</span>
                </div>
              )}
              <div className="pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                  A confirmation email has been sent to your inbox with your purchase details and receipt.
                </p>
              </div>
            </div>
          </div>

          {/* What's Included */}
          <div className="border rounded-lg p-6 space-y-4">
            <h3 className="text-xl font-semibold">What's Included</h3>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Complete DIY AI family office platform</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Advanced wealth tracking and analytics</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Family governance tools</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Secure document management</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Investment tracking and monitoring</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>AI-powered insights and recommendations</span>
              </li>
            </ul>
          </div>

          {/* Next Steps */}
          <div className="border rounded-lg p-6 space-y-4">
            <h3 className="text-xl font-semibold">Next Steps</h3>
            <ol className="space-y-2 text-sm list-decimal list-inside">
              <li>Create your trustee account using the button below</li>
              <li>Complete your family profile setup</li>
              <li>Invite family members to join your office</li>
              <li>Start managing your family wealth and governance</li>
            </ol>
          </div>

          {/* CTA Buttons */}
          <div className="space-y-3">
            <Button 
              className="w-full text-lg py-6"
              style={{ backgroundColor: '#ffb500', color: '#290a52' }}
              onClick={() => navigate('/auth?signup=trustee')}
            >
              Create Your Account
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>

            <a 
              href="https://apps.apple.com/us/app/markus-turner/id6755499709"
              target="_blank"
              rel="noopener noreferrer"
              className="block"
            >
              <Button 
                variant="outline"
                className="w-full text-lg py-6"
              >
                <svg className="mr-2 h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                </svg>
                Download on the App Store
              </Button>
            </a>
          </div>

          <p className="text-center text-sm text-muted-foreground">
            Questions? Contact our support team at support@truheirs.com
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
