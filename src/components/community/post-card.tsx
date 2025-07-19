import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/integrations/supabase/client'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { formatDistanceToNow } from 'date-fns'
import EmojiPicker from 'emoji-picker-react'
import { 
  Heart, 
  MessageCircle, 
  Send, 
  MoreHorizontal,
  Smile,
  Play,
  Pause,
  Volume2,
  Reply,
  ThumbsUp
} from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

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

interface Comment extends Post {
  replies?: Comment[]
}

interface Reaction {
  id: string
  user_id: string
  reaction_type: string
}

interface PostCardProps {
  post: Post
  onUpdate: () => void
  isReply?: boolean
  depth?: number
}

const reactionEmojis = {
  like: '👍',
  love: '❤️',
  laugh: '😂',
  wow: '😮',
  sad: '😢',
  angry: '😡'
}

export const PostCard = ({ post, onUpdate, isReply = false, depth = 0 }: PostCardProps) => {
  const { user } = useAuth()
  const { toast } = useToast()
  const [comments, setComments] = useState<Comment[]>([])
  const [reactions, setReactions] = useState<Reaction[]>([])
  const [newComment, setNewComment] = useState('')
  const [showComments, setShowComments] = useState(false)
  const [showReplyForm, setShowReplyForm] = useState(false)
  const [isSubmittingComment, setIsSubmittingComment] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null)

  const authorName = post.profiles?.display_name || post.profiles?.first_name || 'Anonymous'
  const authorAvatar = post.profiles?.avatar_url

  const fetchComments = async () => {
    try {
      const { data: commentsData, error: commentsError } = await supabase
        .from('community_posts')
        .select('*')
        .eq('parent_id', post.id)
        .order('created_at', { ascending: true })

      if (commentsError) throw commentsError

      // Fetch profiles separately for each comment
      const commentsWithProfiles = await Promise.all(
        (commentsData || []).map(async (comment) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('display_name, first_name, avatar_url')
            .eq('user_id', comment.user_id)
            .single()

          return {
            ...comment,
            profiles: profile || null
          }
        })
      )

      setComments(commentsWithProfiles)
    } catch (error) {
      console.error('Error fetching comments:', error)
    }
  }

  const fetchReactions = async () => {
    try {
      const { data, error } = await supabase
        .from('community_reactions')
        .select('*')
        .eq('post_id', post.id)

      if (error) throw error
      setReactions(data || [])
    } catch (error) {
      console.error('Error fetching reactions:', error)
    }
  }

  useEffect(() => {
    if (!isReply) {
      fetchComments()
      fetchReactions()
    }
  }, [post.id, isReply])

  const handleReaction = async (reactionType: string) => {
    if (!user) return

    try {
      const existingReaction = reactions.find(
        r => r.user_id === user.id && r.reaction_type === reactionType
      )

      if (existingReaction) {
        // Remove reaction
        const { error } = await supabase
          .from('community_reactions')
          .delete()
          .eq('id', existingReaction.id)

        if (error) throw error
      } else {
        // Add reaction (remove other reactions first)
        await supabase
          .from('community_reactions')
          .delete()
          .eq('post_id', post.id)
          .eq('user_id', user.id)

        const { error } = await supabase
          .from('community_reactions')
          .insert({
            post_id: post.id,
            user_id: user.id,
            reaction_type: reactionType
          })

        if (error) throw error
      }

      fetchReactions()
    } catch (error) {
      console.error('Error handling reaction:', error)
      toast({
        title: "Error",
        description: "Failed to update reaction. Please try again.",
        variant: "destructive"
      })
    }
  }

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!newComment.trim() || !user) return

    setIsSubmittingComment(true)

    try {
      const { error } = await supabase
        .from('community_posts')
        .insert({
          parent_id: post.id,
          user_id: user.id,
          content: newComment.trim()
        })

      if (error) throw error

      setNewComment('')
      setShowReplyForm(false)
      fetchComments()
      
      toast({
        title: "Success",
        description: "Comment added!"
      })
    } catch (error) {
      console.error('Error adding comment:', error)
      toast({
        title: "Error",
        description: "Failed to add comment",
        variant: "destructive"
      })
    } finally {
      setIsSubmittingComment(false)
    }
  }

  const playAudio = () => {
    if (!post.audio_url) return

    if (audio) {
      if (isPlaying) {
        audio.pause()
        setIsPlaying(false)
      } else {
        audio.play()
        setIsPlaying(true)
      }
    } else {
      const newAudio = new Audio(post.audio_url)
      newAudio.addEventListener('ended', () => setIsPlaying(false))
      newAudio.play()
      setAudio(newAudio)
      setIsPlaying(true)
    }
  }

  const userReaction = reactions.find(r => r.user_id === user?.id)
  const reactionCounts = reactions.reduce((acc, reaction) => {
    acc[reaction.reaction_type] = (acc[reaction.reaction_type] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const marginLeft = depth > 0 ? `${depth * 20}px` : '0px'

  return (
    <Card className="shadow-soft" style={{ marginLeft }}>
      <CardHeader className="pb-3 p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 border">
              {authorAvatar ? (
                <img 
                  src={authorAvatar} 
                  alt={authorName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-primary text-primary-foreground flex items-center justify-center text-sm">
                  {authorName.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-sm truncate">{authorName}</p>
              <p className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="flex-shrink-0">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 p-4 sm:p-6">
        {/* Post Content */}
        {post.content && (
          <p className="text-sm sm:text-base leading-relaxed">{post.content}</p>
        )}

        {/* Post Image */}
        {post.image_url && (
          <img
            src={post.image_url}
            alt="Post image"
            className="w-full rounded-lg object-cover max-h-96"
          />
        )}

        {/* Audio Player */}
        {post.audio_url && (
          <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
            <Button
              variant="ghost"
              size="sm"
              onClick={playAudio}
              className="h-8 w-8 p-0"
            >
              {isPlaying ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4" />
              )}
            </Button>
            <div className="flex-1">
              <div className="text-sm font-medium">Audio Message</div>
              <div className="text-xs text-muted-foreground">
                {isPlaying ? 'Playing...' : 'Click to play'}
              </div>
            </div>
          </div>
        )}

        {/* Reactions Summary */}
        {Object.keys(reactionCounts).length > 0 && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              {Object.entries(reactionCounts).map(([type, count]) => (
                <span key={type} className="flex items-center gap-1">
                  {reactionEmojis[type as keyof typeof reactionEmojis]} {count}
                </span>
              ))}
            </div>
            {comments.length > 0 && (
              <span className="ml-auto">{comments.length} comments</span>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-2 border-t">
          <Button
            variant={userReaction ? "default" : "ghost"}
            size="sm"
            onClick={() => handleReaction('like')}
            className="flex-1 gap-1"
          >
            <ThumbsUp className="h-4 w-4" />
            Like
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowComments(!showComments)}
            className="flex-1 gap-1"
          >
            <MessageCircle className="h-4 w-4" />
            Comment
          </Button>
          {!isReply && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowReplyForm(!showReplyForm)}
              className="flex-1 gap-1"
            >
              <Reply className="h-4 w-4" />
              Reply
            </Button>
          )}
        </div>

        {/* Reaction Options */}
        <div className="flex items-center gap-1 flex-wrap">
          {Object.entries(reactionEmojis).map(([type, emoji]) => (
            <Button
              key={type}
              variant={userReaction?.reaction_type === type ? "default" : "outline"}
              size="sm"
              onClick={() => handleReaction(type)}
              className="text-xs h-8 px-2"
            >
              {emoji}
            </Button>
          ))}
        </div>

        {/* Reply Form */}
        {showReplyForm && !isReply && (
          <form onSubmit={handleComment} className="flex gap-2 pt-4 border-t">
            <Textarea
              placeholder="Write a reply..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              rows={2}
              className="flex-1 resize-none text-sm"
            />
            <Button
              type="submit"
              size="sm"
              disabled={isSubmittingComment || !newComment.trim()}
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
        )}

        {/* Comments Section */}
        {showComments && comments.length > 0 && !isReply && (
          <div className="space-y-3 pt-4 border-t">
            {comments.map((comment) => (
              <PostCard
                key={comment.id}
                post={comment}
                onUpdate={fetchComments}
                isReply={true}
                depth={depth + 1}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}