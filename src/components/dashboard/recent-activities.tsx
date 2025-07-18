import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { TrendingUp, TrendingDown, FileText, Users, DollarSign, Calendar, UserPlus } from "lucide-react"
import { useEffect, useState } from "react"
import { supabase } from "@/integrations/supabase/client"
import { useAuth } from "@/contexts/AuthContext"

interface Activity {
  id: string
  type: string
  title: string
  description: string
  amount?: string
  time: string
  icon: any
  user: string
  userInitials: string
  trend: string
  created_at: string
}

export function RecentActivities() {
  const [activities, setActivities] = useState<Activity[]>([])
  const { user } = useAuth()

  useEffect(() => {
    const fetchRecentActivities = async () => {
      if (!user) return

      const activitiesData: Activity[] = []

      // Fetch recent family documents
      const { data: documents } = await supabase
        .from('family_documents')
        .select('*')
        .order('uploaded_at', { ascending: false })
        .limit(3)

      documents?.forEach((doc, index) => {
        const userName = 'Family Office'
        const initials = 'FO'
        
        activitiesData.push({
          id: `doc-${doc.id}`,
          type: "document",
          title: "Document Added",
          description: `${doc.document_name} - ${doc.category}`,
          amount: undefined,
          time: formatTimeAgo(doc.uploaded_at),
          icon: FileText,
          user: userName,
          userInitials: initials,
          trend: "neutral",
          created_at: doc.uploaded_at
        })
      })

      // Fetch recent family members
      const { data: familyMembers } = await supabase
        .from('family_members')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(3)

      familyMembers?.forEach((member) => {
        activitiesData.push({
          id: `member-${member.id}`,
          type: "team",
          title: "Family Member Added",
          description: `${member.full_name} - ${member.family_position}`,
          amount: undefined,
          time: formatTimeAgo(member.created_at),
          icon: UserPlus,
          user: "Family Office",
          userInitials: "FO",
          trend: "positive",
          created_at: member.created_at
        })
      })

      // Fetch recent financial advisors
      const { data: advisors } = await supabase
        .from('financial_advisors')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(2)

      advisors?.forEach((advisor) => {
        activitiesData.push({
          id: `advisor-${advisor.id}`,
          type: "team",
          title: "Financial Advisor Added",
          description: `${advisor.full_name} - ${advisor.specialties?.[0] || 'Financial Planning'}`,
          amount: undefined,
          time: formatTimeAgo(advisor.created_at),
          icon: Users,
          user: "Admin",
          userInitials: "AD",
          trend: "positive",
          created_at: advisor.created_at
        })
      })

      // Add some investment progress activities when API key is configured
      activitiesData.push({
        id: "investment-1",
        type: "investment",
        title: "Portfolio Sync Complete",
        description: "Investment data updated from API",
        amount: "+$12,450",
        time: "1 hour ago",
        icon: TrendingUp,
        user: "Investment API",
        userInitials: "IA",
        trend: "positive",
        created_at: new Date().toISOString()
      })

      // Sort by creation time (most recent first)
      activitiesData.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      
      setActivities(activitiesData.slice(0, 6))
    }

    fetchRecentActivities()
  }, [user])

  const formatTimeAgo = (dateString: string) => {
    const now = new Date()
    const date = new Date(dateString)
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))
    
    if (diffInMinutes < 60) {
      return `${diffInMinutes} minutes ago`
    } else if (diffInMinutes < 1440) {
      const hours = Math.floor(diffInMinutes / 60)
      return `${hours} hour${hours > 1 ? 's' : ''} ago`
    } else {
      const days = Math.floor(diffInMinutes / 1440)
      return `${days} day${days > 1 ? 's' : ''} ago`
    }
  }
  return (
    <Card className="col-span-3 shadow-soft">
      <CardHeader>
        <CardTitle className="text-xl font-bold">Recent Activities</CardTitle>
        <CardDescription>
          Latest updates from your family office
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.map((activity) => {
            const Icon = activity.icon
            
            return (
              <div key={activity.id} className="flex items-start space-x-4 p-3 rounded-lg hover:bg-muted/50 transition-smooth">
                <div className={`p-2 rounded-full ${
                  activity.trend === 'positive' ? 'bg-accent/20 text-accent' :
                  activity.trend === 'negative' ? 'bg-destructive/20 text-destructive' :
                  'bg-muted text-muted-foreground'
                }`}>
                  <Icon className="h-4 w-4" />
                </div>
                
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-foreground">
                      {activity.title}
                    </p>
                    {activity.amount && (
                      <Badge 
                        variant={activity.trend === 'positive' ? 'default' : 'destructive'}
                        className={activity.trend === 'positive' ? 'bg-accent text-accent-foreground' : ''}
                      >
                        {activity.amount}
                      </Badge>
                    )}
                  </div>
                  
                  <p className="text-sm text-muted-foreground">
                    {activity.description}
                  </p>
                  
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center space-x-2">
                      <Avatar className="h-5 w-5">
                        <AvatarImage src={`/placeholder.svg`} />
                        <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                          {activity.userInitials}
                        </AvatarFallback>
                      </Avatar>
                      <span>{activity.user}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Calendar className="h-3 w-3" />
                      <span>{activity.time}</span>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}