import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, Upload, UserPlus, Banknote, FileText, Settings, TrendingUp, Shield, Calendar } from "lucide-react"
import { ScheduleMeetingDialog } from "./schedule-meeting-dialog"


export function QuickActions() {
  const [meetingDialogOpen, setMeetingDialogOpen] = useState(false)

  const handleScheduleMeeting = () => {
    setMeetingDialogOpen(true)
  }

  return (
    <>
      <ScheduleMeetingDialog open={meetingDialogOpen} onOpenChange={setMeetingDialogOpen} />
    <Card className="col-span-4 lg:col-span-1 shadow-soft">
      <CardHeader>
        <CardTitle className="text-xl font-bold">Quick Actions</CardTitle>
        <CardDescription>
          Common tasks for your family office
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3">
          <Button
            variant="secondary"
            className="h-auto p-3 pr-10 justify-start text-left flex-1 min-w-0"
            onClick={handleScheduleMeeting}
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