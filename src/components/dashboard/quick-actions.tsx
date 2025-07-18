import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, Upload, UserPlus, Users, FileText, Settings, TrendingUp, Shield, Calendar, Building2 } from "lucide-react"
import { ScheduleMeetingDialog } from "./schedule-meeting-dialog"
import { GoogleSheetsIntegration } from "./google-sheets-integration"
import { AddFamilyMemberDialog } from "./add-family-member-dialog"
import { BusinessStructureDialog } from "./business-structure-dialog"
import { InvestmentIntegrationDialog } from "./investment-integration-dialog"


const quickActions = [
  {
    title: "Add Investment",
    description: "Connect financial accounts",
    icon: TrendingUp,
    variant: "premium" as const,
    action: () => window.location.href = "/investments"
  },
  {
    title: "Upload Document",
    description: "Add trust or family documents",
    icon: Upload,
    variant: "default" as const,
    action: () => window.location.href = "/documents"
  },
  {
    title: "Add Family Office Member",
    description: "Invite financial advisor",
    icon: UserPlus,
    variant: "default" as const,
    action: () => window.location.href = "/team-members"
  },
  {
    title: "Add Family Member",
    description: "Invite for meeting notifications",
    icon: Users,
    variant: "default" as const,
    action: () => window.location.href = "/family-members"
  },
  {
    title: "Business Structure",
    description: "Entity structure analysis",
    icon: Building2,
    variant: "secondary" as const,
    action: "business_structure" as const
  }
]

export function QuickActions() {
  const [meetingDialogOpen, setMeetingDialogOpen] = useState(false)
  const [googleSheetsDialogOpen, setGoogleSheetsDialogOpen] = useState(false)
  const [addFamilyMemberDialogOpen, setAddFamilyMemberDialogOpen] = useState(false)
  const [businessStructureDialogOpen, setBusinessStructureDialogOpen] = useState(false)
  const [investmentIntegrationOpen, setInvestmentIntegrationOpen] = useState(false)

  const handleScheduleMeeting = () => {
    setMeetingDialogOpen(true)
  }

  const handleAction = (action: string | (() => void)) => {
    if (action === "google_sheets") {
      setGoogleSheetsDialogOpen(true)
    } else if (action === "business_structure") {
      setBusinessStructureDialogOpen(true)
    } else if (typeof action === "function") {
      action()
    }
  }

  return (
    <>
      <ScheduleMeetingDialog open={meetingDialogOpen} onOpenChange={setMeetingDialogOpen} />
      <GoogleSheetsIntegration open={googleSheetsDialogOpen} onOpenChange={setGoogleSheetsDialogOpen} />
      <AddFamilyMemberDialog open={addFamilyMemberDialogOpen} onOpenChange={setAddFamilyMemberDialogOpen} />
      <BusinessStructureDialog open={businessStructureDialogOpen} onOpenChange={setBusinessStructureDialogOpen} />
      <InvestmentIntegrationDialog open={investmentIntegrationOpen} onOpenChange={setInvestmentIntegrationOpen} />
    <Card className="col-span-4 lg:col-span-1 shadow-soft">
      <CardHeader className="p-4 sm:p-6">
        <CardTitle className="text-lg sm:text-xl font-bold">Quick Actions</CardTitle>
        <CardDescription className="text-sm">
          Common tasks for your family office
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4 sm:p-6">
        <div className="grid gap-2 sm:gap-3">
          {quickActions.map((action) => {
            const Icon = action.icon
            
            return (
              <Button
                key={action.title}
                variant={action.variant}
                className="h-auto p-3 sm:pr-10 justify-start text-left flex-1 min-w-0 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-all duration-200 hover:shadow-glow hover:scale-[1.02]"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  handleAction(action.action)
                }}
              >
                <div className="flex items-start space-x-2 sm:space-x-3 w-full">
                  <Icon 
                    className="h-4 w-4 sm:h-5 sm:w-5 mt-0.5 flex-shrink-0 text-primary dark:text-primary-foreground" 
                    style={action.title === "Business Structure" ? { color: '#290a52' } : {}}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-xs sm:text-sm truncate">
                      {action.title}
                    </div>
                    <div className="text-[10px] sm:text-xs opacity-80 leading-tight truncate">
                      {action.description}
                    </div>
                  </div>
                </div>
              </Button>
            )
          })}
          <Button
            variant="secondary"
            className="h-auto p-3 sm:pr-10 justify-start text-left flex-1 min-w-0 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-all duration-200 hover:shadow-glow hover:scale-[1.02]"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              handleScheduleMeeting()
            }}
          >
            <div className="flex items-start space-x-2 sm:space-x-3 w-full">
              <Calendar className="h-4 w-4 sm:h-5 sm:w-5 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-xs sm:text-sm truncate">
                  Schedule Meeting
                </div>
                <div className="text-[10px] sm:text-xs opacity-80 leading-tight truncate">
                  Plan family discussions
                </div>
              </div>
            </div>
          </Button>
        </div>
      </CardContent>
    </Card>
    </>
  )
}