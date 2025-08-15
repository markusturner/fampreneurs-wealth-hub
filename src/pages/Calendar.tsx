import { useState } from "react"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { FamilyCalendar } from "@/components/dashboard/family-calendar"
import { UpcomingMeetings } from "@/components/dashboard/upcoming-meetings"
import { ScheduleMeetingDialog } from "@/components/dashboard/schedule-meeting-dialog"

export default function Calendar() {
  const [isScheduleMeetingOpen, setIsScheduleMeetingOpen] = useState(false)

  return (
    <div className="container mx-auto p-4 lg:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold">Family Calendar</h1>
          <p className="text-muted-foreground mt-1">
            Manage your family meetings and events
          </p>
        </div>
        <Button 
          onClick={() => setIsScheduleMeetingOpen(true)}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Schedule Meeting
        </Button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <FamilyCalendar />
        </div>
        <div className="xl:col-span-1">
          <UpcomingMeetings />
        </div>
      </div>

      <ScheduleMeetingDialog 
        open={isScheduleMeetingOpen}
        onOpenChange={setIsScheduleMeetingOpen}
      />
    </div>
  )
}