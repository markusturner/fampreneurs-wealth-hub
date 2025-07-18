import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, TrendingDown, DollarSign, PieChart, Users, FileText, ArrowUpRight, ArrowDownRight, UserPlus } from "lucide-react"
import { useEffect, useState } from "react"
import { supabase } from "@/integrations/supabase/client"


export function DashboardStats() {
  const [documentCount, setDocumentCount] = useState(0)
  const [financialAdvisorCount, setFinancialAdvisorCount] = useState(0)
  const [familyMemberCount, setFamilyMemberCount] = useState(0)

  useEffect(() => {
    const fetchCounts = async () => {
      // Fetch document count
      const { count: docCount, error: docError } = await supabase
        .from('family_documents')
        .select('*', { count: 'exact', head: true })
      
      if (!docError && docCount !== null) {
        setDocumentCount(docCount)
      }

      // Fetch financial advisor count
      const { count: advisorCount, error: advisorError } = await supabase
        .from('financial_advisors')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true)
      
      if (!advisorError && advisorCount !== null) {
        setFinancialAdvisorCount(advisorCount)
      }

      // Fetch family member count
      const { count: familyCount, error: familyError } = await supabase
        .from('family_members')
        .select('*', { count: 'exact', head: true })
        .neq('status', 'inactive')
      
      if (!familyError && familyCount !== null) {
        setFamilyMemberCount(familyCount)
      }
    }

    fetchCounts()
  }, [])

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
      title: "Financial Advisors",
      value: financialAdvisorCount.toString(),
      change: financialAdvisorCount > 0 ? "+1" : "0",
      trend: "up",
      icon: Users,
      description: "Active team members"
    },
    {
      title: "Family Members",
      value: familyMemberCount.toString(),
      change: familyMemberCount > 0 ? "+1" : "0",
      trend: "up",
      icon: UserPlus,
      description: "Family network"
    },
    {
      title: "Family Documents",
      value: documentCount.toString(),
      change: documentCount > 0 ? "+5" : "0",
      trend: "up",
      icon: FileText,
      description: "Managed documents"
    }
  ]
  return (
    <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5">
      {stats.map((stat) => {
        const Icon = stat.icon
        const TrendIcon = stat.trend === "up" ? ArrowUpRight : ArrowDownRight
        
        return (
          <Card key={stat.title} className="shadow-soft hover:shadow-medium transition-smooth">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-6">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <Icon className="h-4 w-4 text-primary flex-shrink-0" />
            </CardHeader>
            <CardContent className="p-3 sm:p-6 pt-0">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="text-xl sm:text-2xl font-bold text-foreground truncate">
                    {stat.value}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 leading-tight">
                    {stat.description}
                  </p>
                </div>
                <Badge 
                  variant={stat.trend === "up" ? "default" : "destructive"} 
                  className={`ml-2 flex-shrink-0 ${stat.trend === "up" ? "bg-accent text-accent-foreground" : ""}`}
                >
                  <TrendIcon className="h-3 w-3 mr-1" />
                  <span className="text-xs">{stat.change}</span>
                </Badge>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}