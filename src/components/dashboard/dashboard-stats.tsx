import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, TrendingDown, DollarSign, PieChart, Users, FileText, ArrowUpRight, ArrowDownRight } from "lucide-react"

const stats = [
  {
    title: "Total Portfolio Value",
    value: "$12,450,000",
    change: "+8.2%",
    trend: "up",
    icon: DollarSign,
    description: "Since yesterday"
  },
  {
    title: "Active Investments",
    value: "47",
    change: "+2",
    trend: "up", 
    icon: PieChart,
    description: "New positions this week"
  },
  {
    title: "Team Members",
    value: "12",
    change: "+1",
    trend: "up",
    icon: Users,
    description: "Financial advisors"
  },
  {
    title: "Family Documents",
    value: "234",
    change: "+5",
    trend: "up",
    icon: FileText,
    description: "Managed documents"
  }
]

export function DashboardStats() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => {
        const Icon = stat.icon
        const TrendIcon = stat.trend === "up" ? ArrowUpRight : ArrowDownRight
        
        return (
          <Card key={stat.title} className="shadow-soft hover:shadow-medium transition-smooth">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <Icon className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-foreground">
                    {stat.value}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {stat.description}
                  </p>
                </div>
                <Badge 
                  variant={stat.trend === "up" ? "default" : "destructive"} 
                  className={stat.trend === "up" ? "bg-accent text-accent-foreground" : ""}
                >
                  <TrendIcon className="h-3 w-3 mr-1" />
                  {stat.change}
                </Badge>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}