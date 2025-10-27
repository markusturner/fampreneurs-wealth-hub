import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { supabase } from '@/integrations/supabase/client'
import { Loader2 } from 'lucide-react'
import { format, startOfYear, eachDayOfInterval, getDay } from 'date-fns'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

interface ActivityDay {
  date: string
  count: number
  level: number
}

export function AdminActivityHeatmap() {
  const [activityData, setActivityData] = useState<ActivityDay[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchActivityData()
  }, [])

  const fetchActivityData = async () => {
    try {
      setLoading(true)

      const startDate = startOfYear(new Date())
      const today = new Date()

      // Get all activity from multiple sources
      const [
        { data: messages },
        { data: meetings },
        { data: posts },
        { data: comments },
        { data: profiles },
        { data: documents }
      ] = await Promise.all([
        supabase
          .from('family_messages')
          .select('created_at')
          .gte('created_at', format(startDate, 'yyyy-MM-dd')),
        supabase
          .from('meetings')
          .select('created_at')
          .gte('created_at', format(startDate, 'yyyy-MM-dd')),
        supabase
          .from('community_posts')
          .select('created_at')
          .gte('created_at', format(startDate, 'yyyy-MM-dd')),
        supabase
          .from('community_comments')
          .select('created_at')
          .gte('created_at', format(startDate, 'yyyy-MM-dd')),
        supabase
          .from('profiles')
          .select('created_at')
          .gte('created_at', format(startDate, 'yyyy-MM-dd')),
        supabase
          .from('family_documents')
          .select('created_at')
          .gte('created_at', format(startDate, 'yyyy-MM-dd'))
      ])

      // Count activity per day
      const activityCount: Record<string, number> = {}
      
      const addActivity = (items: any[] | null) => {
        items?.forEach(item => {
          const date = format(new Date(item.created_at), 'yyyy-MM-dd')
          activityCount[date] = (activityCount[date] || 0) + 1
        })
      }

      addActivity(messages)
      addActivity(meetings)
      addActivity(posts)
      addActivity(comments)
      addActivity(profiles)
      addActivity(documents)

      // Get max count for normalization
      const maxCount = Math.max(...Object.values(activityCount), 1)

      // Generate all days in the range
      const days = eachDayOfInterval({ start: startDate, end: today })
      const heatmapData = days.map(date => {
        const dateStr = format(date, 'yyyy-MM-dd')
        const count = activityCount[dateStr] || 0
        return {
          date: dateStr,
          count,
          level: count === 0 ? 0 : Math.ceil((count / maxCount) * 4)
        }
      })

      setActivityData(heatmapData)
    } catch (error) {
      console.error('Error fetching activity data:', error)
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

  // Group by weeks and days of week
  const weeks: ActivityDay[][] = []
  let currentWeek: ActivityDay[] = []
  
  // Add padding for first week
  const firstDay = activityData[0]
  if (firstDay) {
    const firstDayOfWeek = getDay(new Date(firstDay.date))
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
  
  if (currentWeek.length > 0) {
    weeks.push(currentWeek)
  }

  const getLevelColor = (level: number) => {
    switch (level) {
      case 0: return 'bg-muted'
      case 1: return 'bg-primary/20'
      case 2: return 'bg-primary/40'
      case 3: return 'bg-primary/60'
      case 4: return 'bg-primary/80'
      default: return 'bg-muted'
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Daily Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <div className="inline-flex gap-1">
            <div className="flex flex-col gap-1 text-xs text-muted-foreground pr-2 pt-4">
              <div className="h-3">Mon</div>
              <div className="h-3">Wed</div>
              <div className="h-3">Fri</div>
              <div className="h-3">Sun</div>
            </div>
            <div>
              {/* Month labels */}
              <div className="flex gap-1 text-xs text-muted-foreground mb-1 h-4">
                {weeks.map((week, i) => {
                  if (week[0]?.date && i % 4 === 0) {
                    return (
                      <div key={i} className="w-3" style={{ marginLeft: i === 0 ? 0 : '12px' }}>
                        {format(new Date(week[0].date), 'MMM')}
                      </div>
                    )
                  }
                  return null
                })}
              </div>
              {/* Heatmap grid */}
              <TooltipProvider>
                <div className="flex gap-1">
                  {weeks.map((week, weekIndex) => (
                    <div key={weekIndex} className="flex flex-col gap-1">
                      {week.map((day, dayIndex) => (
                        <Tooltip key={`${weekIndex}-${dayIndex}`}>
                          <TooltipTrigger asChild>
                            <div 
                              className={`w-3 h-3 rounded-sm ${day.date ? getLevelColor(day.level) : 'bg-transparent'}`}
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
                        </Tooltip>
                      ))}
                    </div>
                  ))}
                </div>
              </TooltipProvider>
            </div>
          </div>
          {/* Legend */}
          <div className="flex items-center gap-2 mt-4 text-xs text-muted-foreground">
            <span>Less</span>
            {[0, 1, 2, 3, 4].map(level => (
              <div key={level} className={`w-3 h-3 rounded-sm ${getLevelColor(level)}`} />
            ))}
            <span>More</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
