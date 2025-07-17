import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, Upload, UserPlus, Users, FileText, Settings, TrendingUp, Shield, Calendar } from "lucide-react"
import { ScheduleMeetingDialog } from "./schedule-meeting-dialog"
import { GoogleSheetsIntegration } from "./google-sheets-integration"
import { AddFamilyMemberDialog } from "./add-family-member-dialog"


const quickActions = [
  {
    title: "Add Investment",
    description: "Sync with Google Sheets",
    icon: TrendingUp,
    variant: "premium" as const,
    action: "google_sheets" as const
  },
  {
    title: "Upload Document",
    description: "Add trust or family documents",
    icon: Upload,
    variant: "default" as const,
    action: () => window.location.href = "/documents"
  },
  {
    title: "Add Team Member",
    description: "Invite financial advisor",
    icon: UserPlus,
    variant: "default" as const,
    action: () => console.log("Add team member")
  },
  {
    title: "Add Family Member",
    description: "Invite for meeting notifications",
    icon: Users,
    variant: "default" as const,
    action: "add_family_member" as const
  }
]

export function QuickActions() {
  const [meetingDialogOpen, setMeetingDialogOpen] = useState(false)
  const [googleSheetsDialogOpen, setGoogleSheetsDialogOpen] = useState(false)
  const [addFamilyMemberDialogOpen, setAddFamilyMemberDialogOpen] = useState(false)

  const handleScheduleMeeting = () => {
    setMeetingDialogOpen(true)
  }

  const handleAction = (action: string | (() => void)) => {
    if (action === "google_sheets") {
      setGoogleSheetsDialogOpen(true)
    } else if (action === "add_family_member") {
      setAddFamilyMemberDialogOpen(true)
    } else if (typeof action === "function") {
      action()
    }
  }

  return (
    <>
      <ScheduleMeetingDialog open={meetingDialogOpen} onOpenChange={setMeetingDialogOpen} />
      <GoogleSheetsIntegration open={googleSheetsDialogOpen} onOpenChange={setGoogleSheetsDialogOpen} />
      <AddFamilyMemberDialog open={addFamilyMemberDialogOpen} onOpenChange={setAddFamilyMemberDialogOpen} />
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
                className="h-auto p-3 pr-10 justify-start text-left flex-1 min-w-0 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  handleAction(action.action)
                }}
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
          <Button
            variant="secondary"
            className="h-auto p-3 pr-10 justify-start text-left flex-1 min-w-0 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              handleScheduleMeeting()
            }}
          >
            <div className="flex items-start space-x-3">
              <Calendar className="h-5 w-5 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-xs truncate">
                  Schedule Meeting
                </div>
                <div className="text-[10px] opacity-80 leading-tight truncate">
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