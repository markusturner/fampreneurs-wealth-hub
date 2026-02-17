import { useUserRole } from './useUserRole'
import { useOwnerRole } from './useOwnerRole'
import { useAuth } from '@/contexts/AuthContext'

export function useIsAdminOrOwner() {
  const { user } = useAuth()
  const { isAdmin, isLoading: adminLoading } = useUserRole()
  const { isOwner, isLoading: ownerLoading } = useOwnerRole(user?.id ?? null)

  return {
    isAdminOrOwner: isAdmin || isOwner,
    isLoading: adminLoading || ownerLoading,
  }
}
