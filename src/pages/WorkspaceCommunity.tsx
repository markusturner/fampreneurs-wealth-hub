import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { Image, Video, FileText, Heart, MessageCircle, Share2, MoreHorizontal, Send } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { useEffect } from 'react'

interface Post {
  id: string
  content: string
  user_id: string
  created_at: string
  image_url: string | null
  author_name?: string
  author_avatar?: string
  likes_count: number
  comments_count: number
}

const PROGRAM_NAMES: Record<string, string> = {
  fbu: 'Family Business University',
  tfv: 'The Family Vault',
  tfba: 'Family Business Accelerator',
}

export default function WorkspaceCommunity() {
  const { user, profile } = useAuth()
  const { toast } = useToast()
  const [searchParams] = useSearchParams()
  const program = searchParams.get('program') || 'tfba'
  const programName = PROGRAM_NAMES[program] || 'Community'
  const [newPost, setNewPost] = useState('')
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPosts()
  }, [program])

  const fetchPosts = async () => {
    try {
      const { data, error } = await supabase
        .from('community_posts')
        .select(`
          *,
          profiles:user_id (display_name, avatar_url)
        `)
        .order('created_at', { ascending: false })
        .limit(20)

      if (error) throw error

      setPosts((data || []).map((post: any) => ({
        id: post.id,
        content: post.content,
        user_id: post.user_id,
        created_at: post.created_at,
        image_url: post.image_url,
        author_name: post.profiles?.display_name || 'Member',
        author_avatar: post.profiles?.avatar_url,
        likes_count: 0,
        comments_count: 0,
      })))
    } catch (error) {
      console.error('Error fetching posts:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreatePost = async () => {
    if (!newPost.trim() || !user?.id) return

    try {
      const { error } = await supabase
        .from('community_posts')
        .insert({
          content: newPost.trim(),
          user_id: user.id,
        })

      if (error) throw error

      setNewPost('')
      fetchPosts()
      toast({ title: 'Posted!', description: 'Your post has been shared.' })
    } catch (error) {
      console.error('Error creating post:', error)
      toast({ title: 'Error', description: 'Failed to create post.', variant: 'destructive' })
    }
  }

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime()
    const hours = Math.floor(diff / 3600000)
    if (hours < 1) return 'Just now'
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    return `${days}d ago`
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{programName}</h1>
        <p className="text-muted-foreground text-sm">Share updates, ask questions, and connect with the community</p>
      </div>

      {/* Post composer */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Avatar className="h-10 w-10">
              {profile?.avatar_url ? (
                <AvatarImage src={profile.avatar_url} />
              ) : null}
              <AvatarFallback>{getInitials(profile?.display_name || 'U')}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <Textarea
                placeholder={`What's on your mind, ${profile?.first_name || 'there'}?`}
                value={newPost}
                onChange={(e) => setNewPost(e.target.value)}
                className="min-h-[60px] resize-none border-0 p-0 focus-visible:ring-0 shadow-none"
              />
              <div className="flex items-center justify-between mt-3 pt-3 border-t">
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground">
                    <Image className="h-4 w-4" />
                    <span className="hidden sm:inline">Photo</span>
                  </Button>
                  <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground">
                    <Video className="h-4 w-4" />
                    <span className="hidden sm:inline">Video</span>
                  </Button>
                </div>
                <Button 
                  size="sm" 
                  onClick={handleCreatePost} 
                  disabled={!newPost.trim()}
                  className="gap-1"
                >
                  <Send className="h-4 w-4" />
                  Post
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Feed */}
      <div className="space-y-4">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-4">
                  <div className="h-4 bg-muted rounded w-1/3 mb-3" />
                  <div className="h-3 bg-muted rounded w-full mb-2" />
                  <div className="h-3 bg-muted rounded w-2/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : posts.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <MessageCircle className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
              <h3 className="font-medium mb-1">No posts yet</h3>
              <p className="text-sm text-muted-foreground">Be the first to share something with the community!</p>
            </CardContent>
          </Card>
        ) : (
          posts.map((post) => (
            <Card key={post.id}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Avatar className="h-10 w-10">
                    {post.author_avatar ? <AvatarImage src={post.author_avatar} /> : null}
                    <AvatarFallback>{getInitials(post.author_name || 'M')}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">{post.author_name}</span>
                      <span className="text-xs text-muted-foreground">{timeAgo(post.created_at)}</span>
                    </div>
                    <p className="text-sm mt-2 whitespace-pre-wrap">{post.content}</p>
                    {post.image_url && (
                      <img src={post.image_url} alt="" className="rounded-lg mt-3 max-h-96 object-cover w-full" />
                    )}
                    <div className="flex items-center gap-4 mt-3 pt-3 border-t">
                      <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground h-8">
                        <Heart className="h-4 w-4" />
                        Like
                      </Button>
                      <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground h-8">
                        <MessageCircle className="h-4 w-4" />
                        Comment
                      </Button>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
