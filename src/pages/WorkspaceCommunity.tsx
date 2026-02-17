import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { 
  Image, Video, ThumbsUp, MessageCircle, Send, Pin, 
  MoreHorizontal, Settings, Filter, Users, Wifi 
} from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface Post {
  id: string
  content: string
  user_id: string
  created_at: string
  image_url: string | null
  video_url: string | null
  author_name: string
  author_avatar: string | null
  likes_count: number
  comments_count: number
  is_liked: boolean
  channel_id: string | null
}

const PROGRAM_NAMES: Record<string, string> = {
  fbu: 'Family Business University',
  tfv: 'The Family Vault',
  tfba: 'Family Business Accelerator',
}

const PROGRAM_DESCRIPTIONS: Record<string, string> = {
  fbu: 'The #1 Guided Generational Wealth Community teaching families how to build lasting legacies.',
  tfv: 'Exclusive vault of resources, templates, and tools for family wealth management.',
  tfba: 'The #1 Guided Generational Wealth Community teaching you how to setup private irrevocable trusts!',
}

const CATEGORIES = [
  { label: 'All', value: 'all', emoji: '' },
  { label: 'Discussion', value: 'discussion', emoji: '💬' },
  { label: 'Wins', value: 'wins', emoji: '🏆' },
  { label: 'Updates', value: 'updates', emoji: '📣' },
  { label: 'Gems', value: 'gems', emoji: '💎' },
  { label: 'Recordings', value: 'recordings', emoji: '🎥' },
]

