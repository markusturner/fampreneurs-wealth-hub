import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/integrations/supabase/client'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { formatDistanceToNow } from 'date-fns'
import { 
  Heart, 
  MessageCircle, 
  Send, 
  MoreHorizontal,
  Laugh,
  ThumbsUp,
  Angry,
  Frown
} from 'lucide-react'

interface Post {
  id: string
  user_id: string
  content: string
  image_url: string | null
  created_at: string
  profiles: {
    display_name: string | null
    first_name: string | null
    avatar_url: string | null
  } | null
}

interface Comment {
  id: string
  user_id: string
  content: string
  created_at: string
  profiles: {
    display_name: string | null
    first_name: string | null
    avatar_url: string | null
  } | null
}

interface Reaction {
  id: string
  user_id: string
  reaction_type: string
}

interface PostCardProps {
  post: Post
  onUpdate: () => void
}

const reactionEmojis = {
  like: '👍',
  love: '❤️',
  laugh: '😂',
  wow: '😮',
  sad: '😢',
  angry: '😡'
}

export const PostCard = ({ post, onUpdate }: PostCardProps) => {
  const { user } = useAuth()
  const { toast } = useToast()
  const [comments, setComments] = useState<Comment[]>([])
  const [reactions, setReactions] = useState<Reaction[]>([])
  const [newComment, setNewComment] = useState('')
  const [showComments, setShowComments] = useState(false)
  const [isSubmittingComment, setIsSubmittingComment] = useState(false)

  const authorName = post.profiles?.display_name || post.profiles?.first_name || 'Anonymous'
  const authorAvatar = post.profiles?.avatar_url

  const fetchComments = async () => {
    try {
      // First fetch comments
      const { data: commentsData, error: commentsError } = await supabase
        .from('community_comments')
        .select('*')
        .eq('post_id', post.id)
        .order('created_at', { ascending: true })

      if (commentsError) throw commentsError

      // Then fetch profiles for each comment
      const commentsWithProfiles = await Promise.all(
        (commentsData || []).map(async (comment) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('display_name, first_name, avatar_url')
            .eq('user_id', comment.user_id)
            .single()

          return {
            ...comment,
            profiles: profile
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
    fetchComments()
    fetchReactions()
  }, [post.id])

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
        .from('community_comments')
        .insert({
          post_id: post.id,
          user_id: user.id,
          content: newComment.trim()
        })

      if (error) throw error

      setNewComment('')
      fetchComments()
      
      toast({
        title: "Success",
        description: "Comment added!"
      })
    } catch (error) {
      console.error('Error adding comment:', error)
      toast({
        title: "Error",
        description: "Failed to add comment. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsSubmittingComment(false)
    }
  }

  const userReaction = reactions.find(r => r.user_id === user?.id)
  const reactionCounts = reactions.reduce((acc, reaction) => {
    acc[reaction.reaction_type] = (acc[reaction.reaction_type] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  return (
    <Card className="shadow-soft">
      <CardHeader className="pb-3 p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <Avatar className="h-10 w-10 flex-shrink-0">
              <AvatarImage src={authorAvatar || ''} />
              <AvatarFallback>
                {authorName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
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
        <div className="flex items-center gap-1 sm:gap-2 pt-2 border-t">
          <Button
            variant={userReaction ? "default" : "ghost"}
            size="sm"
            onClick={() => handleReaction('like')}
            className="flex-1 gap-1 min-h-[36px]"
          >
            <ThumbsUp className="h-4 w-4" />
            <span className="hidden sm:inline">Like</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowComments(!showComments)}
            className="flex-1 gap-1 min-h-[36px]"
          >
            <MessageCircle className="h-4 w-4" />
            <span className="hidden sm:inline">Comment</span>
          </Button>
        </div>

        {/* Reaction Options */}
        <div className="flex items-center gap-1 flex-wrap">
          {Object.entries(reactionEmojis).map(([type, emoji]) => (
            <Button
              key={type}
              variant={userReaction?.reaction_type === type ? "default" : "outline"}
              size="sm"
              onClick={() => handleReaction(type)}
              className="text-xs min-h-[32px] px-2"
            >
              {emoji}
            </Button>
          ))}
        </div>

        {/* Comments Section */}
        {showComments && (
          <div className="space-y-4 pt-4 border-t">
            {/* Add Comment */}
            <form onSubmit={handleComment} className="flex gap-2">
              <Textarea
                placeholder="Write a comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                rows={2}
                className="flex-1 resize-none text-sm min-h-[60px]"
              />
              <Button
                type="submit"
                size="sm"
                disabled={isSubmittingComment || !newComment.trim()}
                className="min-h-[40px] px-3"
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>

            {/* Comments List */}
            <div className="space-y-3">
              {comments.map((comment) => (
                <div key={comment.id} className="flex gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={comment.profiles?.avatar_url || ''} />
                    <AvatarFallback>
                      {(comment.profiles?.display_name || comment.profiles?.first_name || 'A').charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 bg-muted p-3 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-xs">
                        {comment.profiles?.display_name || comment.profiles?.first_name || 'Anonymous'}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-sm">{comment.content}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}