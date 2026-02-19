import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/contexts/AuthContext'

export function useAgreementStatus() {
  const { user, profile } = useAuth()
  const [signed, setSigned] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)
  const [needsAgreement, setNeedsAgreement] = useState(false)

  useEffect(() => {
    if (!user) {
      setSigned(null)
      setLoading(false)
      return
    }

    // Keep loading until profile is available so we can check program_name
    if (!profile) {
      setLoading(true)
      return
    }

    // All users must sign the program agreement before proceeding
    // Previously only certain programs required it, but now it's mandatory for everyone

    setNeedsAgreement(true)

    const check = async () => {
      const { data } = await supabase
        .from('program_agreements')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()

      setSigned(!!data)
      setLoading(false)
    }
    check()
  }, [user, profile])

  return { signed, loading, needsAgreement }
}
