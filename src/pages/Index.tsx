import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { NavHeader } from "@/components/dashboard/nav-header"
import { DashboardStats } from "@/components/dashboard/dashboard-stats"
import { InvestmentChart } from "@/components/dashboard/investment-chart"
import { RecentActivities } from "@/components/dashboard/recent-activities"
import { QuickActions } from "@/components/dashboard/quick-actions"
import { AssetAllocation } from "@/components/dashboard/asset-allocation"
import { FamilyCalendar } from "@/components/dashboard/family-calendar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2 } from 'lucide-react'
import { useState } from "react"

const Index = () => {
  const { user, profile, loading } = useAuth()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth')
    } else if (!loading && user && profile?.is_admin) {
      navigate('/admin')
    }
  }, [user, loading, navigate, profile])

  if (loading) {
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

  return (
    <div className="min-h-screen bg-background">
      <NavHeader onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
      
      <main className="container mx-auto px-2 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
        {/* Welcome Section */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
              Welcome back, {displayName}
            </h1>
            <p className="text-muted-foreground mt-1 text-sm sm:text-base">
              Here's what's happening with your family office today
            </p>
          </div>
        </div>

        {/* Key Metrics */}
        <DashboardStats />

        {/* Main Dashboard Grid */}
        <div className="grid gap-4 lg:gap-6 grid-cols-1 lg:grid-cols-5">
          {/* Investment Chart - Takes up 4 columns on desktop, full width on mobile */}
          <div className="lg:col-span-4">
            <InvestmentChart />
          </div>
          
          {/* Quick Actions - Takes up 1 column on desktop, full width on mobile */}
          <div className="lg:col-span-1">
            <QuickActions />
          </div>
        </div>

        {/* Family Calendar */}
        <FamilyCalendar />

        {/* Recent Activities and Asset Allocation */}
        <div className="grid gap-4 lg:gap-6 grid-cols-1 lg:grid-cols-4">
          {/* Recent Activities - Takes up 3 columns on desktop, full width on mobile */}
          <div className="lg:col-span-3">
            <RecentActivities />
          </div>
          
          {/* Asset Allocation - Takes up 1 column on desktop, full width on mobile */}
          <div className="lg:col-span-1">
            <AssetAllocation />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;