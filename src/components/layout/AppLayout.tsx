import { useEffect } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { useAuth } from "@/contexts/AuthContext"
import { useOnboardingStatus } from "@/hooks/useOnboardingStatus"
import { AppSidebar } from "./AppSidebar"
import { Loader2, Menu } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { NotificationBell } from "@/components/dashboard/notification-bell"
import { ThemeToggle } from "@/components/theme-toggle"

interface AppLayoutProps {
  children: React.ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  const { user, loading, profile } = useAuth()
  const { completed: onboardingCompleted, loading: onboardingLoading } = useOnboardingStatus()
  const navigate = useNavigate()
  const location = useLocation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth")
    }
  }, [user, loading, navigate])

  // Redirect to onboarding if not completed (skip for admins)
  useEffect(() => {
    if (!loading && !onboardingLoading && user && onboardingCompleted === false && !profile?.is_admin) {
      navigate("/onboarding")
    }
  }, [user, loading, onboardingLoading, onboardingCompleted, profile, navigate])

  if (loading || onboardingLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
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
        <header className="md:hidden sticky top-0 z-50 flex items-center justify-between px-4 h-14 border-b border-border bg-background/95 backdrop-blur">
          <div className="flex items-center gap-2">
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-72 overflow-hidden">
                <div className="h-full">
                  <AppSidebar className="w-full border-r-0" />
                </div>
              </SheetContent>
            </Sheet>
            <img
              src="/lovable-uploads/f9de210b-406b-4d7d-9a44-c0e6e5114825.png"
              alt="TruHeirs"
              className="w-8 h-8 object-contain"
            />
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <NotificationBell />
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
