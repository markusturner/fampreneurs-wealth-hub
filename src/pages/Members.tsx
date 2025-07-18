import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/integrations/supabase/client'
import { NavHeader } from "@/components/dashboard/nav-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { MessageDialog } from "@/components/members/message-dialog"
import { EditMemberDialog } from "@/components/members/edit-member-dialog"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Users, MessageCircle, Mail, Phone, User, Search, ArrowLeft, X, Crown, Heart, Shield } from 'lucide-react'
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { MobileService } from '@/lib/mobile'
import { ImpactStyle } from '@capacitor/haptics'

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
  is_admin: boolean | null
  is_accountability_partner: boolean | null
  is_moderator?: boolean | null
  created_at: string
}

const Members = () => {
  const { user, profile, loading } = useAuth()
  const { toast } = useToast()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [members, setMembers] = useState<MemberProfile[]>([])
  const [membersLoading, setMembersLoading] = useState(true)
  const [selectedMember, setSelectedMember] = useState<MemberProfile | null>(null)
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({})
  const [searchQuery, setSearchQuery] = useState('')
  const [isMobileView, setIsMobileView] = useState(false)
  const [showMobileChat, setShowMobileChat] = useState(false)

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

  const fetchUnreadCounts = async () => {
    if (!user?.id) return

    try {
      const { data, error } = await supabase
        .from('messages')
        .select('sender_id')
        .eq('recipient_id', user.id)
        .is('read_at', null)

      if (error) throw error

      const counts: Record<string, number> = {}
      data?.forEach(message => {
        counts[message.sender_id] = (counts[message.sender_id] || 0) + 1
      })
      setUnreadCounts(counts)
    } catch (error) {
      console.error('Error fetching unread counts:', error)
    }
  }

  useEffect(() => {
    if (user?.id) {
      fetchMembers()
      fetchUnreadCounts()
    }
  }, [user?.id])

  // Real-time subscription for new messages and profile updates
  useEffect(() => {
    if (!user?.id) return

    const channel = supabase
      .channel('members_updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `recipient_id=eq.${user.id}`
        },
        () => {
          fetchUnreadCounts()
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `recipient_id=eq.${user.id}`
        },
        () => {
          fetchUnreadCounts()
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles'
        },
        (payload) => {
          // Update the specific member in local state when profile changes
          setMembers(prev => prev.map(member => 
            member.user_id === payload.new.user_id 
              ? { ...member, ...payload.new }
              : member
          ))
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user?.id])

  // Handle mobile view detection
  useEffect(() => {
    const checkMobileView = () => {
      setIsMobileView(window.innerWidth < 768)
    }
    
    checkMobileView()
    window.addEventListener('resize', checkMobileView)
    
    return () => window.removeEventListener('resize', checkMobileView)
  }, [])

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

  const handleSelectMember = async (member: MemberProfile) => {
    // Trigger haptic feedback on mobile
    if (MobileService.isNative()) {
      await MobileService.triggerHaptic(ImpactStyle.Light)
    }
    
    setSelectedMember(member)
    if (isMobileView) {
      setShowMobileChat(true)
    }
  }

  const handleCloseMobileChat = () => {
    setShowMobileChat(false)
    setSelectedMember(null)
  }

  const handleQuickAccountabilityAssignment = async (member: MemberProfile) => {
    if (!user?.id) return

    // Optimistic update - immediately update local state
    setMembers(prev => prev.map(m => 
      m.user_id === member.user_id 
        ? { ...m, is_accountability_partner: true, accountability_specialties: ['general_support'] }
        : m
    ))

    try {
      const { error } = await supabase.rpc('assign_accountability_role', {
        target_user_id: member.user_id,
        assigner_user_id: user.id,
        specialties: ['general_support']
      })

      if (error) throw error

      toast({
        title: "Accountability Partner Assigned",
        description: `${getDisplayName(member)} is now an accountability partner.`,
      })

      // Don't call fetchMembers() since optimistic update already handled it
    } catch (error) {
      console.error('Error assigning accountability role:', error)
      toast({
        title: "Error",
        description: "Failed to assign accountability partner role. Please try again.",
        variant: "destructive",
      })
      // Revert optimistic update on error
      setMembers(prev => prev.map(m => 
        m.user_id === member.user_id 
          ? { ...m, is_accountability_partner: false }
          : m
      ))
    }
  }

  const handleRemoveAccountabilityPartner = async (member: MemberProfile) => {
    if (!user?.id) return

    // Optimistic update - immediately update local state
    setMembers(prev => prev.map(m => 
      m.user_id === member.user_id 
        ? { ...m, is_accountability_partner: false, accountability_specialties: null }
        : m
    ))

    try {
      // Use the remove_user_role function to safely remove the role
      const { error } = await supabase.rpc('remove_user_role', {
        target_user_id: member.user_id,
        role_to_remove: 'accountability_partner',
        remover_user_id: user.id
      })

      if (error) {
        console.error('Database error:', error)
        throw error
      }

      // Also update the profile
      await supabase
        .from('profiles')
        .update({
          is_accountability_partner: false,
          accountability_specialties: null
        })
        .eq('user_id', member.user_id)

      toast({
        title: "Accountability Partner Removed",
        description: `${getDisplayName(member)} is no longer an accountability partner.`,
      })

      // Don't call fetchMembers() since optimistic update already handled it
    } catch (error) {
      console.error('Error removing accountability role:', error)
      toast({
        title: "Error",
        description: "Failed to remove accountability partner role. Please try again.",
        variant: "destructive",
      })
      // Revert optimistic update on error
      setMembers(prev => prev.map(m => 
        m.user_id === member.user_id 
          ? { ...m, is_accountability_partner: true }
          : m
      ))
    }
  }

  const currentUserMembers = members.filter(member => member.user_id !== user.id)
  
  const filteredMembers = currentUserMembers.filter(member =>
    getDisplayName(member).toLowerCase().includes(searchQuery.toLowerCase()) ||
    (member.family_role && member.family_role.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  if (membersLoading) {
    return (
      <div className="min-h-screen bg-background">
        <NavHeader onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
        <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6 max-w-full">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded"></div>
            <div className="flex gap-4 h-[600px]">
              <div className="w-80 bg-muted rounded"></div>
              <div className="flex-1 bg-muted rounded"></div>
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <NavHeader onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
      
      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6 max-w-full">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
              Family Messages
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1">
              Connect and chat with your family members
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium">{members.length} Total Members</span>
            </div>
          </div>
        </div>

        {/* Split Layout - Desktop */}
        <div className={`${isMobileView ? 'block' : 'flex gap-4 h-[600px]'}`}>
          {/* Left Sidebar - Members List */}
          <div className={`${isMobileView ? 'w-full' : 'w-80'} flex flex-col ${isMobileView && showMobileChat ? 'hidden' : ''}`}>
            <Card className={`shadow-soft ${isMobileView ? 'h-[500px]' : 'h-full'} flex flex-col`}>
              <CardHeader className="p-4 border-b">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <MessageCircle className="h-5 w-5" />
                  Conversations
                </CardTitle>
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Search members..."
                    className="pl-10"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </CardHeader>
              <CardContent className="flex-1 p-0 overflow-hidden">
                <div className="h-full overflow-y-auto">
                  {filteredMembers.length === 0 ? (
                    <div className="p-4 text-center text-muted-foreground">
                      <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No family members found</p>
                    </div>
                  ) : (
                    <div className="space-y-1 p-2">
                      {filteredMembers.map((member) => (
                        <div
                          key={member.id}
                          className={`w-full p-3 rounded-lg border hover:bg-muted/50 transition-colors ${
                            selectedMember?.id === member.id ? 'bg-muted border-primary' : 'border-transparent'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => handleSelectMember(member)}
                              className="flex items-center gap-3 flex-1 text-left"
                            >
                              <div className="relative">
                                <Avatar className={`${isMobileView ? 'h-10 w-10' : 'h-12 w-12'}`}>
                                  <AvatarImage src={member.avatar_url || "/placeholder.svg"} />
                                  <AvatarFallback className="bg-secondary text-secondary-foreground">
                                    {getInitials(member)}
                                  </AvatarFallback>
                                </Avatar>
                                {unreadCounts[member.user_id] > 0 && (
                                  <span className="absolute -top-1 -right-1 h-5 w-5 bg-destructive text-destructive-foreground text-xs rounded-full flex items-center justify-center">
                                    {unreadCounts[member.user_id]}
                                  </span>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className={`font-medium truncate ${isMobileView ? 'text-sm' : ''}`}>
                                  {getDisplayName(member)}
                                </div>
                                {member.family_role && (
                                  <div className={`text-muted-foreground truncate ${isMobileView ? 'text-xs' : 'text-sm'}`}>
                                    {member.family_role}
                                  </div>
                                )}
                                 {/* Role Badges */}
                                 <div className="flex flex-wrap gap-1 mt-1 max-w-full">
                                   {member.is_admin && (
                                     <Badge variant="destructive" className="text-xs flex-shrink-0">
                                       <Crown className="h-2 w-2 mr-1" />
                                       Admin
                                     </Badge>
                                   )}
                                    {member.is_accountability_partner && (
                                      <Badge variant="secondary" className="text-xs flex-shrink-0">
                                        <Heart className="h-2 w-2 mr-1" />
                                        Accountability
                                      </Badge>
                                    )}
                                    {member.is_moderator && (
                                      <Badge variant="outline" className="text-xs flex-shrink-0" style={{ backgroundColor: '#ffb500', color: '#290a52' }}>
                                        <Shield className="h-2 w-2 mr-1" />
                                        Moderator
                                      </Badge>
                                    )}
                                  </div>
                              </div>
                            </button>
                             
                             {/* Admin Actions - Only visible to admins */}
                             {profile?.is_admin && (
                               <div className="flex flex-col gap-1">
                                 <EditMemberDialog 
                                   member={member} 
                                   onMemberUpdated={fetchMembers}
                                 />
                                  {!member.is_accountability_partner ? (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        // Quick action to make someone an accountability partner
                                        handleQuickAccountabilityAssignment(member)
                                      }}
                                      className="text-xs p-1 h-auto"
                                    >
                                      <Heart className="h-3 w-3" />
                                    </Button>
                                  ) : (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        // Quick action to remove accountability partner
                                        handleRemoveAccountabilityPartner(member)
                                      }}
                                      className="text-xs p-1 h-auto text-destructive hover:text-destructive"
                                    >
                                      <X className="h-3 w-3" />
                                    </Button>
                                  )}
                               </div>
                             )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Side - Chat Area */}
          <div className={`${isMobileView ? 'w-full' : 'flex-1'} ${isMobileView && !showMobileChat ? 'hidden' : ''}`}>
            {isMobileView && showMobileChat ? (
              // Mobile Chat Full Screen
              <div className="fixed inset-0 bg-background z-50 flex flex-col">
                {/* Mobile Chat Header */}
                <div className="p-4 border-b bg-background flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCloseMobileChat}
                    className="p-2"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                  {selectedMember && (
                    <>
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={selectedMember.avatar_url || "/placeholder.svg"} />
                        <AvatarFallback className="bg-secondary text-secondary-foreground">
                          {getInitials(selectedMember)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="font-semibold text-sm">{getDisplayName(selectedMember)}</div>
                        {selectedMember.family_role && (
                          <div className="text-xs text-muted-foreground">{selectedMember.family_role}</div>
                        )}
                      </div>
                    </>
                  )}
                </div>
                
                {/* Mobile Chat Content */}
                <div className="flex-1 flex flex-col">
                  {selectedMember && (
                    <MessageDialog
                      open={true}
                      onOpenChange={() => {}}
                      recipient={selectedMember}
                      onMessageSent={() => {
                        fetchUnreadCounts()
                      }}
                      embedded={true}
                      mobile={true}
                    />
                  )}
                </div>
              </div>
            ) : (
              // Desktop Chat
              <Card className="shadow-soft h-full">
                {selectedMember ? (
                  <div className="h-full flex flex-col">
                    {/* Chat Header */}
                    <div className="p-4 border-b">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={selectedMember.avatar_url || "/placeholder.svg"} />
                          <AvatarFallback className="bg-secondary text-secondary-foreground">
                            {getInitials(selectedMember)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-semibold">{getDisplayName(selectedMember)}</div>
                          {selectedMember.family_role && (
                            <div className="text-sm text-muted-foreground">{selectedMember.family_role}</div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Embed the MessageDialog content directly */}
                    <MessageDialog
                      open={true}
                      onOpenChange={() => {}}
                      recipient={selectedMember}
                      onMessageSent={() => {
                        fetchUnreadCounts()
                      }}
                      embedded={true}
                    />
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground">
                    <div className="text-center">
                      <MessageCircle className="h-16 w-16 mx-auto mb-4 opacity-50" />
                      <h3 className="text-lg font-medium mb-2">Welcome to Family Messages</h3>
                      <p>Select a family member from the list to start chatting</p>
                    </div>
                  </div>
                )}
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

export default Members
