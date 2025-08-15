import { useState } from "react"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { NavHeader } from "@/components/dashboard/nav-header"
import { FamilyCalendar } from "@/components/dashboard/family-calendar"
import { ScheduleMeetingDialog } from "@/components/dashboard/schedule-meeting-dialog"

export default function Calendar() {
  const [isScheduleMeetingOpen, setIsScheduleMeetingOpen] = useState(false)

  return (
    <div className="min-h-screen bg-background">
      <NavHeader />
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

      <FamilyCalendar />

      {isScheduleMeetingOpen && (
        <ScheduleMeetingDialog 
          open={isScheduleMeetingOpen}
          onOpenChange={setIsScheduleMeetingOpen}
        />
      )}

      </div>
    </div>
  )
}