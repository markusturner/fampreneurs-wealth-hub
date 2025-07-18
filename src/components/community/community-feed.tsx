import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/integrations/supabase/client'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import { formatDistanceToNow } from 'date-fns'
import EmojiPicker from 'emoji-picker-react'
import { 
  Heart, 
  MessageCircle, 
  Send, 
  MoreHorizontal,
  Smile,
  ImagePlus,
  Mic,
  MicOff,
  Play,
  Pause,
  Volume2,
  Reply,
  ThumbsUp,
  Megaphone
} from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { PostCard } from './post-card'
import { CreatePost } from './create-post'

interface Post {
  id: string
  user_id: string
  content: string
  image_url: string | null
  audio_url: string | null
  created_at: string
  parent_id: string | null
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

  useEffect(() => {
    fetchPosts()
    fetchAnnouncements()
  }, [])

  const fetchPosts = async () => {
    try {
      const { data: postsData, error: postsError } = await supabase
        .from('community_posts')
        .select('*')
        .is('parent_id', null)
        .order('created_at', { ascending: false })

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
    <div className="flex gap-6">
      {/* Main Feed */}
      <div className="flex-1 space-y-6">
        {/* Create Post */}
        <Card>
          <CardContent className="p-4">
            <CreatePost onPostCreated={fetchPosts} />
          </CardContent>
        </Card>

        {/* Posts */}
        {posts.map((post) => (
          <PostCard key={post.id} post={post} onUpdate={fetchPosts} />
        ))}
      </div>

      {/* Announcements Panel */}
      <div className="w-80 space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Announcements</h3>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {announcements.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No announcements yet
              </p>
            ) : (
              announcements.map((announcement) => (
                <div key={announcement.id} className="p-3 bg-muted rounded-lg">
                  <h4 className="font-medium text-sm mb-1">{announcement.title}</h4>
                  <p className="text-xs text-muted-foreground mb-2">
                    {announcement.content}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      by {getDisplayName(announcement.profiles)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(announcement.created_at), { addSuffix: true })}
                    </span>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}