import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/integrations/supabase/client'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { formatDistanceToNow } from 'date-fns'
import { Megaphone, MessageSquare, Users, Calendar, BookOpen, Home, VideoIcon, ImageIcon, MicIcon, FileText, BarChart3, MapPin } from 'lucide-react'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Link } from 'react-router-dom'
import { EnhancedPostCard } from './enhanced-post-card'
import { EnhancedCreatePost } from './enhanced-create-post'
import { GroupChannelsSidebar } from './group-channels-sidebar'
import { CreateAnnouncement } from './create-announcement'
import { AnnouncementCard } from './announcement-card'
import { PollCreationDialog } from './poll-creation-dialog'
import { CreateStoryDialog } from './create-story-dialog'
import { StoryViewer } from './story-viewer'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

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

interface Story {
  id: string
  user_id: string
  content_type: 'image' | 'video'
  content_url: string
  caption: string | null
  created_at: string
  profiles: {
    display_name: string | null
    first_name: string | null
    avatar_url: string | null
  } | null
}

export function CommunityFeed() {
  const { user, profile } = useAuth()
  const { toast } = useToast()
  const [posts, setPosts] = useState<Post[]>([])
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [members, setMembers] = useState<any[]>([])
  const [stories, setStories] = useState<Story[]>([])
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null)
  const [storyViewerOpen, setStoryViewerOpen] = useState(false)
  const [selectedStoryIndex, setSelectedStoryIndex] = useState(0)
  const [composerOpen, setComposerOpen] = useState(false)

  const handleVideoClick = () => {
    toast({
      title: "Live Video",
      description: "Video feature coming soon!",
    })
  }

  const handlePhotoVideoClick = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*,video/*'
    input.click()
  }

  const handleAudioClick = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'audio/*'
    input.click()
  }

  const handleDocumentClick = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.pdf,.doc,.docx,.txt'
    input.click()
  }

  const handlePollClick = () => {
    toast({
      title: "Create Poll",
      description: "Poll feature coming soon!",
    })
  }

  const handleLocationClick = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          toast({
            title: "Location Shared",
            description: `Lat: ${position.coords.latitude.toFixed(4)}, Lng: ${position.coords.longitude.toFixed(4)}`,
          })
        },
        () => {
          toast({
            title: "Location Error",
            description: "Unable to get your location",
            variant: "destructive",
          })
        }
      )
    } else {
      toast({
        title: "Location Not Supported",
        description: "Geolocation is not supported by this browser",
        variant: "destructive",
      })
    }
  }

  useEffect(() => {
    fetchPosts()
    fetchAnnouncements()
    fetchMembers()
    fetchStories()
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

  const fetchMembers = async () => {
    try {
      const { data: membersData, error: membersError } = await supabase
        .from('profiles')
        .select('user_id, display_name, first_name, avatar_url')
        .order('created_at', { ascending: false })
        .limit(10)

      if (membersError) throw membersError
      setMembers(membersData || [])
    } catch (error) {
      console.error('Error fetching members:', error)
    }
  }

  const fetchStories = async () => {
    try {
      const { data: storiesData, error: storiesError } = await supabase
        .from('stories')
        .select('*')
        .eq('is_active', true)
        .gte('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })

      if (storiesError) throw storiesError

      const storiesWithProfiles = await Promise.all(
        (storiesData || []).map(async (story) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('display_name, first_name, avatar_url')
            .eq('user_id', story.user_id)
            .single()

          return { 
            ...story, 
            content_type: story.content_type as 'image' | 'video',
            profiles: profile || null 
          }
        })
      )

      setStories(storiesWithProfiles)
    } catch (error) {
      console.error('Error fetching stories:', error)
    }
  }

  const handleStoryView = async (storyId: string) => {
    if (!user) return

    try {
      await supabase
        .from('story_views')
        .upsert({
          story_id: storyId,
          viewer_id: user.id
        })

      // Update view count
      const { data: story } = await supabase
        .from('stories')
        .select('view_count')
        .eq('id', storyId)
        .single()

      if (story) {
        await supabase
          .from('stories')
          .update({ view_count: (story.view_count || 0) + 1 })
          .eq('id', storyId)
      }
    } catch (error) {
      console.error('Error recording story view:', error)
    }
  }

  const getDisplayName = (user: any) => {
    if (user?.display_name) return user.display_name
    if (user?.first_name) return user.first_name
    return 'Anonymous'
  }

  return (
      <div className="min-h-screen bg-background">
        {/* Mobile Composer (top) */}
        <div className="p-4 lg:hidden">
          <Card className="border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Avatar className="w-10 h-10">
                  <AvatarImage src={profile?.avatar_url || undefined} alt="Profile" className="object-cover" />
                  <AvatarFallback className="bg-primary/20 text-primary">
                    {profile?.display_name?.[0] || profile?.first_name?.[0] || 'U'}
                  </AvatarFallback>
                </Avatar>
                <button
                  type="button"
                  onClick={() => setComposerOpen(true)}
                  className="flex-1 bg-muted rounded-full px-4 py-2 text-left text-muted-foreground hover:bg-muted/70 transition-colors"
                >
                  {`What's on your mind, ${profile?.first_name || 'there'}?`}
                </button>
              </div>
            </CardContent>
          </Card>
        </div>

        <Dialog open={composerOpen} onOpenChange={setComposerOpen}>
          <DialogContent className="sm:max-w-[560px]">
            <DialogHeader>
              <DialogTitle>Share an update</DialogTitle>
            </DialogHeader>
            <EnhancedCreatePost 
              onPostCreated={() => { setComposerOpen(false); fetchPosts(); }}
              channelId={selectedChannelId}
            />
            <div className="pt-2 lg:hidden">
              <PollCreationDialog onPollCreated={() => { setComposerOpen(false); fetchPosts(); }}>
                <button className="w-full text-sm text-center text-primary underline underline-offset-2">
                  Create a poll
                </button>
              </PollCreationDialog>
            </div>
          </DialogContent>
        </Dialog>

        {/* Mobile Announcements at top */}
        <div className="px-4 lg:hidden mb-4">
          <div className="bg-card border border-border rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Megaphone className="h-4 w-4 text-secondary" />
                <h3 className="font-semibold">Announcements</h3>
              </div>
              <CreateAnnouncement onAnnouncementCreated={fetchAnnouncements} />
            </div>
            <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1">
              {announcements.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">No announcements yet</p>
              ) : (
                announcements.map((announcement) => (
                  <div key={announcement.id} className="min-w-[85%]">
                    <AnnouncementCard announcement={announcement} onUpdate={fetchAnnouncements} />
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Stories Section - Full Width */}
      <div className="w-full bg-card border-b border-border p-4 mt-2">
        <div className="flex gap-4 overflow-x-auto pb-2">
          {/* Create Story */}
          <CreateStoryDialog onStoryCreated={fetchStories}>
            <div className="flex-shrink-0 w-28 h-40 bg-gradient-to-b from-muted to-muted/50 rounded-xl relative overflow-hidden cursor-pointer hover:scale-105 transition-transform">
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <div className="absolute top-3 left-3 w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                <span className="text-xs font-bold text-primary-foreground">+</span>
              </div>
              <div className="absolute bottom-3 left-3 right-3">
                <p className="text-xs text-white font-medium">Create story</p>
              </div>
            </div>
          </CreateStoryDialog>
          
          {/* User Stories */}
          {stories.map((story, index) => (
            <div 
              key={story.id} 
              className="flex-shrink-0 w-28 h-40 rounded-xl relative overflow-hidden cursor-pointer hover:scale-105 transition-transform"
              onClick={() => {
                setSelectedStoryIndex(index)
                setStoryViewerOpen(true)
              }}
            >
              {story.content_type === 'image' ? (
                <img 
                  src={story.content_url} 
                  alt="Story" 
                  className="w-full h-full object-cover"
                />
              ) : (
                <video 
                  src={story.content_url} 
                  className="w-full h-full object-cover"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <div className="absolute top-3 left-3 w-8 h-8 rounded-full border-2 border-white overflow-hidden">
                <Avatar className="w-full h-full">
                  <AvatarImage src={story.profiles?.avatar_url || undefined} />
                  <AvatarFallback className="text-xs">
                    {getDisplayName(story.profiles)?.[0]}
                  </AvatarFallback>
                </Avatar>
              </div>
              <div className="absolute bottom-3 left-3 right-3">
                <p className="text-xs text-white font-medium truncate">
                  {getDisplayName(story.profiles)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Moved: Mobile composer now rendered above */}

      {/* Moved: Mobile announcements now rendered above */}

      {/* Main Content */}
      <div className="flex w-full max-w-7xl mx-auto gap-6 p-4 flex-col lg:flex-row">
        {/* Feed Content */}
        <div className="w-full lg:flex-1 lg:max-w-2xl space-y-4">
            {/* Create Post */}
            <Card className="border-border hidden lg:block">
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-4">
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={profile?.avatar_url || undefined} alt="Profile" className="object-cover" />
                    <AvatarFallback className="bg-primary/20 text-primary">
                      {profile?.display_name?.[0] || profile?.first_name?.[0] || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <input 
                    type="text"
                    placeholder={`What's on your mind, ${profile?.first_name || 'there'}?`}
                    className="flex-1 bg-muted rounded-full px-4 py-2 border-none outline-none text-foreground placeholder:text-muted-foreground"
                  />
                </div>
                
                {/* Action buttons */}
                <div className="flex items-center gap-2 pt-3 border-t border-border flex-wrap">
                  <button 
                    onClick={handlePhotoVideoClick}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted/50 text-muted-foreground transition-colors"
                  >
                    <ImageIcon className="h-4 w-4" />
                    <span className="text-sm">Photo/video</span>
                  </button>
                  <button 
                    onClick={handleAudioClick}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted/50 text-muted-foreground transition-colors"
                  >
                    <MicIcon className="h-4 w-4" />
                    <span className="text-sm">Audio</span>
                  </button>
                  <button 
                    onClick={handleDocumentClick}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted/50 text-muted-foreground transition-colors"
                  >
                    <FileText className="h-4 w-4" />
                    <span className="text-sm">Document</span>
                  </button>
                  <PollCreationDialog onPollCreated={fetchPosts}>
                    <button className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted/50 text-muted-foreground transition-colors">
                      <BarChart3 className="h-4 w-4" />
                      <span className="text-sm">Poll</span>
                    </button>
                  </PollCreationDialog>
                  <button 
                    onClick={handleLocationClick}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted/50 text-muted-foreground transition-colors"
                  >
                    <MapPin className="h-4 w-4" />
                    <span className="text-sm">Location</span>
                  </button>
                </div>
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

          {/* Right Sidebar */}
          <div className="w-full lg:w-80 bg-card border border-border rounded-lg overflow-y-visible lg:overflow-y-auto lg:sticky lg:top-4 h-fit mt-4 lg:mt-0">
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

              {/* Members */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-foreground">Members</h3>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="space-y-2">
                  {members.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No members yet
                    </p>
                  ) : (
                    members.map((member) => (
                      <Link
                        key={member.user_id}
                        to={`/member/${member.user_id}`}
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                      >
                        <div className="relative">
                          <Avatar className="w-8 h-8">
                            <AvatarImage src={member.avatar_url || undefined} alt="Member" className="object-cover" />
                            <AvatarFallback className="bg-primary/20 text-primary text-xs">
                              {getDisplayName(member)?.[0] || 'M'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
                        </div>
                        <span className="text-sm font-medium">{getDisplayName(member)}</span>
                      </Link>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
      </div>

      <StoryViewer
        stories={stories}
        initialStoryIndex={selectedStoryIndex}
        open={storyViewerOpen}
        onOpenChange={setStoryViewerOpen}
        onViewStory={handleStoryView}
      />
    </div>
  )
}