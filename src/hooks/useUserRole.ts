import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/integrations/supabase/client'
import { cachedRequest } from '@/lib/request-cache'

export interface UserRole {
  isFamilyOfficeOnly: boolean
  isAdmin: boolean
  isFamilyMember: boolean
  isLoading: boolean
}

export function useUserRole(): UserRole {
  const { user, profile } = useAuth()
  const [isFamilyOfficeOnly, setIsFamilyOfficeOnly] = useState(false)
  const [isFamilyMember, setIsFamilyMember] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    const checkUserRole = async () => {
      if (!user?.id) {
        setIsLoading(false)
        return
      }

      try {
        const familyOfficeOnly = await cachedRequest(
          `family-office-only:${user.id}`,
          async () => {
            const { data, error } = await supabase.rpc('is_family_office_only_user', {
              p_user_id: user.id,
            })
            if (error) throw error
            return !!data
          },
          10 * 60 * 1000,
        )

        if (cancelled) return
        setIsFamilyOfficeOnly(familyOfficeOnly)
        setIsFamilyMember(profile?.membership_type === 'family_member')
      } catch (error) {
        console.error('Error checking user role:', error)
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    checkUserRole()
    return () => {
      cancelled = true
    }
  }, [user?.id, profile?.membership_type])

  return {
    isFamilyOfficeOnly,
    isAdmin: profile?.is_admin || false,
    isFamilyMember,
    isLoading
  }
}
