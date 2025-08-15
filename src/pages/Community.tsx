import { useState } from 'react'
import { NavHeader } from "@/components/dashboard/nav-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { TrendingUp, Users, BookOpen, MessageSquare, Plus } from "lucide-react"
import { InvestmentIntegrationDialog } from "@/components/dashboard/investment-integration-dialog"

const Community = () => {
  const [investmentIntegrationOpen, setInvestmentIntegrationOpen] = useState(false)

  const investmentAction = {
    title: "Add Investment",
    description: "Connect financial accounts",
    icon: TrendingUp,
    variant: "premium" as const,
    action: () => setInvestmentIntegrationOpen(true)
  }

  return (
    <div className="min-h-screen bg-background">
      <NavHeader />
      
      <main className="container mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6 max-w-full overflow-hidden">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground">
              Investments
            </h1>
            <p className="text-muted-foreground mt-1 text-sm sm:text-base">
              Connect and manage your financial accounts
            </p>
          </div>
        </div>

        {/* Investment Section */}
        <div className="max-w-md mx-auto">
          <Card className="hover:shadow-lg transition-all duration-200 hover:scale-[1.02]">
            <CardHeader className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <TrendingUp className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">{investmentAction.title}</CardTitle>
                  <CardDescription className="text-sm">
                    {investmentAction.description}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <Button
                variant={investmentAction.variant}
                className="w-full"
                onClick={() => investmentAction.action()}
              >
                <Plus className="h-4 w-4 mr-2" />
                Get Started
              </Button>
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