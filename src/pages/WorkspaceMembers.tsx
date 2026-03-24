import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { useIsAdminOrOwner } from '@/hooks/useIsAdminOrOwner'
import { useToast } from '@/hooks/use-toast'
import { Search, Clock, Calendar, Tag, RefreshCw, MessageCircle, Settings, ArrowUpDown, CheckCircle, XCircle } from 'lucide-react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'

interface Member {
  user_id: string
  display_name: string | null
  avatar_url: string | null
  bio: string | null
  created_at: string
  email?: string | null
  status?: string
}

interface Course {
  id: string
  title: string
  status: string
}

type StatusFilter = 'active' | 'cancelling' | 'churned' | 'banned'
type SortOption = 'newest' | 'oldest' | 'name_asc' | 'name_desc'
type MembershipTab = 'membership' | 'courses' | 'questions'

export default function WorkspaceMembers() {
  const { user, profile } = useAuth()
  const { isAdminOrOwner } = useIsAdminOrOwner()
  const { toast } = useToast()
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState<StatusFilter>('active')
  const [sortBy, setSortBy] = useState<SortOption>('newest')

  // Profile dialog
  const [profileMember, setProfileMember] = useState<Member | null>(null)

  // Chat popup state
  const [chatMember, setChatMember] = useState<Member | null>(null)
  const [chatMessage, setChatMessage] = useState('')

  // Membership dialog
  const [membershipMember, setMembershipMember] = useState<Member | null>(null)
  const [membershipTab, setMembershipTab] = useState<MembershipTab>('membership')

  // Courses from DB
  const [courses, setCourses] = useState<Course[]>([])
  const [memberCourseEnrollments, setMemberCourseEnrollments] = useState<{course_id: string; progress: number}[]>([])

  // Questions data
  const [memberAgreement, setMemberAgreement] = useState<any>(null)
  const [memberOnboarding, setMemberOnboarding] = useState<any>(null)

  useEffect(() => { fetchMembers(); fetchCourses() }, [])

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

  const fetchCourses = async () => {
    try {
      const { data } = await supabase.from('courses').select('id, title, status').order('title')
      setCourses(data || [])
    } catch (e) { console.error(e) }
  }

  const fetchMembershipData = async (memberId: string) => {
    // Fetch course enrollments
    const { data: enrollments } = await supabase
      .from('course_enrollments')
      .select('course_id, progress')
      .eq('user_id', memberId)
    setMemberCourseEnrollments(enrollments || [])

    // Fetch agreement status
    const { data: agreement } = await supabase
      .from('program_agreements')
      .select('*')
      .eq('user_id', memberId)
      .maybeSingle()
    setMemberAgreement(agreement)

    // Fetch onboarding responses
    const { data: onboarding } = await supabase
      .from('onboarding_responses')
      .select('*')
      .eq('user_id', memberId)
      .maybeSingle()
    setMemberOnboarding(onboarding)
  }

  const sortedAndFiltered = members
    .filter(m => {
      if (activeFilter !== 'active' && m.status !== activeFilter) return false
      if (searchQuery) return m.display_name?.toLowerCase().includes(searchQuery.toLowerCase())
      return true
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'oldest': return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        case 'name_asc': return (a.display_name || '').localeCompare(b.display_name || '')
        case 'name_desc': return (b.display_name || '').localeCompare(a.display_name || '')
        default: return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      }
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

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

  const handleSendChat = async () => {
    if (!chatMessage.trim() || !chatMember || !user) return
    try {
      const { error } = await supabase
        .from('direct_messages')
        .insert({ sender_id: user.id, receiver_id: chatMember.user_id, content: chatMessage.trim() })
      if (error) throw error
      toast({ title: 'Message sent', description: `Message sent to ${chatMember.display_name}` })
      setChatMessage('')
    } catch (error) {
      console.error('Error sending message:', error)
      toast({ title: 'Error', description: 'Failed to send message', variant: 'destructive' })
    }
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
    { id: 'questions', label: 'Questions' },
  ]

  const openMembership = (member: Member) => {
    setMembershipMember(member)
    setMembershipTab('membership')
    fetchMembershipData(member.user_id)
  }

  // Parse onboarding responses for display
  const getOnboardingQA = () => {
    if (!memberOnboarding) return []
    const qa: { question: string; answer: string }[] = []
    const fields: Record<string, string> = {
      full_name: 'Full Name',
      tshirt_size: 'T-Shirt Size',
      mailing_address: 'Mailing Address',
      first_touchpoint: 'How did you first hear about us?',
      decision_reason: 'What made you decide to join?',
      investment_reason: 'Why did you invest?',
      join_elaboration: 'Tell us more about why you joined',
      time_to_decide: 'How long did it take you to decide?',
      improvement_suggestion: 'What could we improve?',
      why_markus: 'Why Markus?',
      final_push: 'What was the final push?',
      pre_call_conviction: 'Pre-call conviction level',
      biggest_hesitation: 'Biggest hesitation',
      why_choose_me: 'Why did you choose us over others?',
      specific_content: 'What specific content are you most excited about?',
      anything_else: 'Anything else you want us to know?',
    }
    for (const [key, label] of Object.entries(fields)) {
      if (memberOnboarding[key]) {
        qa.push({ question: label, answer: String(memberOnboarding[key]) })
      }
    }
    return qa
  }

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
            <Input placeholder="Search members" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9 w-full sm:w-64" />
          </div>
        </div>
      </div>

      {/* Filters + Sort */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
          {isAdminOrOwner && filters.map(filter => (
            <Button
              key={filter.id}
              variant={activeFilter === filter.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveFilter(filter.id)}
              className="rounded-full gap-1 h-7 sm:h-8 text-[11px] sm:text-xs px-2 sm:px-3"
            >
              {filter.label}
              <span className="text-[10px] sm:text-xs opacity-70">{filter.count}</span>
            </Button>
          ))}
        </div>
        <Select value={sortBy} onValueChange={v => setSortBy(v as SortOption)}>
          <SelectTrigger className="w-[160px] h-8 text-xs">
            <ArrowUpDown className="h-3 w-3 mr-1" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest First</SelectItem>
            <SelectItem value="oldest">Oldest First</SelectItem>
            <SelectItem value="name_asc">Name A-Z</SelectItem>
            <SelectItem value="name_desc">Name Z-A</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Members list */}
      <div className="space-y-3">
        {loading ? (
          [1, 2, 3].map(i => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4"><div className="h-4 bg-muted rounded w-1/3" /></CardContent>
            </Card>
          ))
        ) : sortedAndFiltered.length === 0 ? (
          <Card><CardContent className="p-8 text-center"><p className="text-muted-foreground">No members found</p></CardContent></Card>
        ) : (
          sortedAndFiltered.map(member => (
            <Card
              key={member.user_id}
              className="transition-all duration-200 cursor-pointer hover:border-[#ffb500] hover:shadow-md hover:shadow-[#ffb500]/10"
              onClick={() => setProfileMember(member)}
            >
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-start gap-3 sm:gap-4">
                  <Avatar className="h-10 w-10 sm:h-12 sm:w-12">
                    {member.avatar_url && <AvatarImage src={member.avatar_url} />}
                    <AvatarFallback>{getInitials(member.display_name)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-semibold text-sm sm:text-base">{member.display_name || 'Member'}</h3>
                      <div className="flex gap-1 sm:gap-2" onClick={e => e.stopPropagation()}>
                        <Button variant="outline" size="sm" className="gap-1 h-7 sm:h-8 text-xs" onClick={() => navigate(`/messenger?user=${member.user_id}`)}>
                          <MessageCircle className="h-3 w-3" />
                          <span className="hidden sm:inline">Chat</span>
                        </Button>
                        <Button variant="outline" size="sm" className="gap-1 h-7 sm:h-8 text-xs" onClick={() => openMembership(member)}>
                          <Settings className="h-3 w-3" />
                          <span className="hidden sm:inline">Membership</span>
                        </Button>
                      </div>
                    </div>
                    {member.bio && <p className="text-xs sm:text-sm text-muted-foreground mb-2 line-clamp-1">{member.bio}</p>}
                    <div className="flex items-center gap-3 sm:gap-4 text-[10px] sm:text-xs text-muted-foreground flex-wrap">
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" />Active {timeAgo(member.created_at)}</span>
                      <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />Joined {formatDate(member.created_at)}</span>
                      <span className="flex items-center gap-1"><Tag className="h-3 w-3" />Free</span>
                      <span className="flex items-center gap-1 hidden sm:flex"><RefreshCw className="h-3 w-3" />Lifetime access</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Profile Dialog */}
      <Dialog open={!!profileMember} onOpenChange={() => setProfileMember(null)}>
        <DialogContent className="max-w-md p-0 gap-0 overflow-hidden">
          {profileMember && (
            <>
              <div className="bg-gradient-to-br from-[#290a52] to-[#6215C8] p-6 text-center text-white">
                <Avatar className="h-20 w-20 mx-auto border-4 border-white/20 mb-3">
                  {profileMember.avatar_url && <AvatarImage src={profileMember.avatar_url} />}
                  <AvatarFallback className="text-lg bg-[#ffb500] text-[#290a52]">{getInitials(profileMember.display_name)}</AvatarFallback>
                </Avatar>
                <h2 className="font-bold text-xl">{profileMember.display_name || 'Member'}</h2>
                {profileMember.bio && <p className="text-white/70 text-sm mt-1 line-clamp-2">{profileMember.bio}</p>}
              </div>
              <div className="p-5 space-y-4">
                <div className="grid grid-cols-3 text-center gap-4">
                  <div><p className="text-lg font-bold">0</p><p className="text-xs text-muted-foreground">Contributions</p></div>
                  <div><p className="text-lg font-bold">0</p><p className="text-xs text-muted-foreground">Followers</p></div>
                  <div><p className="text-lg font-bold">0</p><p className="text-xs text-muted-foreground">Following</p></div>
                </div>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2"><Clock className="h-4 w-4" />Active {timeAgo(profileMember.created_at)}</div>
                  <div className="flex items-center gap-2"><Calendar className="h-4 w-4" />Joined {formatDate(profileMember.created_at)}</div>
                </div>
                <div className="flex gap-2">
                  <Button className="flex-1" variant="outline" onClick={() => { setProfileMember(null); setChatMember(profileMember) }}>
                    <MessageCircle className="h-4 w-4 mr-2" /> Chat
                  </Button>
                  <Button className="flex-1" style={{ backgroundColor: '#ffb500', color: '#290a52' }} onClick={() => { setProfileMember(null); openMembership(profileMember) }}>
                    <Settings className="h-4 w-4 mr-2" /> Membership
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Chat Popup Dialog */}
      <Dialog open={!!chatMember} onOpenChange={() => setChatMember(null)}>
        <DialogContent className="max-w-md p-0 gap-0">
          {chatMember && (
            <>
              <div className="flex items-center gap-3 p-4 border-b">
                <Avatar className="h-10 w-10">
                  {chatMember.avatar_url && <AvatarImage src={chatMember.avatar_url} />}
                  <AvatarFallback>{getInitials(chatMember.display_name)}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h3 className="font-semibold text-sm">{chatMember.display_name || 'Member'}</h3>
                  <p className="text-xs text-muted-foreground">Active {timeAgo(chatMember.created_at)}</p>
                </div>
              </div>
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
                <p className="text-sm text-muted-foreground">You and {chatMember.display_name} know each other from TruHeirs</p>
                <p className="text-sm text-muted-foreground mt-1">You're about to break the ice!</p>
              </div>
              <div className="flex items-center gap-2 p-3 border-t">
                <Input
                  placeholder={`Message ${chatMember.display_name?.split(' ')[0] || 'member'}...`}
                  value={chatMessage}
                  onChange={e => setChatMessage(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSendChat()}
                  className="border-0 bg-transparent focus-visible:ring-0"
                />
                <Button size="icon" className="h-8 w-8 flex-shrink-0" onClick={handleSendChat} disabled={!chatMessage.trim()}>
                  <MessageCircle className="h-4 w-4" />
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
                <div className="w-48 border-r p-3 space-y-1">
                  {membershipTabs.map(tab => (
                    <button key={tab.id} onClick={() => setMembershipTab(tab.id)}
                      className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${membershipTab === tab.id ? 'bg-[#ffb500]/20 text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'}`}>
                      {tab.label}
                    </button>
                  ))}
                </div>
                <div className="flex-1 p-4 sm:p-6">
                  {membershipTab === 'membership' && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-3"><span className="font-semibold text-sm w-16">Email:</span><span className="text-sm text-muted-foreground">{membershipMember.email || 'Not available'}</span></div>
                      <div className="flex items-center gap-3"><span className="font-semibold text-sm w-16">Role:</span><span className="text-sm">Member</span><button className="text-primary text-sm hover:underline">(change)</button></div>
                      <div className="flex items-center gap-3"><span className="font-semibold text-sm w-16">Tier:</span><span className="text-sm">Standard</span><button className="text-primary text-sm hover:underline">(change)</button></div>
                      <div className="space-y-2 pt-2">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground"><Calendar className="h-4 w-4" />Joined {formatDate(membershipMember.created_at)}</div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground"><Tag className="h-4 w-4" />Free</div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground"><RefreshCw className="h-4 w-4" />Lifetime access</div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground"><span className="text-xs font-semibold">LTV</span> $0 lifetime value</div>
                      </div>
                      <div className="pt-4 space-y-2">
                        <button className="text-sm text-muted-foreground hover:text-destructive transition-colors">Remove from group</button><br/>
                        <button className="text-sm text-muted-foreground hover:text-destructive transition-colors">Ban from group</button>
                      </div>
                    </div>
                  )}
                  {membershipTab === 'courses' && (
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-semibold text-sm mb-3">Has access to:</h4>
                        <div className="space-y-3">
                          {courses.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No courses available yet.</p>
                          ) : (
                            courses.map(course => {
                              const enrollment = memberCourseEnrollments.find(e => e.course_id === course.id)
                              return (
                                <div key={course.id}>
                                  <p className="text-sm">{course.title} {enrollment ? <span className="text-green-500">({enrollment.progress || 0}% progress)</span> : <span className="text-muted-foreground">(not enrolled)</span>}</p>
                                </div>
                              )
                            })
                          )}
                        </div>
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm mb-2">Give access to:</h4>
                        <Select>
                          <SelectTrigger><SelectValue placeholder="Select course" /></SelectTrigger>
                          <SelectContent>
                            {courses.map(course => (
                              <SelectItem key={course.id} value={course.id}>{course.title}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}
                  {membershipTab === 'questions' && (
                    <div className="space-y-4">
                      <h4 className="font-semibold text-sm mb-3">Membership Questions</h4>
                      
                      {/* Agreement Status */}
                      <div className="p-3 rounded-lg border">
                        <div className="flex items-center gap-2 mb-1">
                          {memberAgreement ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <XCircle className="h-4 w-4 text-destructive" />
                          )}
                          <p className="text-sm font-medium">Program Services Agreement</p>
                        </div>
                        <p className="text-sm text-muted-foreground ml-6">
                          {memberAgreement 
                            ? `Signed on ${new Date(memberAgreement.signed_at || memberAgreement.created_at).toLocaleDateString()}`
                            : 'Not yet signed'
                          }
                        </p>
                      </div>

                      {/* Onboarding Responses */}
                      <div>
                        <h5 className="text-sm font-medium mb-2">Onboarding Form Responses</h5>
                        {!memberOnboarding ? (
                          <p className="text-sm text-muted-foreground">No onboarding form submitted yet.</p>
                        ) : (
                          <div className="space-y-3">
                            {getOnboardingQA().map((qa, i) => (
                              <div key={i}>
                                <p className="text-sm font-medium">{qa.question}</p>
                                <p className="text-sm text-muted-foreground mt-0.5">{qa.answer}</p>
                              </div>
                            ))}
                            {getOnboardingQA().length === 0 && (
                              <p className="text-sm text-muted-foreground">No responses recorded.</p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
