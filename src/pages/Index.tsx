import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { NavHeader } from "@/components/dashboard/nav-header"
import { DashboardStats } from "@/components/dashboard/dashboard-stats"
import { InvestmentChart } from "@/components/dashboard/investment-chart"
import { RecentActivities } from "@/components/dashboard/recent-activities"
import { QuickActions } from "@/components/dashboard/quick-actions"
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
    }
  }, [user, loading, navigate])

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
      
      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Welcome Section */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Welcome back, {displayName}
            </h1>
            <p className="text-muted-foreground mt-1">
              Here's what's happening with your family office today
            </p>
          </div>
          <Button variant="premium" size="lg" className="hidden md:flex">
            Schedule Meeting
          </Button>
        </div>

        {/* Key Metrics */}
        <DashboardStats />

        {/* Main Dashboard Grid */}
        <div className="grid gap-6 lg:grid-cols-5">
          {/* Investment Chart - Takes up 4 columns */}
          <InvestmentChart />
          
          {/* Quick Actions - Takes up 1 column */}
          <QuickActions />
        </div>

        {/* Family Calendar */}
        <FamilyCalendar />

        {/* Recent Activities */}
        <div className="grid gap-6 lg:grid-cols-4">
          <RecentActivities />
          
          {/* Asset Allocation Card */}
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle className="text-lg font-bold">Asset Allocation</CardTitle>
              <CardDescription>
                Current portfolio distribution
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Equities</span>
                  <span className="text-sm text-muted-foreground">65%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div className="bg-primary h-2 rounded-full" style={{ width: "65%" }}></div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Bonds</span>
                  <span className="text-sm text-muted-foreground">20%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div className="bg-accent h-2 rounded-full" style={{ width: "20%" }}></div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Real Estate</span>
                  <span className="text-sm text-muted-foreground">10%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div className="bg-secondary h-2 rounded-full" style={{ width: "10%" }}></div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Alternatives</span>
                  <span className="text-sm text-muted-foreground">5%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div className="bg-muted-foreground h-2 rounded-full" style={{ width: "5%" }}></div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Index;