export default function WorkspaceCommunity() {
  const { user, profile } = useAuth()
  const { toast } = useToast()
  const [searchParams] = useSearchParams()
  const program = searchParams.get('program') || 'tfba'
  const programName = PROGRAM_NAMES[program] || 'Community'
  const programDesc = PROGRAM_DESCRIPTIONS[program] || ''
  const [newPost, setNewPost] = useState('')
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState('all')
  const [memberCount, setMemberCount] = useState(0)
  const [onlineCount] = useState(Math.floor(Math.random() * 5) + 1)

  const fetchPosts = useCallback(async () => {
    try {
      const { data: postsData, error } = await supabase
        .from('community_posts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(30)

      if (error) throw error

      // Fetch likes and comments counts
      const postIds = (postsData || []).map(p => p.id)
      
      const [{ data: likes }, { data: comments }] = await Promise.all([
        supabase.from('community_reactions').select('post_id, user_id').in('post_id', postIds.length ? postIds : ['']),
        supabase.from('community_comments').select('post_id').in('post_id', postIds.length ? postIds : ['']),
      ])

      // Fetch author profiles
      const userIds = [...new Set((postsData || []).map(p => p.user_id))]
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url')
        .in('id', userIds.length ? userIds : [''])

      const profileMap = new Map((profiles || []).map(p => [p.id, p]))

      setPosts((postsData || []).map(post => {
        const authorProfile = profileMap.get(post.user_id)
        const postLikes = (likes || []).filter(l => l.post_id === post.id)
        const postComments = (comments || []).filter(c => c.post_id === post.id)
        
        return {
          id: post.id,
          content: post.content,
          user_id: post.user_id,
          created_at: post.created_at,
          image_url: post.image_url,
          video_url: post.video_url,
          author_name: authorProfile?.display_name || 'Member',
          author_avatar: authorProfile?.avatar_url || null,
          likes_count: postLikes.length,
          comments_count: postComments.length,
          is_liked: postLikes.some(l => l.user_id === user?.id),
          channel_id: post.channel_id,
        }
      }))
    } catch (error) {
      console.error('Error fetching posts:', error)
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    fetchPosts()
  }, [fetchPosts])

  useEffect(() => {
    const fetchMemberCount = async () => {
      const { count } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
      setMemberCount(count || 0)
    }
    fetchMemberCount()
  }, [])

  const handleCreatePost = async () => {
    if (!newPost.trim() || !user?.id) return

    try {
      const { error } = await supabase
        .from('community_posts')
        .insert({ content: newPost.trim(), user_id: user.id })

      if (error) throw error
      setNewPost('')
      fetchPosts()
      toast({ title: 'Posted!', description: 'Your post has been shared.' })
    } catch (error) {
      console.error('Error creating post:', error)
      toast({ title: 'Error', description: 'Failed to create post.', variant: 'destructive' })
    }
  }

  const handleLike = async (postId: string, isLiked: boolean) => {
    if (!user?.id) return

    try {
      if (isLiked) {
        await supabase
          .from('community_reactions')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', user.id)
      } else {
        await supabase
          .from('community_reactions')
          .insert({ post_id: postId, user_id: user.id, reaction_type: 'like' })
      }
      fetchPosts()
    } catch (error) {
      console.error('Error toggling like:', error)
    }
  }

  const handleDeletePost = async (postId: string) => {
    try {
      const { error } = await supabase
        .from('community_posts')
        .delete()
        .eq('id', postId)
      if (error) throw error
      fetchPosts()
      toast({ title: 'Post deleted' })
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to delete post.', variant: 'destructive' })
    }
  }

  const getInitials = (name: string) =>
    name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 60) return `${mins}m`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}h`
    const days = Math.floor(hours / 24)
    if (days < 30) return `${days}d`
    const months = Math.floor(days / 30)
    return `${months}mo`
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Main Feed */}
          <div className="flex-1 min-w-0 space-y-4">
            {/* Post Composer */}
            <Card className="border-border/50">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10 flex-shrink-0">
                    {profile?.avatar_url && <AvatarImage src={profile.avatar_url} />}
                    <AvatarFallback className="bg-primary/10 text-primary text-sm">
                      {getInitials(profile?.display_name || 'U')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <Textarea
                      placeholder="Write something..."
                      value={newPost}
                      onChange={(e) => setNewPost(e.target.value)}
                      className="min-h-[44px] max-h-[120px] resize-none border-0 bg-muted/50 rounded-full px-4 py-2.5 focus-visible:ring-1 text-sm"
                      rows={1}
                    />
                  </div>
                  <Button
                    size="sm"
                    onClick={handleCreatePost}
                    disabled={!newPost.trim()}
                    className="flex-shrink-0 gap-1.5"
                  >
                    <Send className="h-4 w-4" />
                    <span className="hidden sm:inline">Post</span>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Category Filters */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.value}
                  onClick={() => setActiveCategory(cat.value)}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    activeCategory === cat.value
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                  }`}
                >
                  {cat.emoji && <span className="mr-1">{cat.emoji}</span>}
                  {cat.label}
                </button>
              ))}
              <button className="flex-shrink-0 p-1.5 rounded-full bg-muted/50 hover:bg-muted text-muted-foreground">
                <Filter className="h-4 w-4" />
              </button>
            </div>

            {/* Feed */}
            <div className="space-y-3">
              {loading ? (
                [1, 2, 3].map(i => (
                  <Card key={i} className="animate-pulse border-border/50">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex gap-3">
                        <div className="h-10 w-10 rounded-full bg-muted" />
                        <div className="space-y-2 flex-1">
                          <div className="h-3 bg-muted rounded w-1/4" />
                          <div className="h-3 bg-muted rounded w-3/4" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : posts.length === 0 ? (
                <Card className="border-border/50">
                  <CardContent className="p-8 text-center">
                    <MessageCircle className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-50" />
                    <h3 className="font-semibold mb-1">No posts yet</h3>
                    <p className="text-sm text-muted-foreground">Be the first to share something!</p>
                  </CardContent>
                </Card>
              ) : (
                posts.map(post => (
                  <Card key={post.id} className="border-border/50 hover:border-border transition-colors">
                    <CardContent className="p-4">
                      {/* Post Header */}
                      <div className="flex items-start gap-3">
                        <Avatar className="h-10 w-10 flex-shrink-0">
                          {post.author_avatar && <AvatarImage src={post.author_avatar} />}
                          <AvatarFallback className="bg-primary/10 text-primary text-sm">
                            {getInitials(post.author_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-sm">{post.author_name}</span>
                            <span className="text-xs text-muted-foreground">{timeAgo(post.created_at)}</span>
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Discussion</Badge>
                          </div>
                          
                          {/* Post Content */}
                          <p className="text-sm mt-2 whitespace-pre-wrap leading-relaxed">{post.content}</p>
                          
                          {post.image_url && (
                            <img
                              src={post.image_url}
                              alt=""
                              className="rounded-lg mt-3 max-h-80 object-cover w-full"
                            />
                          )}

                          {/* Post Actions */}
                          <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border/50">
                            <button
                              onClick={() => handleLike(post.id, post.is_liked)}
                              className={`flex items-center gap-1.5 text-sm transition-colors ${
                                post.is_liked ? 'text-primary font-medium' : 'text-muted-foreground hover:text-foreground'
                              }`}
                            >
                              <ThumbsUp className={`h-4 w-4 ${post.is_liked ? 'fill-current' : ''}`} />
                              {post.likes_count > 0 && post.likes_count}
                            </button>
                            <button className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
                              <MessageCircle className="h-4 w-4" />
                              {post.comments_count > 0 && post.comments_count}
                            </button>
                          </div>
                        </div>

                        {/* Post Menu */}
                        {post.user_id === user?.id && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => handleDeletePost(post.id)}
                              >
                                Delete Post
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="w-full lg:w-72 xl:w-80 flex-shrink-0 space-y-4">
            {/* Community Info Card */}
            <Card className="border-border/50">
              <CardContent className="p-4 text-center space-y-3">
                <h3 className="font-bold text-lg">{programName}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{programDesc}</p>
                <div className="flex justify-center gap-6 py-2">
                  <div className="text-center">
                    <p className="font-bold text-lg">{memberCount}</p>
                    <p className="text-xs text-muted-foreground">Members</p>
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-lg">{onlineCount}</p>
                    <p className="text-xs text-muted-foreground">Online</p>
                  </div>
                </div>
                <Button variant="outline" className="w-full text-sm" size="sm">
                  <Settings className="h-3.5 w-3.5 mr-1.5" />
                  Settings
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      
      <div className="pb-20 md:pb-0" />
    </div>
  )
}
