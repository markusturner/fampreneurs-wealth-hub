import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { Search, MessageCircle, Settings, UserPlus, Clock, Calendar, MapPin, Tag, RefreshCw } from 'lucide-react'

interface Member {
  user_id: string
  display_name: string | null
  avatar_url: string | null
  bio: string | null
  created_at: string
  last_sign_in?: string | null
}

type StatusFilter = 'active' | 'cancelling' | 'churned' | 'banned'

export default function WorkspaceMembers() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState<StatusFilter>('active')

  useEffect(() => {
    fetchMembers()
  }, [])

  const fetchMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, display_name, avatar_url, bio, created_at')
        .order('created_at', { ascending: false })

      if (error) throw error
      setMembers(data || [])
    } catch (error) {
      console.error('Error fetching members:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredMembers = members.filter(m => {
    if (!searchQuery) return true
    return m.display_name?.toLowerCase().includes(searchQuery.toLowerCase())
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

  const filters: { id: StatusFilter; label: string; count?: number }[] = [
    { id: 'active', label: 'Active', count: members.length },
    { id: 'cancelling', label: 'Cancelling' },
    { id: 'churned', label: 'Churned' },
    { id: 'banned', label: 'Banned' },
  ]

  return (
    <div className="container mx-auto px-4 py-6 max-w-5xl space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Members</h1>
          <p className="text-muted-foreground text-sm">Manage community members</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search members"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 w-64"
            />
          </div>
          <Button className="gap-2" style={{ backgroundColor: '#ffb500', color: '#290a52' }}>
            <UserPlus className="h-4 w-4" />
            Invite
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
            {filter.count !== undefined && (
              <span className="text-xs opacity-70">{filter.count}</span>
            )}
          </Button>
        ))}
        <div className="flex-1" />
        <Button variant="outline" size="sm" className="gap-1">
          <Settings className="h-3 w-3" />
          Filter
        </Button>
      </div>

      {/* Members list */}
      <div className="space-y-3">
        {loading ? (
          [1, 2, 3].map(i => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="h-4 bg-muted rounded w-1/3" />
              </CardContent>
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
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <Avatar className="h-12 w-12">
                    {member.avatar_url && <AvatarImage src={member.avatar_url} />}
                    <AvatarFallback>{getInitials(member.display_name)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-semibold">{member.display_name || 'Member'}</h3>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="gap-1 h-8">
                          <MessageCircle className="h-3 w-3" />
                          Chat
                        </Button>
                        <Button variant="outline" size="sm" className="gap-1 h-8">
                          <Settings className="h-3 w-3" />
                          Membership
                        </Button>
                      </div>
                    </div>
                    {member.bio && (
                      <p className="text-sm text-muted-foreground mb-2 line-clamp-1">{member.bio}</p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Active {timeAgo(member.created_at)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Joined {formatDate(member.created_at)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Tag className="h-3 w-3" />
                        Free
                      </span>
                      <span className="flex items-center gap-1">
                        <RefreshCw className="h-3 w-3" />
                        Lifetime access
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
