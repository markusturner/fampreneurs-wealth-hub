import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CalendarIcon, Clock } from "lucide-react"
import { useState } from "react"

// Mock data for upcoming meetings
const upcomingMeetings = [
  {
    id: 1,
    title: "Investment Review",
    date: new Date(2025, 6, 18), // July 18, 2025
    time: "2:00 PM",
    type: "Quarterly Review"
  },
  {
    id: 2,
    title: "Estate Planning Discussion",
    date: new Date(2025, 6, 22), // July 22, 2025
    time: "10:00 AM",
    type: "Planning"
  },
  {
    id: 3,
    title: "Family Business Meeting",
    date: new Date(2025, 6, 25), // July 25, 2025
    time: "3:30 PM",
    type: "Business"
  }
]

export function FamilyCalendar() {
  const [selectedDate, setSelectedDate] = useState<Date>()
  
  // Get dates that have meetings
  const meetingDates = upcomingMeetings.map(meeting => meeting.date)
  
  // Get the next upcoming meeting
  const nextMeeting = upcomingMeetings
    .filter(meeting => meeting.date >= new Date())
    .sort((a, b) => a.date.getTime() - b.date.getTime())[0]

  return (
    <div className="grid grid-cols-2 gap-6">
      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            Family Calendar
          </CardTitle>
          <CardDescription>
            View upcoming family meetings and events
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            className="rounded-md border pointer-events-auto w-full flex justify-center [&>div]:w-full [&_table]:w-full [&_td]:w-16 [&_td]:h-16 [&_th]:w-16 [&_th]:h-16 [&_button]:w-full [&_button]:h-full [&_.rdp-caption]:text-xl [&_.rdp-caption]:font-semibold [&_.rdp-caption]:text-center [&>div]:pr-0 [&_.rdp-nav]:absolute [&_.rdp-nav]:inset-x-0 [&_.rdp-nav]:top-0 [&_.rdp-nav]:flex [&_.rdp-nav]:justify-between [&_.rdp-nav]:items-center [&_.rdp-nav_button]:text-primary [&_.rdp-nav_button]:hover:text-primary/80"
            modifiers={{
              meeting: meetingDates
            }}
            modifiersStyles={{
              meeting: {
                backgroundColor: 'hsl(var(--primary))',
                color: 'hsl(var(--primary-foreground))',
                borderRadius: '4px'
              }
            }}
          />
        </CardContent>
      </Card>

      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Upcoming Meetings
          </CardTitle>
          <CardDescription>
            Your scheduled family meetings and events
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {upcomingMeetings
              .filter(meeting => meeting.date >= new Date())
              .sort((a, b) => a.date.getTime() - b.date.getTime())
              .map((meeting) => (
                <div key={meeting.id} className="p-3 border border-primary/20 bg-primary/5 rounded-lg">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-medium text-sm">{meeting.title}</p>
                    <Badge variant="secondary" className="text-xs">
                      {meeting.type}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <CalendarIcon className="h-3 w-3" />
                      {meeting.date.toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {meeting.time}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}