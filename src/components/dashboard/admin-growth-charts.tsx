import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { supabase } from '@/integrations/supabase/client'
import { Loader2 } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { format, subDays, startOfYear, eachDayOfInterval, getDay } from 'date-fns'
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

interface GrowthData {
  date: string
  totalMembers: number
  activeMembers: number
}

interface ActivityDay {
  date: string
  count: number
  level: number
}

interface AdminGrowthChartsProps {
  programOnly?: boolean
}

export function AdminGrowthCharts({ programOnly = false }: AdminGrowthChartsProps) {
  const [growthData, setGrowthData] = useState<GrowthData[]>([])
  const [activityData, setActivityData] = useState<ActivityDay[]>([])
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState({
    currentTotal: 0,
    growth: 0,
    activeCount: 0,
    activePercent: 0
  })

  useEffect(() => {
    fetchData()
  }, [programOnly])

  const fetchData = async () => {
    try {
      setLoading(true)

      let profilesQuery = supabase
        .from('profiles')
        .select('user_id, created_at, program_name')
        .order('created_at', { ascending: true })

      if (programOnly) {
        profilesQuery = profilesQuery.not('program_name', 'is', null)
      }

      const { data: profiles } = await profilesQuery

      if (!profiles) { setLoading(false); return }

      const days = 30
      const today = new Date()
      const startDate = subDays(today, days)
      const yearStart = startOfYear(today)

      // Get the set of user IDs to filter by
      const programUserIds = new Set(profiles.map(p => p.user_id))

      const [
        { data: messages },
        { data: posts },
        { data: comments },
        { data: meetings }
      ] = await Promise.all([
        supabase.from('family_messages').select('sender_id, created_at').gte('created_at', format(yearStart, 'yyyy-MM-dd')),
        supabase.from('community_posts').select('user_id, created_at').gte('created_at', format(yearStart, 'yyyy-MM-dd')),
        supabase.from('community_comments').select('user_id, created_at').gte('created_at', format(yearStart, 'yyyy-MM-dd')),
        supabase.from('meetings').select('created_by, created_at').gte('created_at', format(yearStart, 'yyyy-MM-dd'))
      ])

      // Filter activity to program members if needed
      const filterByProgram = (items: any[] | null, userKey: string) => {
        if (!programOnly || !items) return items
        return items.filter(item => programUserIds.has(item[userKey]))
      }

      const filteredMessages = filterByProgram(messages, 'sender_id')
      const filteredPosts = filterByProgram(posts, 'user_id')
      const filteredComments = filterByProgram(comments, 'user_id')
      const filteredMeetings = filterByProgram(meetings, 'created_by')

      // Build activity map
      const activityByDate: Record<string, Set<string>> = {}
      const activityCountByDate: Record<string, number> = {}
      
      const addActivity = (items: any[] | null, userKey: string) => {
        items?.forEach(item => {
          const date = format(new Date(item.created_at), 'yyyy-MM-dd')
          if (!activityByDate[date]) activityByDate[date] = new Set()
          if (item[userKey]) activityByDate[date].add(item[userKey])
          activityCountByDate[date] = (activityCountByDate[date] || 0) + 1
        })
      }

      addActivity(messages, 'sender_id')
      addActivity(posts, 'user_id')
      addActivity(comments, 'user_id')
      addActivity(meetings, 'created_by')

      // Also count profiles created
      profiles?.forEach(p => {
        const date = format(new Date(p.created_at), 'yyyy-MM-dd')
        activityCountByDate[date] = (activityCountByDate[date] || 0) + 1
      })

      // Growth chart data (30 days)
      const chartData: GrowthData[] = []
      for (let i = days; i >= 0; i--) {
        const date = subDays(today, i)
        const dateStr = format(date, 'MMM dd')
        const dateKey = format(date, 'yyyy-MM-dd')
        const totalMembers = profiles.filter(p => new Date(p.created_at) <= date).length
        const activeMembers = activityByDate[dateKey]?.size || 0
        chartData.push({ date: dateStr, totalMembers, activeMembers })
      }

      // Summary
      const currentTotal = chartData[chartData.length - 1]?.totalMembers || 0
      const startTotal = chartData[0]?.totalMembers || 0
      const growth = currentTotal - startTotal
      const last7Days = chartData.slice(-7)
      const activeUserSet = new Set<string>()
      last7Days.forEach((_, idx) => {
        const dateKey = format(subDays(today, 6 - idx), 'yyyy-MM-dd')
        activityByDate[dateKey]?.forEach(userId => activeUserSet.add(userId))
      })
      const activeCount = activeUserSet.size
      const activePercent = currentTotal > 0 ? Math.round((activeCount / currentTotal) * 100) : 0

      setSummary({ currentTotal, growth, activeCount, activePercent })
      setGrowthData(chartData)

      // Activity heatmap data (year to date)
      const allDays = eachDayOfInterval({ start: yearStart, end: today })
      const maxCount = Math.max(...Object.values(activityCountByDate), 1)
      const heatmapData = allDays.map(date => {
        const dateStr = format(date, 'yyyy-MM-dd')
        const count = activityCountByDate[dateStr] || 0
        return { date: dateStr, count, level: count === 0 ? 0 : Math.ceil((count / maxCount) * 4) }
      })
      setActivityData(heatmapData)
    } catch (error) {
      console.error('Error fetching growth data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center py-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
  }

  // Heatmap weeks
  const weeks: ActivityDay[][] = []
  let currentWeek: ActivityDay[] = []
  if (activityData[0]) {
    const firstDayOfWeek = getDay(new Date(activityData[0].date))
    for (let i = 0; i < firstDayOfWeek; i++) {
      currentWeek.push({ date: '', count: 0, level: 0 })
    }
  }
  activityData.forEach(day => {
    const dayOfWeek = getDay(new Date(day.date))
    if (dayOfWeek === 0 && currentWeek.length > 0) {
      weeks.push([...currentWeek])
      currentWeek = []
    }
    currentWeek.push(day)
  })
  if (currentWeek.length > 0) weeks.push(currentWeek)

  const getLevelColor = (level: number) => {
    switch (level) {
      case 0: return undefined
      case 1: return '#6215c8'
      case 2: return '#964a86'
      case 3: return '#ca7f44'
      case 4: return '#ffb500'
      default: return undefined
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Members Growth & Activity</CardTitle>
          <CardDescription>
            {summary.currentTotal} total members{summary.growth > 0 ? ` (+${summary.growth} in 30d)` : ''}, {summary.activeCount} active ({summary.activePercent}%) in last 7 days
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          {/* Combined Chart */}
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={growthData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} interval={4} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} />
              <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
              <Legend />
              <Line type="monotone" dataKey="totalMembers" name="Total Members" stroke="hsl(280 100% 60%)" strokeWidth={3} dot={false} style={{ filter: 'drop-shadow(0 0 12px hsl(280 100% 60% / 0.8))' }} />
              <Line type="monotone" dataKey="activeMembers" name="Active Members" stroke="hsl(180 100% 50%)" strokeWidth={3} dot={false} style={{ filter: 'drop-shadow(0 0 12px hsl(180 100% 50% / 0.8))' }} />
            </LineChart>
          </ResponsiveContainer>

          {/* Activity Heatmap */}
          <div>
            <h4 className="text-sm font-medium mb-4">Daily Activity Heatmap</h4>
            <div className="overflow-x-auto">
              <div className="inline-flex gap-1">
                <div className="flex flex-col gap-1 text-xs text-muted-foreground pr-2 pt-4">
                  {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => <div key={d} className="h-3">{d}</div>)}
                </div>
                <div>
                  <div className="relative flex text-xs text-muted-foreground mb-1 h-4" style={{ width: `${weeks.length * 16}px` }}>
                    {weeks.map((week, i) => {
                      if (!week[0]?.date) return null
                      const currentMonth = format(new Date(week[0].date), 'MMM')
                      const previousMonth = i > 0 && weeks[i - 1]?.[0]?.date ? format(new Date(weeks[i - 1][0].date), 'MMM') : null
                      if (i === 0 || currentMonth !== previousMonth) {
                        return <div key={i} className="absolute text-xs" style={{ left: `${i * 16}px` }}>{currentMonth}</div>
                      }
                      return null
                    })}
                  </div>
                  <TooltipProvider>
                    <div className="flex gap-1">
                      {weeks.map((week, wi) => (
                        <div key={wi} className="flex flex-col gap-1">
                          {week.map((day, di) => (
                            <UITooltip key={`${wi}-${di}`}>
                              <TooltipTrigger asChild>
                                <div
                                  className={`w-3 h-3 rounded-sm ${!day.date ? 'bg-transparent' : day.level === 0 ? 'bg-muted' : ''}`}
                                  style={day.date && day.level > 0 ? { backgroundColor: getLevelColor(day.level) } : undefined}
                                />
                              </TooltipTrigger>
                              {day.date && (
                                <TooltipContent>
                                  <div className="text-xs">
                                    <div className="font-medium">{format(new Date(day.date), 'MMM d, yyyy')}</div>
                                    <div className="text-muted-foreground">{day.count} activities</div>
                                  </div>
                                </TooltipContent>
                              )}
                            </UITooltip>
                          ))}
                        </div>
                      ))}
                    </div>
                  </TooltipProvider>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-4 text-xs text-muted-foreground">
                <span>Less</span>
                {[0, 1, 2, 3, 4].map(level => (
                  <div key={level} className={`w-3 h-3 rounded-sm ${level === 0 ? 'bg-muted' : ''}`}
                    style={level > 0 ? { backgroundColor: getLevelColor(level) } : undefined} />
                ))}
                <span>More</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
