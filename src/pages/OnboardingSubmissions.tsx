import { useUserRole } from '@/hooks/useUserRole'
import { useOwnerRole } from '@/hooks/useOwnerRole'
import { useAuth } from '@/contexts/AuthContext'
import { AdminOnboardingSubmissions } from '@/components/dashboard/admin-onboarding-submissions'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function OnboardingSubmissions() {
  const { user } = useAuth()
  const { isAdmin } = useUserRole()
  const { isOwner } = useOwnerRole(user?.id || null)
  const navigate = useNavigate()

  if (!isAdmin && !isOwner) {
    return (
      <div className="container mx-auto py-6 px-4 text-center">
        <p className="text-muted-foreground">You don't have access to this page.</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-3 md:py-6 px-3 sm:px-4 space-y-4 md:space-y-6 pb-20 md:pb-6">
      <div className="flex items-center gap-2 md:gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/admin-settings')} className="shrink-0">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-xl md:text-3xl font-bold">Onboarding Submissions</h1>
          <p className="text-sm text-muted-foreground">Review all onboarding form responses</p>
        </div>
      </div>
      <AdminOnboardingSubmissions />
    </div>
  )
}
