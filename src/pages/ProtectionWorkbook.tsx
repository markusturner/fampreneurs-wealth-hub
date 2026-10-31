import { EducationalDisclaimer } from '@/components/legal/EducationalDisclaimer'
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useIsAdminOrOwner } from '@/hooks/useIsAdminOrOwner'
import { FamilyProtectionPlanForm } from '@/components/trust/FamilyProtectionPlanForm'
import { BackToWelcome } from '@/components/layout/BackToWelcome'
import { isVipWeekendProgram } from '@/lib/workbook'

export default function ProtectionWorkbook() {
  const { profile, loading } = useAuth()
  const { isAdminOrOwner, isLoading } = useIsAdminOrOwner()
  const navigate = useNavigate()
  const allowed = isAdminOrOwner || isVipWeekendProgram(profile?.program_name)

  useEffect(() => {
    if (!loading && !isLoading && profile && !allowed) navigate('/dashboard')
  }, [loading, isLoading, profile, allowed, navigate])

  if (!allowed) return null

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <EducationalDisclaimer />
      <BackToWelcome />
      <div className="text-center">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">VIP Weekend Mastermind</h1>
        <h2 className="mt-2 text-lg font-semibold text-foreground">Family Protection Workbook</h2>
        <p className="text-muted-foreground mt-1 text-sm sm:text-base">VIP Weekend Prep. Fill this out so our team can set up your trusts with ease.</p>
      </div>
      <FamilyProtectionPlanForm workbook />
    </div>
  )
}
