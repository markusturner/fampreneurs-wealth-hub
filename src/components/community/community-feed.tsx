import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/integrations/supabase/client'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { formatDistanceToNow } from 'date-fns'
import { Megaphone } from 'lucide-react'
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

      // Filter by channel if selected
      if (selectedChannelId) {
        query = query.eq('channel_id', selectedChannelId)
      }

      const { data: postsData, error: postsError } = await query

      if (postsError) throw postsError

      // Fetch profiles separately for each post
      const postsWithProfiles = await Promise.all(
        (postsData || []).map(async (post) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('display_name, first_name, avatar_url')
            .eq('user_id', post.user_id)
            .single()

          return {
            ...post,
            profiles: profile || null
          }
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

      // Fetch profiles separately for each announcement
      const announcementsWithProfiles = await Promise.all(
        (announcementsData || []).map(async (announcement) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('display_name, first_name')
            .eq('user_id', announcement.created_by)
            .single()

          return {
            ...announcement,
            profiles: profile || null
          }
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
    <div className="w-full">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 px-4 py-6">
        {/* Channels Sidebar - Hidden on mobile, 3 columns on large screens */}
        <div className="hidden lg:block lg:col-span-3">
          <div className="sticky top-24">
              <GroupChannelsSidebar
                selectedGroupId={selectedChannelId}
                onGroupSelect={setSelectedChannelId}
              />
          </div>
        </div>

        {/* Main Feed - Full width on mobile, 6 columns on large screens */}
        <div className="col-span-1 lg:col-span-6 space-y-6">
          {/* Create Post */}
          <Card>
            <CardContent className="p-4 lg:p-6">
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
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-muted-foreground">
                  {selectedChannelId ? 'No posts in this channel yet.' : 'No posts yet. Be the first to share!'}
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Announcements Panel - Hidden on mobile, 3 columns on large screens */}
        <div className="hidden lg:block lg:col-span-3">
          <div className="sticky top-6">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Megaphone className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold">Announcements</h3>
                  </div>
                  <CreateAnnouncement onAnnouncementCreated={fetchAnnouncements} />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
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
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}