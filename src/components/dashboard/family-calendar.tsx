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
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Calendar */}
      <Card className="shadow-soft lg:col-span-2">
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
            className="rounded-md border pointer-events-auto w-full flex justify-center [&>div]:scale-125"
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

      {/* Upcoming Meetings */}
      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle>Upcoming Meetings</CardTitle>
          <CardDescription>
            Next scheduled family office meetings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {nextMeeting && (
              <div className="p-4 border border-primary/20 bg-primary/5 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-primary">Next Meeting</h3>
                  <Badge variant="default">
                    {nextMeeting.date.toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric' 
                    })}
                  </Badge>
                </div>
                <p className="font-medium mb-1">{nextMeeting.title}</p>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <CalendarIcon className="h-4 w-4" />
                    {nextMeeting.date.toLocaleDateString('en-US', { 
                      weekday: 'long',
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {nextMeeting.time}
                  </div>
                </div>
                <Badge variant="secondary" className="mt-2">
                  {nextMeeting.type}
                </Badge>
              </div>
            )}
            
            <div className="space-y-3">
              <h4 className="font-medium text-sm text-muted-foreground">All Upcoming</h4>
              {upcomingMeetings.slice(0, 4).map((meeting) => (
                <div key={meeting.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div>
                    <p className="font-medium text-sm">{meeting.title}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                      <span>{meeting.date.toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric' 
                      })}</span>
                      <span>•</span>
                      <span>{meeting.time}</span>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {meeting.type}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}