import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/contexts/AuthContext'

export function useAgreementStatus() {
  const { user, profile } = useAuth()
  const [signed, setSigned] = useState<boolean | null>(null)
  const [verificationCompleted, setVerificationCompleted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [needsAgreement, setNeedsAgreement] = useState(false)

  useEffect(() => {
    let isActive = true

    if (!user) {
      setSigned(null)
      setVerificationCompleted(false)
      setLoading(false)
      return
    }

    // If profile isn't available yet, keep loading — don't skip ahead
    if (!profile) {
      setLoading(true)
      return
    }

    const programName = profile.program_name?.trim().toLowerCase() ?? ''
    // All programs require agreements (support both short IDs and full names)
    const requiresAgreement =
      programName === 'tfv' ||
      programName === 'tfba' ||
      programName === 'tffm' ||
      programName === 'fbu' ||
      programName.includes('vault') ||
      programName.includes('accelerator') ||
      programName.includes('mastermind') ||
      programName.includes('fortune') ||
      programName.includes('university')

    if (!requiresAgreement) {
      setSigned(true) // No agreement needed
      setNeedsAgreement(false)
      setVerificationCompleted(true)
      setLoading(false)
      return
    }

    setNeedsAgreement(true)
    setLoading(true)

    const check = async () => {
      const [agreementResult, verificationResult] = await Promise.all([
        supabase
          .from('program_agreements')
          .select('id')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
        user.email
          ? supabase
              .from('user_2fa_settings')
              .select('id')
              .eq('email', user.email)
              .eq('method', 'email')
              .eq('enabled', true)
              .not('verified_at', 'is', null)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle()
          : Promise.resolve({ data: null, error: null }),
      ])

      if (!isActive) return

      if (agreementResult.error) {
        console.error('Error checking agreement status:', agreementResult.error)
      }

      if (verificationResult.error) {
        console.error('Error checking verification status:', verificationResult.error)
      }

      setSigned(!!agreementResult.data)
      setVerificationCompleted(!!verificationResult.data)
      setLoading(false)
    }

    check()

    return () => {
      isActive = false
    }
  }, [user, profile])

  const completed = !needsAgreement || (signed === true && verificationCompleted)

  return { signed, loading, needsAgreement, verificationCompleted, completed }
}
