import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, Calendar, CheckCircle, Clock, AlertTriangle, TrendingUp, TrendingDown, BarChart3 } from 'lucide-react'
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/ui/app-sidebar"

const Index = () => {
  const { user, profile, loading } = useAuth()
  const navigate = useNavigate()

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

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const currentMonth = new Date().getMonth()

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gray-50">
        <AppSidebar />
        
        <main className="flex-1 overflow-auto">
          {/* Header */}
          <div className="bg-white border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <SidebarTrigger />
                <h1 className="text-2xl font-semibold text-gray-900">Overview</h1>
              </div>
              <div className="flex items-center gap-4">
                <Select defaultValue="jan-aug-2025">
                  <SelectTrigger className="w-48">
                    <Calendar className="h-4 w-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="jan-aug-2025">Jan 01, 2025 — Aug 14, 2025</SelectItem>
                    <SelectItem value="2024">Full Year 2024</SelectItem>
                    <SelectItem value="q1-2025">Q1 2025</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm">
                  <Calendar className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Bookkeeping Status */}
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg font-semibold">Bookkeeping Status</CardTitle>
                    <CardDescription>See progress towards your tax-ready books</CardDescription>
                  </div>
                  <Badge variant="secondary" className="bg-blue-600 text-white">
                    2025 <CheckCircle className="h-3 w-3 ml-1" />
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {/* Monthly Progress */}
                <div className="grid grid-cols-12 gap-2 mb-6">
                  {months.map((month, index) => (
                    <div key={month} className="text-center">
                      <div className="text-xs text-gray-500 mb-2">{month}</div>
                      <div className={`w-8 h-8 mx-auto rounded-full flex items-center justify-center ${
                        index <= currentMonth 
                          ? index <= 6 ? 'bg-green-100 border-2 border-green-500' : 'bg-blue-100 border-2 border-blue-500'
                          : 'bg-gray-100 border-2 border-gray-300'
                      }`}>
                        {index <= currentMonth && (
                          <CheckCircle className={`h-4 w-4 ${
                            index <= 6 ? 'text-green-500' : 'text-blue-500'
                          }`} />
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Status Legend */}
                <div className="grid grid-cols-4 gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <span className="text-sm text-gray-600">Tax-Ready</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="text-sm text-gray-600">Books Reviewed</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-300 rounded-full"></div>
                    <span className="text-sm text-gray-600">In Progress</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                    <span className="text-sm text-gray-600">Your Input Needed</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Your Snapshots */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Snapshots</h2>
            </div>

            {/* Profit & Loss */}
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-lg font-semibold">Profit & Loss</CardTitle>
                    <Button variant="ghost" size="sm" className="p-1">
                      <AlertTriangle className="h-4 w-4 text-gray-400" />
                    </Button>
                  </div>
                  <Button variant="outline" size="sm">
                    SEE DETAILS →
                  </Button>
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    Jan 1, 2025 to Aug 14, 2025
                  </span>
                  <span>Group by Month</span>
                </div>
              </CardHeader>
              <CardContent>
                {/* Financial Metrics */}
                <div className="grid grid-cols-3 gap-6 mb-8">
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 mb-2">
                      <div className="w-3 h-3 bg-green-500 rounded"></div>
                      <span className="text-sm text-gray-600">Total Revenue</span>
                    </div>
                    <div className="text-2xl font-bold text-gray-900">$55,937.02</div>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 mb-2">
                      <div className="w-3 h-3 bg-gray-500 rounded"></div>
                      <span className="text-sm text-gray-600">Total Expenses</span>
                    </div>
                    <div className="text-2xl font-bold text-gray-900">$39,231.64</div>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 mb-2">
                      <TrendingUp className="w-4 h-4 text-blue-600" />
                      <span className="text-sm text-gray-600">Net Profit</span>
                    </div>
                    <div className="text-2xl font-bold text-blue-600">$16,705.38</div>
                  </div>
                </div>

                {/* Chart Placeholder */}
                <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-200">
                  <div className="text-center text-gray-500">
                    <BarChart3 className="h-8 w-8 mx-auto mb-2" />
                    <p className="text-sm">Profit & Loss Chart</p>
                    <p className="text-xs">Chart visualization would be displayed here</p>
                  </div>
                </div>

                {/* Chart Footer */}
                <div className="mt-4 flex items-center justify-center gap-4 text-xs text-gray-500">
                  <div className="flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    <span>Contains incomplete books</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </SidebarProvider>
  )
}

export default Index
