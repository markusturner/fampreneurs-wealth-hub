import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/contexts/AuthContext'

export function useOnboardingStatus() {
  const { user } = useAuth()
  const [completed, setCompleted] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      setCompleted(null)
      setLoading(false)
      return
    }

    const check = async () => {
      const { data, error } = await supabase
        .from('onboarding_responses')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()

      if (error) {
        console.error('Error checking onboarding status:', error)
      }
      setCompleted(!!data)
      setLoading(false)
    }
    check()
  }, [user])

  return { completed, loading }
}
