import { Outlet } from "react-router-dom"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/ui/app-sidebar"
import { NavHeader } from "@/components/dashboard/nav-header"
import { MobileBottomNav } from "@/components/ui/mobile-bottom-nav"
import { useIsMobile } from "@/hooks/use-mobile"
import { useAuth } from "@/contexts/AuthContext"

export function MainLayout() {
  const isMobile = useIsMobile()
  const { user } = useAuth()
  
  // Don't show layout for unauthenticated users
  if (!user) {
    return <Outlet />
  }

  return (
    <SidebarProvider defaultOpen={!isMobile}>
      <div className="flex min-h-screen w-full">
        {/* Desktop Sidebar - hidden on mobile */}
        <AppSidebar />
        
        {/* Main content area */}
        <SidebarInset className="flex-1">
          {/* Header - always visible */}
          <NavHeader />
          
          {/* Page content */}
          <main className="flex-1 p-4 sm:p-6 lg:p-8 pb-20 sm:pb-6">
            <Outlet />
          </main>
        </SidebarInset>
        
        {/* Mobile bottom navigation - only on mobile */}
        {isMobile && <MobileBottomNav />}
      </div>
    </SidebarProvider>
  )
}