import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { supabase } from '@/integrations/supabase/client'
import { Loader2 } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { format, subDays } from 'date-fns'

interface GrowthData {
  date: string
  totalMembers: number
  activeMembers: number
}

export function AdminGrowthCharts() {
  const [growthData, setGrowthData] = useState<GrowthData[]>([])
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState({
    currentTotal: 0,
    growth: 0,
    activeCount: 0,
    activePercent: 0
  })

  useEffect(() => {
    fetchGrowthData()
  }, [])

  const fetchGrowthData = async () => {
    try {
      setLoading(true)

      // Get all profiles with creation dates
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, created_at')
        .order('created_at', { ascending: true })

      if (!profiles) {
        setLoading(false)
        return
      }

      // Generate data for last 30 days
      const days = 30
      const chartData: GrowthData[] = []
      const today = new Date()
      const startDate = subDays(today, days)

      // Get all activity data from multiple sources
      const [
        { data: messages },
        { data: posts },
        { data: comments },
        { data: meetings }
      ] = await Promise.all([
        supabase
          .from('family_messages')
          .select('sender_id, created_at')
          .gte('created_at', format(startDate, 'yyyy-MM-dd')),
        supabase
          .from('community_posts')
          .select('user_id, created_at')
          .gte('created_at', format(startDate, 'yyyy-MM-dd')),
        supabase
          .from('community_comments')
          .select('user_id, created_at')
          .gte('created_at', format(startDate, 'yyyy-MM-dd')),
        supabase
          .from('meetings')
          .select('created_by, created_at')
          .gte('created_at', format(startDate, 'yyyy-MM-dd'))
      ])

      // Build activity map by date and user
      const activityByDate: Record<string, Set<string>> = {}
      
      messages?.forEach(m => {
        const date = format(new Date(m.created_at), 'yyyy-MM-dd')
        if (!activityByDate[date]) activityByDate[date] = new Set()
        activityByDate[date].add(m.sender_id)
      })
      
      posts?.forEach(p => {
        const date = format(new Date(p.created_at), 'yyyy-MM-dd')
        if (!activityByDate[date]) activityByDate[date] = new Set()
        activityByDate[date].add(p.user_id)
      })
      
      comments?.forEach(c => {
        const date = format(new Date(c.created_at), 'yyyy-MM-dd')
        if (!activityByDate[date]) activityByDate[date] = new Set()
        activityByDate[date].add(c.user_id)
      })
      
      meetings?.forEach(m => {
        const date = format(new Date(m.created_at), 'yyyy-MM-dd')
        if (!activityByDate[date]) activityByDate[date] = new Set()
        if (m.created_by) activityByDate[date].add(m.created_by)
      })

      for (let i = days; i >= 0; i--) {
        const date = subDays(today, i)
        const dateStr = format(date, 'MMM dd')
        const dateKey = format(date, 'yyyy-MM-dd')
        
        // Count total members up to this date
        const totalMembers = profiles.filter(p => 
          new Date(p.created_at) <= date
        ).length

        // Count active members for this specific date
        const activeMembers = activityByDate[dateKey]?.size || 0

        chartData.push({
          date: dateStr,
          totalMembers,
          activeMembers
        })
      }

      // Calculate summary stats
      const currentTotal = chartData[chartData.length - 1]?.totalMembers || 0
      const startTotal = chartData[0]?.totalMembers || 0
      const growth = currentTotal - startTotal
      
      // Active users in the last 7 days
      const last7Days = chartData.slice(-7)
      const activeUserSet = new Set<string>()
      last7Days.forEach(day => {
        const dateKey = format(subDays(today, chartData.length - 1 - chartData.indexOf(day)), 'yyyy-MM-dd')
        activityByDate[dateKey]?.forEach(userId => activeUserSet.add(userId))
      })
      
      const activeCount = activeUserSet.size
      const activePercent = currentTotal > 0 ? Math.round((activeCount / currentTotal) * 100) : 0

      setSummary({
        currentTotal,
        growth,
        activeCount,
        activePercent
      })
      setGrowthData(chartData)
    } catch (error) {
      console.error('Error fetching growth data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Member Growth</CardTitle>
          <CardDescription>
            In the past 30 days, your platform grew to {summary.currentTotal} members 
            {summary.growth > 0 ? ` (+${summary.growth})` : ''} and {summary.activeCount} members 
            ({summary.activePercent}%) were active.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          {/* Total Members Chart */}
          <div>
            <h4 className="text-sm font-medium mb-4">Total members</h4>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={growthData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="date" 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickLine={false}
                  interval={4}
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickLine={false}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="totalMembers" 
                  stroke="hsl(280 100% 60%)" 
                  strokeWidth={3}
                  dot={false}
                  style={{ filter: 'drop-shadow(0 0 12px hsl(280 100% 60% / 0.8))' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Active Members Chart */}
          <div>
            <h4 className="text-sm font-medium mb-4">Active members</h4>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={growthData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="date" 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickLine={false}
                  interval={4}
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickLine={false}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="activeMembers" 
                  stroke="hsl(180 100% 50%)" 
                  strokeWidth={3}
                  dot={false}
                  style={{ filter: 'drop-shadow(0 0 12px hsl(180 100% 50% / 0.8))' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
