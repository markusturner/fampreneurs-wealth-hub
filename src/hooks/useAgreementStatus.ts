import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/contexts/AuthContext'

export function useAgreementStatus() {
  const { user, profile } = useAuth()
  const [signed, setSigned] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)
  const [needsAgreement, setNeedsAgreement] = useState(false)

  useEffect(() => {
    if (!user || !profile) {
      setSigned(null)
      setLoading(false)
      return
    }

    const programName = profile.program_name
    // Only TFV and TFBA require agreements
    const requiresAgreement = programName && (
      programName.toLowerCase().includes('vault') ||
      programName.toLowerCase().includes('accelerator')
    )

    if (!requiresAgreement) {
      setSigned(true) // No agreement needed
      setNeedsAgreement(false)
      setLoading(false)
      return
    }

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
