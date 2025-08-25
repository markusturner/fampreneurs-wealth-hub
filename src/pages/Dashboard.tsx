import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { NavHeader } from "@/components/dashboard/nav-header"
import { DashboardStats } from "@/components/dashboard/dashboard-stats"
import { InvestmentChart } from "@/components/dashboard/investment-chart"
import { AssetAllocation } from "@/components/dashboard/asset-allocation"
import { AIChat } from "@/components/dashboard/ai-chat"
import { FamilyMemberDashboard } from "@/components/dashboard/family-member-dashboard"
import { DocumentManagement } from "@/components/dashboard/document-management"
import { EnhancedSearch } from "@/components/dashboard/enhanced-search"
import { RealTimeNotifications } from "@/components/dashboard/real-time-notifications"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2 } from 'lucide-react'
import { useState } from "react"
import { useUserRole } from "@/hooks/useUserRole"
import { OverviewSection } from "@/components/dashboard/overview-section"

const Dashboard = () => {
  const { user, profile, loading } = useAuth()
  const { isFamilyOfficeOnly, isLoading: roleLoading } = useUserRole()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth')
    }
  }, [user, loading, navigate])

  if (loading || roleLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null // Will redirect to auth
  }

  const displayName = profile?.display_name || profile?.first_name || 'Family'

  // Render family member dashboard for limited access users
  if (isFamilyOfficeOnly) {
    return (
      <div className="min-h-screen bg-background">
        <NavHeader onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
        
        <main className="container mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6 max-w-full overflow-hidden">
          <FamilyMemberDashboard />
        </main>
        
        {/* Mobile Bottom Navigation */}
        <div className="pb-16 md:pb-0" />
      </div>
    )
  }

  // Render full admin dashboard for family office administrators
  return (
    <div className="min-h-screen bg-background">
      <NavHeader onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
      
      <main className="container mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6 max-w-full overflow-hidden">
        {/* Welcome Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground">
              Welcome back, {displayName}
            </h1>
            <p className="text-muted-foreground mt-1 text-sm sm:text-base">
              Here's what's happening with your family wealth today
            </p>
          </div>
        </div>

        {/* Key Metrics */}
        <DashboardStats />

        {/* Overview Section */}
        <OverviewSection />

      </main>
      
      {/* Mobile Bottom Navigation */}
      <div className="pb-16 md:pb-0" />
    </div>
  );
};

export default Dashboard;