import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Home, FileText, Phone, Mail, Calendar, Shield, AlertCircle, Bell } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { useEffect, useState } from "react"
import { supabase } from "@/integrations/supabase/client"
import { DataMaskingDisplay } from "./data-masking-display"

interface FamilyAnnouncement {
  id: string
  title: string
  content: string
  priority: 'low' | 'medium' | 'high'
  created_at: string
}

interface FamilyContact {
  id: string
  name: string
  role: string
  phone?: string
  email?: string
}

export function FamilyMemberDashboard() {
  const { user, profile } = useAuth()
  const [announcements, setAnnouncements] = useState<FamilyAnnouncement[]>([])
  const [contacts, setContacts] = useState<FamilyContact[]>([])
  const [documentCount, setDocumentCount] = useState(0)
  const [loading, setLoading] = useState(true)

  const displayName = profile?.display_name || profile?.first_name || 'Family Member'

  useEffect(() => {
    const fetchFamilyData = async () => {
      if (!user) return

      try {
        // Fetch family announcements (simulated - you might have a different table)
        const mockAnnouncements: FamilyAnnouncement[] = [
          {
            id: '1',
            title: 'Quarterly Family Meeting',
            content: 'Our next family meeting is scheduled for next Friday at 2 PM.',
            priority: 'high',
            created_at: new Date().toISOString()
          },
          {
            id: '2',
            title: 'Investment Portfolio Update',
            content: 'Q3 portfolio performance reports are now available.',
            priority: 'medium',
            created_at: new Date(Date.now() - 86400000).toISOString()
          }
        ]
        setAnnouncements(mockAnnouncements)

        // Fetch family office contacts
        const mockContacts: FamilyContact[] = [
          {
            id: '1',
            name: 'Sarah Johnson',
            role: 'Family Office Administrator',
            phone: '+1-555-0123',
            email: 'sarah@familyoffice.com'
          },
          {
            id: '2',
            name: 'Michael Chen',
            role: 'Investment Advisor',
            phone: '+1-555-0124',
            email: 'michael@familyoffice.com'
          },
          {
            id: '3',
            name: 'Emily Davis',
            role: 'Estate Planning Specialist',
            phone: '+1-555-0125',
            email: 'emily@familyoffice.com'
          }
        ]
        setContacts(mockContacts)

        // Fetch document count
        const { count } = await supabase
          .from('family_documents')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)

        setDocumentCount(count || 0)

      } catch (error) {
        console.error('Error fetching family data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchFamilyData()
  }, [user])

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive'
      case 'medium': return 'secondary'
      default: return 'outline'
    }
  }

  const quickActions = [
    {
      title: 'Request Information',
      description: 'Submit a request for family office information',
      icon: FileText,
      action: () => console.log('Request info')
    },
    {
      title: 'Schedule Meeting',
      description: 'Book time with family office team',
      icon: Calendar,
      action: () => console.log('Schedule meeting')
    },
    {
      title: 'Contact Support',
      description: 'Get help from family office staff',
      icon: Phone,
      action: () => console.log('Contact support')
    }
  ]

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-muted rounded w-1/3"></div>
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-muted rounded"></div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground">
            Welcome, {displayName}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            Your family office dashboard
          </p>
        </div>
        <Badge variant="outline" className="self-start sm:self-center">
          <Shield className="h-3 w-3 mr-1" />
          Family Member Access
        </Badge>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
        <Card className="shadow-soft">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available Documents</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{documentCount}</div>
            <p className="text-xs text-muted-foreground">
              Documents you can access
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-soft">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Announcements</CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{announcements.length}</div>
            <p className="text-xs text-muted-foreground">
              Recent family updates
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-soft">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Team Contacts</CardTitle>
            <Phone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{contacts.length}</div>
            <p className="text-xs text-muted-foreground">
              Available team members
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        {/* Announcements */}
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Family Announcements
            </CardTitle>
            <CardDescription>
              Important updates from your family office
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {announcements.length > 0 ? (
              announcements.map((announcement) => (
                <div key={announcement.id} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">{announcement.title}</h4>
                    <Badge variant={getPriorityColor(announcement.priority)}>
                      {announcement.priority}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{announcement.content}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(announcement.created_at).toLocaleDateString()}
                  </p>
                </div>
              ))
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                <p>No announcements at this time</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Home className="h-5 w-5" />
              Quick Actions
            </CardTitle>
            <CardDescription>
              Common tasks and requests
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {quickActions.map((action, index) => {
              const Icon = action.icon
              return (
                <Button
                  key={index}
                  variant="outline"
                  className="w-full justify-start h-auto p-4"
                  onClick={action.action}
                >
                  <Icon className="h-5 w-5 mr-3 text-primary" />
                  <div className="text-left">
                    <div className="font-medium">{action.title}</div>
                    <div className="text-sm text-muted-foreground">
                      {action.description}
                    </div>
                  </div>
                </Button>
              )
            })}
          </CardContent>
        </Card>
      </div>

      {/* Team Contacts */}
      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            Family Office Team
          </CardTitle>
          <CardDescription>
            Contact information for your family office team
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {contacts.map((contact) => (
              <div key={contact.id} className="border rounded-lg p-4 space-y-2">
                <h4 className="font-medium">{contact.name}</h4>
                <p className="text-sm text-muted-foreground">{contact.role}</p>
                {contact.phone && (
                  <DataMaskingDisplay
                    data={contact.phone}
                    dataType="phone"
                    classification="internal"
                    label="Phone"
                  />
                )}
                {contact.email && (
                  <DataMaskingDisplay
                    data={contact.email}
                    dataType="email"
                    classification="internal"
                    label="Email"
                  />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}