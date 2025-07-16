import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { TrendingUp, TrendingDown, FileText, Users, DollarSign, Calendar } from "lucide-react"

const activities = [
  {
    id: 1,
    type: "investment",
    title: "New Investment Added",
    description: "Tesla Inc. (TSLA) - 500 shares",
    amount: "+$125,000",
    time: "2 hours ago",
    icon: TrendingUp,
    user: "Sarah Chen",
    userInitials: "SC",
    trend: "positive"
  },
  {
    id: 2,
    type: "document",
    title: "Trust Document Updated",
    description: "Family Trust Agreement v3.2 uploaded",
    amount: null,
    time: "4 hours ago",
    icon: FileText,
    user: "Marcus Rodriguez",
    userInitials: "MR",
    trend: "neutral"
  },
  {
    id: 3,
    type: "team",
    title: "New Team Member Added",
    description: "Financial Advisor - Private Equity",
    amount: null,
    time: "1 day ago",
    icon: Users,
    user: "Alexandra Kim",
    userInitials: "AK",
    trend: "positive"
  },
  {
    id: 4,
    type: "transaction",
    title: "Dividend Received",
    description: "Apple Inc. quarterly dividend",
    amount: "+$8,400",
    time: "2 days ago",
    icon: DollarSign,
    user: "System",
    userInitials: "SY",
    trend: "positive"
  },
  {
    id: 5,
    type: "investment",
    title: "Position Reduced",
    description: "Microsoft Corp. (MSFT) - 200 shares sold",
    amount: "-$75,000",
    time: "3 days ago",
    icon: TrendingDown,
    user: "Sarah Chen",
    userInitials: "SC",
    trend: "negative"
  }
]

export function RecentActivities() {
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