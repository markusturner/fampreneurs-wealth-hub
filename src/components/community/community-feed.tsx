import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/integrations/supabase/client'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { formatDistanceToNow } from 'date-fns'
import { Megaphone, MessageSquare, Users, Calendar, BookOpen, Home } from 'lucide-react'
import { Link } from 'react-router-dom'
import { EnhancedPostCard } from './enhanced-post-card'
import { EnhancedCreatePost } from './enhanced-create-post'
import { GroupChannelsSidebar } from './group-channels-sidebar'
import { CreateAnnouncement } from './create-announcement'
import { AnnouncementCard } from './announcement-card'

interface Post {
  id: string
  user_id: string
  content: string
  image_url: string | null
  audio_url: string | null
  video_url: string | null
  created_at: string
  parent_id: string | null
  channel_id: string | null
  profiles: {
    display_name: string | null
    first_name: string | null
    avatar_url: string | null
  } | null
}

interface Announcement {
  id: string
  title: string
  content: string
  created_at: string
  is_pinned: boolean
  created_by: string
  expires_at: string | null
  profiles: {
    display_name: string | null
    first_name: string | null
  } | null
}

export function CommunityFeed() {
  const { user, profile } = useAuth()
  const { toast } = useToast()
  const [posts, setPosts] = useState<Post[]>([])
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null)

  useEffect(() => {
    fetchPosts()
    fetchAnnouncements()
  }, [selectedChannelId])

  const fetchPosts = async () => {
    try {
      let query = supabase
        .from('community_posts')
        .select('*')
        .is('parent_id', null)
        .order('created_at', { ascending: false })

      if (selectedChannelId) {
        query = query.eq('channel_id', selectedChannelId)
      }

      const { data: postsData, error: postsError } = await query
      if (postsError) throw postsError

      const postsWithProfiles = await Promise.all(
        (postsData || []).map(async (post) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('display_name, first_name, avatar_url')
            .eq('user_id', post.user_id)
            .single()

          return { ...post, profiles: profile || null }
        })
      )

      setPosts(postsWithProfiles)
    } catch (error) {
      console.error('Error fetching posts:', error)
    }
  }

  const fetchAnnouncements = async () => {
    try {
      const { data: announcementsData, error: announcementsError } = await supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5)

      if (announcementsError) throw announcementsError

      const announcementsWithProfiles = await Promise.all(
        (announcementsData || []).map(async (announcement) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('display_name, first_name')
            .eq('user_id', announcement.created_by)
            .single()

          return { ...announcement, profiles: profile || null }
        })
      )

      setAnnouncements(announcementsWithProfiles)
    } catch (error) {
      console.error('Error fetching announcements:', error)
    }
  }

  const getDisplayName = (user: any) => {
    if (user?.display_name) return user.display_name
    if (user?.first_name) return user.first_name
    return 'Anonymous'
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="flex w-full">
        {/* Main Content Area */}
        <div className="flex-1">
          {/* Stories Section */}
          <div className="bg-card border-b border-border p-4">
            <div className="flex gap-4 overflow-x-auto pb-2">
              {/* Create Story */}
              <div className="flex-shrink-0 w-28 h-40 bg-gradient-to-b from-muted to-muted/50 rounded-xl relative overflow-hidden cursor-pointer hover:scale-105 transition-transform">
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute top-3 left-3 w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                  <span className="text-xs font-bold text-primary-foreground">+</span>
                </div>
                <div className="absolute bottom-3 left-3 right-3">
                  <p className="text-xs text-white font-medium">Create story</p>
                </div>
              </div>
              
              {/* Sample Stories */}
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="flex-shrink-0 w-28 h-40 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl relative overflow-hidden cursor-pointer hover:scale-105 transition-transform">
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute top-3 left-3 w-8 h-8 bg-primary rounded-full border-2 border-white" />
                  <div className="absolute bottom-3 left-3 right-3">
                    <p className="text-xs text-white font-medium">Member {i}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Feed Content */}
          <div className="max-w-2xl mx-auto p-4 space-y-4">
            {/* Create Post */}
            <Card className="border-border">
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                    <span className="text-sm font-semibold text-primary">
                      {profile?.display_name?.[0] || profile?.first_name?.[0] || 'U'}
                    </span>
                  </div>
                  <div className="flex-1 bg-muted rounded-full px-4 py-2 cursor-pointer hover:bg-muted/80">
                    <span className="text-muted-foreground">What's on your mind, {profile?.first_name || 'there'}?</span>
                  </div>
                </div>
                <EnhancedCreatePost 
                  onPostCreated={fetchPosts} 
                  channelId={selectedChannelId}
                />
              </CardContent>
            </Card>

            {/* Posts */}
            <div className="space-y-4">
              {posts.map((post) => (
                <EnhancedPostCard key={post.id} post={post} onUpdate={fetchPosts} />
              ))}
            </div>

            {posts.length === 0 && (
              <Card className="border-border">
                <CardContent className="p-8 text-center">
                  <p className="text-muted-foreground">
                    {selectedChannelId ? 'No posts in this channel yet.' : 'No posts yet. Be the first to share!'}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="hidden xl:block w-80 fixed right-0 top-16 h-[calc(100vh-4rem)] bg-card border-l border-border overflow-y-auto">
          <div className="p-4 space-y-6">


            {/* Announcements */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Megaphone className="h-4 w-4 text-secondary" />
                  <h3 className="font-semibold">Announcements</h3>
                </div>
                <CreateAnnouncement onAnnouncementCreated={fetchAnnouncements} />
              </div>
              <div className="space-y-3">
                {announcements.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No announcements yet
                  </p>
                ) : (
                  announcements.map((announcement) => (
                    <AnnouncementCard 
                      key={announcement.id} 
                      announcement={announcement} 
                      onUpdate={fetchAnnouncements} 
                    />
                  ))
                )}
              </div>
            </div>

            {/* Contacts */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-foreground">Contacts</h3>
                <Users className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer">
                    <div className="relative">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-400 to-blue-500" />
                      <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
                    </div>
                    <span className="text-sm font-medium">Member {i}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}