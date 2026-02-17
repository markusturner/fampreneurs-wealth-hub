import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { Search, MessageCircle, Settings, UserPlus, Clock, Calendar, Tag, RefreshCw, X, Send, Smile, Paperclip, ExternalLink, MoreHorizontal } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface Member {
  user_id: string
  display_name: string | null
  avatar_url: string | null
  bio: string | null
  created_at: string
  last_sign_in?: string | null
  email?: string | null
  status?: string
}

type StatusFilter = 'active' | 'cancelling' | 'churned' | 'banned'
type MembershipTab = 'membership' | 'courses' | 'payments' | 'questions'

export default function WorkspaceMembers() {
  const { user, profile } = useAuth()
  const { toast } = useToast()
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState<StatusFilter>('active')

  // Chat popup state
  const [chatMember, setChatMember] = useState<Member | null>(null)
  const [chatMessage, setChatMessage] = useState('')

  // Membership dialog state
  const [membershipMember, setMembershipMember] = useState<Member | null>(null)
  const [membershipTab, setMembershipTab] = useState<MembershipTab>('membership')

  // Invite dialog
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')

  useEffect(() => { fetchMembers() }, [])

  const fetchMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, display_name, avatar_url, bio, created_at')
        .order('created_at', { ascending: false })

      if (error) throw error
      setMembers((data || []).map(m => ({ ...m, status: 'active' })))
    } catch (error) {
      console.error('Error fetching members:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredMembers = members.filter(m => {
    // Status filter
    if (activeFilter !== 'active' && m.status !== activeFilter) return false
    // Search filter
    if (searchQuery) {
      return m.display_name?.toLowerCase().includes(searchQuery.toLowerCase())
    }
    return true
  })

  const getInitials = (name: string | null) => {
    if (!name) return 'M'
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime()
    const days = Math.floor(diff / 86400000)
    if (days < 1) return 'Today'
    if (days === 1) return '1d ago'
    return `${days}d ago`
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const handleSendChat = () => {
    if (!chatMessage.trim() || !chatMember) return
    toast({ title: 'Message sent', description: `Message sent to ${chatMember.display_name}` })
    setChatMessage('')
  }

  const handleInvite = () => {
    if (!inviteEmail.trim()) return
    toast({ title: 'Invitation sent', description: `Invite sent to ${inviteEmail}` })
    setInviteEmail('')
    setInviteOpen(false)
  }

  const statusCounts = {
    active: members.filter(m => m.status === 'active').length,
    cancelling: members.filter(m => m.status === 'cancelling').length,
    churned: members.filter(m => m.status === 'churned').length,
    banned: members.filter(m => m.status === 'banned').length,
  }

  const filters: { id: StatusFilter; label: string; count: number }[] = [
    { id: 'active', label: 'Active', count: statusCounts.active },
    { id: 'cancelling', label: 'Cancelling', count: statusCounts.cancelling },
    { id: 'churned', label: 'Churned', count: statusCounts.churned },
    { id: 'banned', label: 'Banned', count: statusCounts.banned },
  ]

  const membershipTabs: { id: MembershipTab; label: string }[] = [
    { id: 'membership', label: 'Membership' },
    { id: 'courses', label: 'Courses' },
    { id: 'payments', label: 'Payments' },
    { id: 'questions', label: 'Questions' },
  ]

  return (
    <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 max-w-5xl space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Members</h1>
          <p className="text-muted-foreground text-sm">Manage community members</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:flex-none">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search members"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 w-full sm:w-64"
            />
          </div>
          <Button className="gap-2 flex-shrink-0" style={{ backgroundColor: '#ffb500', color: '#290a52' }} onClick={() => setInviteOpen(true)}>
            <UserPlus className="h-4 w-4" />
            <span className="hidden sm:inline">Invite</span>
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        {filters.map((filter) => (
          <Button
            key={filter.id}
            variant={activeFilter === filter.id ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveFilter(filter.id)}
            className="rounded-full gap-1"
          >
            {filter.label}
            <span className="text-xs opacity-70">{filter.count}</span>
          </Button>
        ))}
      </div>

      {/* Members list */}
      <div className="space-y-3">
        {loading ? (
          [1, 2, 3].map(i => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4"><div className="h-4 bg-muted rounded w-1/3" /></CardContent>
            </Card>
          ))
        ) : filteredMembers.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">No members found</p>
            </CardContent>
          </Card>
        ) : (
          filteredMembers.map((member) => (
            <Card key={member.user_id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-start gap-3 sm:gap-4">
                  <Avatar className="h-10 w-10 sm:h-12 sm:w-12">
                    {member.avatar_url && <AvatarImage src={member.avatar_url} />}
                    <AvatarFallback>{getInitials(member.display_name)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-semibold text-sm sm:text-base">{member.display_name || 'Member'}</h3>
                      <div className="flex gap-1 sm:gap-2">
                        <Button variant="outline" size="sm" className="gap-1 h-7 sm:h-8 text-xs" onClick={() => setChatMember(member)}>
                          <MessageCircle className="h-3 w-3" />
                          <span className="hidden sm:inline">Chat</span>
                        </Button>
                        <Button variant="outline" size="sm" className="gap-1 h-7 sm:h-8 text-xs" onClick={() => { setMembershipMember(member); setMembershipTab('membership') }}>
                          <Settings className="h-3 w-3" />
                          <span className="hidden sm:inline">Membership</span>
                        </Button>
                      </div>
                    </div>
                    {member.bio && (
                      <p className="text-xs sm:text-sm text-muted-foreground mb-2 line-clamp-1">{member.bio}</p>
                    )}
                    <div className="flex items-center gap-3 sm:gap-4 text-[10px] sm:text-xs text-muted-foreground flex-wrap">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Active {timeAgo(member.created_at)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Joined {formatDate(member.created_at)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Tag className="h-3 w-3" />Free
                      </span>
                      <span className="flex items-center gap-1 hidden sm:flex">
                        <RefreshCw className="h-3 w-3" />Lifetime access
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Chat Popup Dialog */}
      <Dialog open={!!chatMember} onOpenChange={() => setChatMember(null)}>
        <DialogContent className="max-w-md p-0 gap-0">
          {chatMember && (
            <>
              {/* Chat Header */}
              <div className="flex items-center gap-3 p-4 border-b">
                <Avatar className="h-10 w-10">
                  {chatMember.avatar_url && <AvatarImage src={chatMember.avatar_url} />}
                  <AvatarFallback>{getInitials(chatMember.display_name)}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h3 className="font-semibold text-sm">{chatMember.display_name || 'Member'}</h3>
                  <p className="text-xs text-muted-foreground">Active {timeAgo(chatMember.created_at)}</p>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8"><ExternalLink className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
              </div>

              {/* Chat Body */}
              <div className="h-64 flex flex-col items-center justify-center px-6 text-center">
                <div className="flex items-center gap-2 mb-3">
                  <Avatar className="h-10 w-10 border-2 border-background">
                    {profile?.avatar_url && <AvatarImage src={profile.avatar_url} />}
                    <AvatarFallback>{getInitials(profile?.display_name || 'U')}</AvatarFallback>
                  </Avatar>
                  <RefreshCw className="h-4 w-4 text-muted-foreground" />
                  <Avatar className="h-10 w-10 border-2 border-background">
                    {chatMember.avatar_url && <AvatarImage src={chatMember.avatar_url} />}
                    <AvatarFallback>{getInitials(chatMember.display_name)}</AvatarFallback>
                  </Avatar>
                </div>
                <p className="text-sm text-muted-foreground">
                  You and {chatMember.display_name} know each other from TruHeirs
                </p>
                <p className="text-sm text-muted-foreground mt-1">You're about to break the ice!</p>
              </div>

              {/* Chat Input */}
              <div className="flex items-center gap-2 p-3 border-t">
                <Input
                  placeholder={`Message ${chatMember.display_name?.split(' ')[0] || 'member'}...`}
                  value={chatMessage}
                  onChange={e => setChatMessage(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSendChat()}
                  className="border-0 bg-transparent focus-visible:ring-0"
                />
                <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0"><Paperclip className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0"><Smile className="h-4 w-4" /></Button>
                <Button size="icon" className="h-8 w-8 flex-shrink-0" onClick={handleSendChat} disabled={!chatMessage.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Membership Settings Dialog */}
      <Dialog open={!!membershipMember} onOpenChange={() => setMembershipMember(null)}>
        <DialogContent className="max-w-2xl p-0 gap-0">
          {membershipMember && (
            <>
              {/* Header */}
              <div className="flex items-center gap-3 p-4 border-b">
                <Avatar className="h-12 w-12">
                  {membershipMember.avatar_url && <AvatarImage src={membershipMember.avatar_url} />}
                  <AvatarFallback>{getInitials(membershipMember.display_name)}</AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-bold">{membershipMember.display_name || 'Member'}</h3>
                  <p className="text-sm text-muted-foreground">Membership settings</p>
                </div>
              </div>

              <div className="flex min-h-[400px]">
                {/* Tab Sidebar */}
                <div className="w-48 border-r p-3 space-y-1">
                  {membershipTabs.map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setMembershipTab(tab.id)}
                      className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                        membershipTab === tab.id 
                          ? 'bg-[#ffb500]/20 text-foreground' 
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Tab Content */}
                <div className="flex-1 p-4 sm:p-6">
                  {membershipTab === 'membership' && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-sm w-16">Email:</span>
                        <span className="text-sm text-muted-foreground">{membershipMember.email || 'Not available'}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-sm w-16">Role:</span>
                        <span className="text-sm">Member</span>
                        <button className="text-primary text-sm hover:underline">(change)</button>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-sm w-16">Tier:</span>
                        <span className="text-sm">Standard</span>
                        <button className="text-primary text-sm hover:underline">(change)</button>
                      </div>
                      <div className="space-y-2 pt-2">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4" />Joined {formatDate(membershipMember.created_at)}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Tag className="h-4 w-4" />Free
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <RefreshCw className="h-4 w-4" />Lifetime access
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span className="text-xs font-semibold">LTV</span> $0 lifetime value
                        </div>
                      </div>
                      <div className="pt-4 space-y-2">
                        <button className="text-sm text-muted-foreground hover:text-destructive transition-colors">Remove from group</button>
                        <br />
                        <button className="text-sm text-muted-foreground hover:text-destructive transition-colors">Ban from group</button>
                      </div>
                    </div>
                  )}

                  {membershipTab === 'courses' && (
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-semibold text-sm mb-3">Has access to:</h4>
                        <div className="space-y-3">
                          <div>
                            <p className="text-sm">Onboarding Videos <span className="text-green-500">(100% progress)</span></p>
                            <p className="text-xs text-muted-foreground">Open: All members have access</p>
                          </div>
                          <div>
                            <p className="text-sm">Legacy Launchpad Course <span className="text-green-500">(2% progress)</span></p>
                            <p className="text-xs text-muted-foreground">Open: All members have access</p>
                          </div>
                        </div>
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm mb-2">Give access to:</h4>
                        <Select>
                          <SelectTrigger><SelectValue placeholder="Select course" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="onboarding">Onboarding Videos</SelectItem>
                            <SelectItem value="legacy">Legacy Launchpad Course</SelectItem>
                            <SelectItem value="project">Project-Based Team Course</SelectItem>
                            <SelectItem value="performance">Performance-Based Team Course</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}

                  {membershipTab === 'payments' && (
                    <div>
                      <h4 className="font-semibold text-sm mb-3">Payment history</h4>
                      <p className="text-sm text-muted-foreground">User has no payment history.</p>
                    </div>
                  )}

                  {membershipTab === 'questions' && (
                    <div>
                      <h4 className="font-semibold text-sm mb-3">Membership questions:</h4>
                      <div className="space-y-4">
                        <div>
                          <p className="text-sm font-medium">Have you signed your Program Services Agreement yet? If NO, you need to do that FIRST.</p>
                          <p className="text-sm text-muted-foreground mt-1">Yes</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium">What is the date of your program purchase?</p>
                          <p className="text-sm text-muted-foreground mt-1">N/A</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium">What email address did you use for your enrollment?</p>
                          <p className="text-sm text-muted-foreground mt-1">{membershipMember.email || 'Not provided'}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Invite Dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Invite Member</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Email address</Label>
              <Input placeholder="email@example.com" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} type="email" />
            </div>
            <Button className="w-full" onClick={handleInvite} disabled={!inviteEmail.trim()} style={{ backgroundColor: '#ffb500', color: '#290a52' }}>
              Send Invitation
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
