import { useState } from 'react'
import { NavHeader } from "@/components/dashboard/nav-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { TrendingUp, Users, BookOpen, MessageSquare, Plus } from "lucide-react"
import { InvestmentIntegrationDialog } from "@/components/dashboard/investment-integration-dialog"

const Community = () => {
  const [investmentIntegrationOpen, setInvestmentIntegrationOpen] = useState(false)

  const communityActions = [
    {
      title: "Add Investment",
      description: "Connect financial accounts",
      icon: TrendingUp,
      variant: "premium" as const,
      action: () => setInvestmentIntegrationOpen(true)
    },
    {
      title: "Join Discussion",
      description: "Participate in community discussions",
      icon: MessageSquare,
      variant: "default" as const,
      action: () => console.log("Join discussion")
    },
    {
      title: "Share Resources",
      description: "Share helpful resources with the community",
      icon: BookOpen,
      variant: "secondary" as const,
      action: () => console.log("Share resources")
    },
    {
      title: "Connect Members",
      description: "Network with other family office members",
      icon: Users,
      variant: "default" as const,
      action: () => console.log("Connect members")
    }
  ]

  return (
    <div className="min-h-screen bg-background">
      <NavHeader />
      
      <main className="container mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6 max-w-full overflow-hidden">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground">
              Community Hub
            </h1>
            <p className="text-muted-foreground mt-1 text-sm sm:text-base">
              Connect, collaborate, and grow with fellow family office members
            </p>
          </div>
        </div>

        {/* Community Actions Grid */}
        <div className="grid gap-3 sm:gap-4 lg:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {communityActions.map((action) => {
            const Icon = action.icon
            
            return (
              <Card key={action.title} className="hover:shadow-lg transition-all duration-200 hover:scale-[1.02]">
                <CardHeader className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{action.title}</CardTitle>
                      <CardDescription className="text-sm">
                        {action.description}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <Button
                    variant={action.variant}
                    className="w-full"
                    onClick={() => action.action()}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Get Started
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Community Features */}
        <div className="grid gap-4 md:gap-6 grid-cols-1 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Recent Discussions
              </CardTitle>
              <CardDescription>
                Join ongoing conversations with community members
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="p-3 rounded-lg border bg-muted/50">
                  <p className="font-medium text-sm">Investment Strategies for 2024</p>
                  <p className="text-xs text-muted-foreground mt-1">12 members • 45 minutes ago</p>
                </div>
                <div className="p-3 rounded-lg border bg-muted/50">
                  <p className="font-medium text-sm">Estate Planning Best Practices</p>
                  <p className="text-xs text-muted-foreground mt-1">8 members • 2 hours ago</p>
                </div>
                <div className="p-3 rounded-lg border bg-muted/50">
                  <p className="font-medium text-sm">Tax Optimization Techniques</p>
                  <p className="text-xs text-muted-foreground mt-1">15 members • 5 hours ago</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Active Members
              </CardTitle>
              <CardDescription>
                Connect with other family office professionals
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/50">
                  <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                    JS
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">John Smith</p>
                    <p className="text-xs text-muted-foreground">Family Office Director</p>
                  </div>
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/50">
                  <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                    MJ
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">Mary Johnson</p>
                    <p className="text-xs text-muted-foreground">Investment Advisor</p>
                  </div>
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/50">
                  <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                    RD
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">Robert Davis</p>
                    <p className="text-xs text-muted-foreground">Estate Planner</p>
                  </div>
                  <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Investment Integration Dialog */}
      <InvestmentIntegrationDialog 
        open={investmentIntegrationOpen} 
        onOpenChange={setInvestmentIntegrationOpen} 
      />
      
      {/* Mobile Bottom Navigation */}
      <div className="pb-16 md:pb-0" />
    </div>
  )
}

export default Community