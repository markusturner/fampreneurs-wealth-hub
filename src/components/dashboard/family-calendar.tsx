import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CalendarIcon, Clock } from "lucide-react"
import { useState } from "react"
import { useMeetings } from "@/contexts/MeetingsContext"

export function FamilyCalendar() {
  const { meetings } = useMeetings()
  const [selectedDate, setSelectedDate] = useState<Date>()
  
  // Get dates that have meetings
  const meetingDates = meetings.map(meeting => new Date(meeting.date))
  
  // Get the next upcoming meeting
  const nextMeeting = meetings
    .filter(meeting => new Date(meeting.date) >= new Date())
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0]

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
        <CardContent className="py-4 flex justify-center">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            className="rounded-md border pointer-events-auto max-w-fit [&>div]:w-auto [&_table]:w-auto [&_td]:w-10 [&_td]:h-10 [&_th]:w-10 [&_th]:h-8 [&_button]:w-full [&_button]:h-full [&_button]:text-xs [&_.rdp-caption]:text-base [&_.rdp-caption]:font-semibold [&_.rdp-caption]:text-center [&_.rdp-caption]:flex [&_.rdp-caption]:items-center [&_.rdp-caption]:justify-center [&_.rdp-nav]:flex [&_.rdp-nav]:items-center [&_.rdp-nav]:justify-between [&_.rdp-nav]:w-full [&_.rdp-nav_button]:text-primary [&_.rdp-nav_button]:hover:text-primary/80 [&_.rdp-nav_button]:opacity-70 [&_.rdp-nav_button]:hover:opacity-100"
            modifiers={{
              meeting: meetingDates
            }}
            modifiersStyles={{
              meeting: {
                backgroundColor: 'hsl(270 50% 60%)',
                color: 'white',
                borderRadius: '4px',
                fontWeight: 'bold'
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
        <CardContent className="p-4">
          <div className="space-y-2">
            {meetings
              .filter(meeting => new Date(meeting.date) >= new Date())
              .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
              .map((meeting) => (
                <div key={meeting.id} className="p-2 border border-primary/20 bg-primary/5 rounded-lg">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-medium text-xs">{meeting.title}</p>
                    <Badge variant="secondary" className="text-xs px-1 py-0">
                      {meeting.type}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <CalendarIcon className="h-3 w-3" />
                      {new Date(meeting.date).toLocaleDateString('en-US', { 
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