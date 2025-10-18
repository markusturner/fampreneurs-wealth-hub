import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/integrations/supabase/client'

export interface UserRole {
  isFamilyOfficeOnly: boolean
  isAdmin: boolean
  isLoading: boolean
}

export function useUserRole(): UserRole {
  const { user, profile } = useAuth()
  const [isFamilyOfficeOnly, setIsFamilyOfficeOnly] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const checkUserRole = async () => {
      if (!user?.id) {
        setIsLoading(false)
        return
      }

      try {
        // Check if user is family office only
        const { data: familyOfficeOnly, error } = await supabase.rpc('is_family_office_only_user', {
          p_user_id: user.id
        })

        if (!error) {
          setIsFamilyOfficeOnly(familyOfficeOnly || false)
        }
      } catch (error) {
        console.error('Error checking user role:', error)
      } finally {
        setIsLoading(false)
      }
    }

    checkUserRole()
  }, [user?.id])

  return {
    isFamilyOfficeOnly,
    isAdmin: profile?.is_admin || false,
    isLoading
  }
}