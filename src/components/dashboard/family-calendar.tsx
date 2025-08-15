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
  const groupCoachingDates = meetings
    .filter(meeting => meeting.type.toLowerCase().includes('group coaching') || meeting.type.toLowerCase().includes('coaching'))
    .map(meeting => new Date(meeting.date))
  const otherMeetingDates = meetings
    .filter(meeting => !meeting.type.toLowerCase().includes('group coaching') && !meeting.type.toLowerCase().includes('coaching'))
    .map(meeting => new Date(meeting.date))
  
  // Get the next upcoming meeting
  const nextMeeting = meetings
    .filter(meeting => new Date(meeting.date) >= new Date())
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0]

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
      <Card className="shadow-soft lg:col-span-1">
        <CardHeader className="p-4 lg:p-6">
          <CardTitle className="flex items-center gap-2 text-lg">
            <CalendarIcon className="h-5 w-5" />
            Family Calendar
          </CardTitle>
          <CardDescription className="text-sm">
            View upcoming family meetings and events
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 lg:py-4 flex justify-center">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            className="rounded-md border pointer-events-auto w-full max-w-sm lg:max-w-fit"
            modifiers={{
              groupCoaching: groupCoachingDates,
              otherMeeting: otherMeetingDates
            }}
            modifiersStyles={{
              groupCoaching: {
                backgroundColor: 'hsl(var(--primary))',
                color: 'hsl(var(--primary-foreground))',
                borderRadius: '4px',
                fontWeight: 'bold'
              },
              otherMeeting: {
                backgroundColor: 'hsl(var(--secondary))',
                color: 'hsl(var(--secondary-foreground))',
                borderRadius: '4px',
                fontWeight: 'bold'
              }
            }}
          />
        </CardContent>
      </Card>

      <Card className="shadow-soft lg:col-span-1">
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
          <div className="space-y-3">
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
    </div>
  )
}