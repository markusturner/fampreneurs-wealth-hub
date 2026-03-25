import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, Shield } from 'lucide-react'

export default function Auth() {
  const navigate = useNavigate()

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        window.location.href = '/ai-chat'
      }
    }
    checkUser()
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-soft">
        <CardHeader className="text-center">
          <div className="mx-auto w-20 h-20 rounded-full flex items-center justify-center mb-4">
            <img
              src="/lovable-uploads/cb7af8d2-0809-4d9d-8fa4-acfb507144de.png"
              alt="TruHeirs Logo"
              className="w-20 h-20 object-contain"
            />
          </div>
          <CardTitle className="text-2xl font-bold">TruHeirs</CardTitle>
          <CardDescription>Select your login type</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            onClick={() => navigate('/auth/family')}
            className="w-full h-12 text-base gap-3"
            style={{ backgroundColor: '#ffb500', color: '#290a52' }}
          >
            <Users className="h-5 w-5" />
            Family Member Login
          </Button>
          <Button
            onClick={() => navigate('/auth/trustee')}
            variant="outline"
            className="w-full h-12 text-base gap-3"
            style={{ borderColor: '#290a52' }}
          >
            <Shield className="h-5 w-5" />
            Trustee Login
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
