import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, Upload, UserPlus, Banknote, FileText, Settings, TrendingUp, Shield } from "lucide-react"

const quickActions = [
  {
    title: "Add Investment",
    description: "create to investment",
    icon: TrendingUp,
    variant: "premium" as const,
    action: () => console.log("Add investment")
  },
  {
    title: "Upload Document",
    description: "Add trust or legal documents",
    icon: Upload,
    variant: "default" as const,
    action: () => console.log("Upload document")
  },
  {
    title: "Add Team Member",
    description: "Invite financial advisor",
    icon: UserPlus,
    variant: "default" as const,
    action: () => console.log("Add team member")
  },
  {
    title: "Record Transaction",
    description: "Log financial transaction",
    icon: Banknote,
    variant: "default" as const,
    action: () => console.log("Record transaction")
  },
  {
    title: "Generate Report",
    description: "Create performance report",
    icon: FileText,
    variant: "secondary" as const,
    action: () => console.log("Generate report")
  },
  {
    title: "Security Settings",
    description: "Manage access & permissions",
    icon: Shield,
    variant: "secondary" as const,
    action: () => console.log("Security settings")
  }
]

export function QuickActions() {
  return (
    <Card className="col-span-4 lg:col-span-1 shadow-soft">
      <CardHeader>
        <CardTitle className="text-xl font-bold">Quick Actions</CardTitle>
        <CardDescription>
          Common tasks for your family office
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3">
          {quickActions.map((action) => {
            const Icon = action.icon
            
            return (
              <Button
                key={action.title}
                variant={action.variant}
                className="h-auto p-3 pr-10 justify-start text-left flex-1 min-w-0"
                onClick={action.action}
              >
                <div className="flex items-start space-x-3">
                  <Icon className="h-5 w-5 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-xs truncate">
                      {action.title}
                    </div>
                    <div className="text-[10px] opacity-80 leading-tight truncate">
                      {action.description}
                    </div>
                  </div>
                </div>
              </Button>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}