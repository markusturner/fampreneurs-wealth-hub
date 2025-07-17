import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/integrations/supabase/client'
import { NavHeader } from "@/components/dashboard/nav-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { MessageDialog } from "@/components/members/message-dialog"
import { Loader2, Users, MessageCircle, Mail, Phone, User } from 'lucide-react'

interface MemberProfile {
  id: string
  user_id: string
  first_name: string | null
  last_name: string | null
  display_name: string | null
  avatar_url: string | null
  bio: string | null
  family_role: string | null
  occupation: string | null
  phone: string | null
  created_at: string
}

const Members = () => {
  const { user, profile, loading } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [members, setMembers] = useState<MemberProfile[]>([])
  const [membersLoading, setMembersLoading] = useState(true)
  const [selectedMember, setSelectedMember] = useState<MemberProfile | null>(null)
  const [messageDialogOpen, setMessageDialogOpen] = useState(false)

  const fetchMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: true })

      if (error) throw error

      setMembers(data || [])
    } catch (error) {
      console.error('Error fetching members:', error)
    } finally {
      setMembersLoading(false)
    }
  }

  useEffect(() => {
    if (user?.id) {
      fetchMembers()
    }
  }, [user?.id])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading members...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  const getInitials = (member: MemberProfile) => {
    if (member.first_name && member.last_name) {
      return `${member.first_name.charAt(0)}${member.last_name.charAt(0)}`
    }
    if (member.display_name) {
      const names = member.display_name.split(' ')
      return names.length > 1 
        ? `${names[0].charAt(0)}${names[names.length - 1].charAt(0)}`
        : names[0].charAt(0)
    }
    return 'U'
  }

  const getDisplayName = (member: MemberProfile) => {
    return member.display_name || 
           (member.first_name && member.last_name ? `${member.first_name} ${member.last_name}` : 
           member.first_name || 'Family Member')
  }

  const handleSendMessage = (member: MemberProfile) => {
    setSelectedMember(member)
    setMessageDialogOpen(true)
  }

  const currentUserMembers = members.filter(member => member.user_id !== user.id)

  if (membersLoading) {
    return (
      <div className="min-h-screen bg-background">
        <NavHeader onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
        <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6 max-w-6xl">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded"></div>
            <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-80 bg-muted rounded"></div>
              ))}
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <NavHeader onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
      
      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6 max-w-6xl">
        {/* Welcome Section */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
              Family Members
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1">
              Connect with your family members and send personal messages
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium">{members.length} Total Members</span>
          </div>
        </div>

        {/* Current User Profile Card */}
        <Card className="shadow-soft border-primary/20">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <User className="h-5 w-5" />
              Your Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-start gap-4">
              <Avatar className="h-16 w-16 ring-2 ring-primary/20">
                <AvatarImage src={profile?.avatar_url || "/placeholder.svg"} />
                <AvatarFallback className="text-lg bg-primary text-primary-foreground">
                  {profile ? getInitials(profile as any) : 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h3 className="text-lg font-semibold">{profile ? getDisplayName(profile as any) : 'You'}</h3>
                {profile?.family_role && (
                  <Badge variant="outline" className="mb-2">
                    {profile.family_role}
                  </Badge>
                )}
                {profile?.bio && (
                  <p className="text-sm text-muted-foreground mb-2">{profile.bio}</p>
                )}
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  {(profile as any)?.occupation && (
                    <span className="flex items-center gap-1">
                      💼 {(profile as any).occupation}
                    </span>
                  )}
                  {profile?.phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {profile.phone}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Other Family Members Grid */}
        <div>
          <h2 className="text-xl font-semibold mb-4">
            Other Family Members ({currentUserMembers.length})
          </h2>
          {currentUserMembers.length === 0 ? (
            <Card className="shadow-soft text-center p-8">
              <div className="text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium mb-2">No other family members yet</p>
                <p className="text-sm">Invite family members to join your wealth management journey!</p>
              </div>
            </Card>
          ) : (
            <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {currentUserMembers.map((member) => (
                <Card key={member.id} className="shadow-soft hover:shadow-medium transition-smooth">
                  <CardHeader className="p-4 text-center">
                    <Avatar className="h-20 w-20 mx-auto mb-4 ring-2 ring-primary/20">
                      <AvatarImage src={member.avatar_url || "/placeholder.svg"} />
                      <AvatarFallback className="text-lg bg-secondary text-secondary-foreground">
                        {getInitials(member)}
                      </AvatarFallback>
                    </Avatar>
                    <CardTitle className="text-lg">{getDisplayName(member)}</CardTitle>
                    {member.family_role && (
                      <Badge variant="secondary" className="mx-auto">
                        {member.family_role}
                      </Badge>
                    )}
                  </CardHeader>
                  <CardContent className="p-4 space-y-3">
                    {member.bio && (
                      <p className="text-sm text-muted-foreground text-center line-clamp-2">
                        {member.bio}
                      </p>
                    )}
                    
                    <div className="space-y-2 text-xs text-muted-foreground">
                      {member.occupation && (
                        <div className="flex items-center gap-2">
                          <span>💼</span>
                          <span>{member.occupation}</span>
                        </div>
                      )}
                      {member.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-3 w-3" />
                          <span>{member.phone}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Mail className="h-3 w-3" />
                        <span>Member since {new Date(member.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <Button 
                      className="w-full gap-2" 
                      size="sm"
                      onClick={() => handleSendMessage(member)}
                    >
                      <MessageCircle className="h-4 w-4" />
                      Send Message
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Family Stats */}
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <Card className="shadow-soft text-center">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-primary">{members.length}</div>
              <div className="text-sm text-muted-foreground">Total Members</div>
            </CardContent>
          </Card>
          <Card className="shadow-soft text-center">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-accent">
                {members.filter(m => m.family_role).length}
              </div>
              <div className="text-sm text-muted-foreground">With Roles</div>
            </CardContent>
          </Card>
          <Card className="shadow-soft text-center">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-secondary">
                {members.filter(m => m.avatar_url).length}
              </div>
              <div className="text-sm text-muted-foreground">With Photos</div>
            </CardContent>
          </Card>
          <Card className="shadow-soft text-center">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-muted-foreground">
                {Math.round((members.filter(m => m.bio).length / members.length) * 100) || 0}%
              </div>
              <div className="text-sm text-muted-foreground">Complete Profiles</div>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Message Dialog */}
      {selectedMember && (
        <MessageDialog
          open={messageDialogOpen}
          onOpenChange={setMessageDialogOpen}
          recipient={selectedMember}
          onMessageSent={() => {
            setMessageDialogOpen(false)
            setSelectedMember(null)
          }}
        />
      )}
    </div>
  )
}

export default Members
