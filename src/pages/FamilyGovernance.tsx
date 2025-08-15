import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Users, FileText, Calendar, Vote } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

const FamilyGovernance = () => {
  const [policies] = useState([
    {
      id: 1,
      title: "Family Constitution",
      category: "Governance",
      status: "approved",
      lastUpdated: "2024-01-15",
      version: "2.1",
      approvals: 8,
      totalMembers: 10
    },
    {
      id: 2,
      title: "Investment Policy Statement",
      category: "Investment",
      status: "under_review",
      lastUpdated: "2024-02-20",
      version: "1.3",
      approvals: 5,
      totalMembers: 10
    },
    {
      id: 3,
      title: "Next Generation Development Policy",
      category: "Education",
      status: "draft",
      lastUpdated: "2024-03-01",
      version: "1.0",
      approvals: 2,
      totalMembers: 10
    }
  ])

  const [meetings] = useState([
    {
      id: 1,
      title: "Annual Family Assembly",
      date: "2024-06-15",
      type: "Annual Meeting",
      attendees: 12,
      agenda: ["Financial Review", "Governance Updates", "Investment Strategy"],
      status: "scheduled"
    },
    {
      id: 2,
      title: "Investment Committee Meeting",
      date: "2024-04-10",
      type: "Committee Meeting",
      attendees: 5,
      agenda: ["Portfolio Review", "Asset Allocation", "Risk Assessment"],
      status: "scheduled"
    },
    {
      id: 3,
      title: "Next Gen Education Planning",
      date: "2024-03-25",
      type: "Working Group",
      attendees: 8,
      agenda: ["Curriculum Development", "Mentorship Program", "Financial Literacy"],
      status: "completed"
    }
  ])

  const [committees] = useState([
    {
      name: "Investment Committee",
      chair: "Robert Johnson",
      members: 5,
      meetingFrequency: "Quarterly",
      lastMeeting: "2024-01-15",
      nextMeeting: "2024-04-15"
    },
    {
      name: "Governance Committee",
      chair: "Sarah Johnson",
      members: 7,
      meetingFrequency: "Bi-annually",
      lastMeeting: "2024-02-01",
      nextMeeting: "2024-08-01"
    },
    {
      name: "Education Committee",
      chair: "Michael Johnson",
      members: 6,
      meetingFrequency: "Monthly",
      lastMeeting: "2024-02-28",
      nextMeeting: "2024-03-28"
    }
  ])

  const { toast } = useToast()

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge variant="default">Approved</Badge>
      case "under_review":
        return <Badge variant="secondary">Under Review</Badge>
      case "draft":
        return <Badge variant="outline">Draft</Badge>
      case "scheduled":
        return <Badge variant="default">Scheduled</Badge>
      case "completed":
        return <Badge variant="outline">Completed</Badge>
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Family Governance</h1>
          <p className="text-muted-foreground">Manage family policies, meetings, and decision-making</p>
        </div>
        <Button>
          <FileText className="mr-2 h-4 w-4" />
          New Policy
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileText className="mr-2 h-5 w-5" />
              Active Policies
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{policies.length}</div>
            <p className="text-xs text-muted-foreground">Total documents</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="mr-2 h-5 w-5" />
              Committees
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{committees.length}</div>
            <p className="text-xs text-muted-foreground">Active committees</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calendar className="mr-2 h-5 w-5" />
              Upcoming Meetings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2</div>
            <p className="text-xs text-muted-foreground">Next 30 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Vote className="mr-2 h-5 w-5" />
              Pending Votes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1</div>
            <p className="text-xs text-muted-foreground">Requires decision</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Family Policies & Documentation</CardTitle>
          <CardDescription>Manage governance documents and policies</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {policies.map((policy) => (
              <div key={policy.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-4">
                  <FileText className="h-8 w-8 text-blue-500" />
                  <div>
                    <h3 className="font-semibold">{policy.title}</h3>
                    <p className="text-sm text-muted-foreground">{policy.category} • Version {policy.version}</p>
                    <p className="text-xs text-muted-foreground">Updated: {policy.lastUpdated}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  {getStatusBadge(policy.status)}
                  <div className="text-right">
                    <p className="text-sm">
                      Approvals: {policy.approvals}/{policy.totalMembers}
                    </p>
                    <div className="w-20 bg-gray-200 rounded-full h-2 mt-1">
                      <div 
                        className="bg-blue-600 h-2 rounded-full" 
                        style={{ width: `${(policy.approvals / policy.totalMembers) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">Review</Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Family Meetings</CardTitle>
            <CardDescription>Schedule and track family governance meetings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {meetings.map((meeting) => (
              <div key={meeting.id} className="p-4 border rounded-lg">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-semibold">{meeting.title}</h3>
                    <p className="text-sm text-muted-foreground">{meeting.type} • {meeting.date}</p>
                    <p className="text-xs text-muted-foreground">{meeting.attendees} attendees</p>
                  </div>
                  {getStatusBadge(meeting.status)}
                </div>
                <div className="mt-2">
                  <p className="text-sm font-medium mb-1">Agenda:</p>
                  <ul className="text-xs text-muted-foreground">
                    {meeting.agenda.map((item, index) => (
                      <li key={index}>• {item}</li>
                    ))}
                  </ul>
                </div>
                <Button variant="outline" size="sm" className="mt-2 w-full">
                  {meeting.status === "completed" ? "View Minutes" : "Manage Meeting"}
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Committees & Working Groups</CardTitle>
            <CardDescription>Family governance structure and responsibilities</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {committees.map((committee, index) => (
              <div key={index} className="p-4 border rounded-lg">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-semibold">{committee.name}</h3>
                    <p className="text-sm text-muted-foreground">Chair: {committee.chair}</p>
                    <p className="text-xs text-muted-foreground">{committee.members} members • {committee.meetingFrequency}</p>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  <p>Last meeting: {committee.lastMeeting}</p>
                  <p>Next meeting: {committee.nextMeeting}</p>
                </div>
                <Button variant="outline" size="sm" className="mt-2 w-full">
                  View Committee
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Decision Voting</CardTitle>
          <CardDescription>Current items requiring family member votes</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-4 border rounded-lg">
            <div className="flex items-start justify-between mb-2">
              <div>
                <h3 className="font-semibold">Investment Policy Statement Revision</h3>
                <p className="text-sm text-muted-foreground">Proposed changes to asset allocation guidelines</p>
              </div>
              <Badge variant="secondary">Voting Open</Badge>
            </div>
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm">
                <span className="text-green-600">5 Yes</span> • 
                <span className="text-red-600 ml-2">2 No</span> • 
                <span className="text-gray-600 ml-2">3 Pending</span>
              </div>
              <div className="space-x-2">
                <Button variant="outline" size="sm">View Details</Button>
                <Button size="sm">Cast Vote</Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default FamilyGovernance