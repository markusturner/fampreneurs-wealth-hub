import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CalendarIcon, Clock } from "lucide-react"
import { useMeetings } from "@/contexts/MeetingsContext"
import { TestNotificationButton } from "./test-notification-button"

export function UpcomingMeetings() {
  const { meetings } = useMeetings()

  return (
    <Card className="shadow-soft">
      <CardHeader className="p-4 lg:p-6">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Clock className="h-5 w-5" />
          Upcoming Meetings
        </CardTitle>
        <CardDescription className="text-sm">
          Your scheduled family meetings and events
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4">
        <TestNotificationButton />
        <div className="space-y-3 mt-4">
          {meetings
            .filter(meeting => new Date(meeting.date) >= new Date())
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
            .map((meeting) => (
              <div key={meeting.id} className="p-3 sm:p-4 border border-primary/20 bg-primary/5 rounded-lg">
                <div className="flex items-start justify-between mb-2">
                  <p className="font-medium text-sm sm:text-base leading-tight pr-2">{meeting.title}</p>
                  <Badge variant="secondary" className="text-xs px-2 py-1 flex-shrink-0">
                    {meeting.type}
                  </Badge>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <CalendarIcon className="h-4 w-4" />
                    <span>{new Date(meeting.date).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric',
                      year: 'numeric'
                    })}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    <span>{meeting.time}</span>
                  </div>
                </div>
              </div>
            ))}
          {meetings.filter(meeting => new Date(meeting.date) >= new Date()).length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <CalendarIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No upcoming meetings scheduled</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}