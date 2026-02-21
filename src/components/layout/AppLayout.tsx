import { useEffect } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { useAuth } from "@/contexts/AuthContext"
import { useOnboardingStatus } from "@/hooks/useOnboardingStatus"
import { useAgreementStatus } from "@/hooks/useAgreementStatus"
import { useIsAdminOrOwner } from "@/hooks/useIsAdminOrOwner"
import { useOwnerRole } from "@/hooks/useOwnerRole"
import { useSubscription } from "@/hooks/useSubscription"
import { AppSidebar } from "./AppSidebar"
import { LockedPageOverlay } from "@/components/dashboard/LockedPageOverlay"
import { Loader2 } from "lucide-react"
import { useState } from "react"
import { NotificationBell } from "@/components/dashboard/notification-bell"

// Routes that require TruHeirs subscription (not accessible without it)
const TRUHEIRS_ROUTES = [
  '/dashboard',
  '/digital-family-office',
  '/documents',
  '/calendar',
  '/members',
  '/family-governance',
  '/family-constitution/setup',
  '/investments',
]


interface AppLayoutProps {
  children: React.ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  const { user, loading, profile } = useAuth()
  const { completed: onboardingCompleted, loading: onboardingLoading } = useOnboardingStatus()
  const { signed: agreementSigned, loading: agreementLoading, needsAgreement } = useAgreementStatus()
  const { isAdminOrOwner, isLoading: roleLoading } = useIsAdminOrOwner()
  const { isOwner } = useOwnerRole(user?.id ?? null)
  const { subscriptionStatus } = useSubscription()
  const navigate = useNavigate()
  const location = useLocation()
  

  const isTruHeirsRoute = TRUHEIRS_ROUTES.includes(location.pathname)
  const hasTruHeirsAccess = isAdminOrOwner || isOwner || profile?.truheirs_access === true || subscriptionStatus.subscribed || subscriptionStatus.loading

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth")
    }
  }, [user, loading, navigate])

  // Redirect to agreement page if not signed yet — AGREEMENT FIRST, then onboarding
  useEffect(() => {
    if (!loading && !agreementLoading && !roleLoading && user && needsAgreement && agreementSigned === false && !isAdminOrOwner) {
      if (location.pathname !== '/program-agreement') {
        navigate("/program-agreement")
      }
    }
  }, [user, loading, agreementLoading, roleLoading, agreementSigned, needsAgreement, isAdminOrOwner, navigate, location.pathname])

  // Only redirect to onboarding AFTER agreement is signed (or not needed)
  useEffect(() => {
    if (!loading && !onboardingLoading && !agreementLoading && !roleLoading && user && !isAdminOrOwner) {
      // If agreement is needed and not signed, don't redirect to onboarding
      if (needsAgreement && agreementSigned === false) return
      if (onboardingCompleted === false && location.pathname !== '/onboarding') {
        navigate("/onboarding")
      }
    }
  }, [user, loading, onboardingLoading, agreementLoading, roleLoading, onboardingCompleted, agreementSigned, needsAgreement, isAdminOrOwner, navigate, location.pathname])

  if (loading || onboardingLoading || agreementLoading || roleLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-accent" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Desktop sidebar */}
      <div className="hidden md:block">
        <AppSidebar />
      </div>

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile top bar */}
        <header className="md:hidden sticky top-0 z-50 flex items-center justify-between px-4 h-14 bg-card/80 backdrop-blur-xl border-b border-border/50">
          <div className="flex items-center gap-2">
            <img
              src="/lovable-uploads/f9de210b-406b-4d7d-9a44-c0e6e5114825.png"
              alt="TruHeirs"
              className="w-8 h-8 object-contain"
            />
            <span className="font-montserrat font-bold text-sm">TruHeirs</span>
          </div>
          <div className="flex items-center gap-1">
            <NotificationBell />
          </div>
        </header>

        {/* Page content */}
        <main className={`flex-1 ${location.pathname.startsWith('/classroom/') ? 'overflow-hidden' : 'overflow-auto pb-20 md:pb-0'}`}>
          {isTruHeirsRoute && !hasTruHeirsAccess ? (
            <LockedPageOverlay locked={true} programFilter="fbu" title="Unlock TruHeirs">
              {children}
            </LockedPageOverlay>
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  )
}
