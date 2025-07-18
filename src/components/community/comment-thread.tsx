import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/integrations/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useToast } from '@/hooks/use-toast'
import { formatDistanceToNow } from 'date-fns'
import { 
  MessageCircle, 
  MoreHorizontal,
  ThumbsUp,
  Edit,
  Trash2
} from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { CommentWithMentions } from './comment-with-mentions'

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

interface CommentReaction {
  id: string
  user_id: string
  reaction_type: string
}

interface CommentThreadProps {
  comment: Comment
  postId: string
  channelId: string | null
  onUpdate: () => void
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

export const CommentThread = ({ comment, postId, channelId, onUpdate, depth = 0 }: CommentThreadProps) => {
  const { user } = useAuth()
  const { toast } = useToast()
  const [replies, setReplies] = useState<Comment[]>([])
  const [reactions, setReactions] = useState<CommentReaction[]>([])
  const [showReplies, setShowReplies] = useState(false)
  const [showReplyForm, setShowReplyForm] = useState(false)
  const [showReactionPicker, setShowReactionPicker] = useState(false)

  const authorName = comment.profiles?.display_name || comment.profiles?.first_name || 'Anonymous'
  const authorAvatar = comment.profiles?.avatar_url
  const isOwner = user?.id === comment.user_id

  const fetchReplies = async () => {
    try {
      const { data: repliesData, error } = await supabase
        .from('community_posts')
        .select('*')
        .eq('parent_id', comment.id)
        .order('created_at', { ascending: true })

      if (error) throw error

      const repliesWithProfiles = await Promise.all(
        (repliesData || []).map(async (reply) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('display_name, first_name, avatar_url')
            .eq('user_id', reply.user_id)
            .single()

          return {
            ...reply,
            profiles: profile || null
          }
        })
      )

      setReplies(repliesWithProfiles)
    } catch (error) {
      console.error('Error fetching replies:', error)
    }
  }

  const fetchReactions = async () => {
    try {
      const { data, error } = await supabase
        .from('community_comment_reactions')
        .select('*')
        .eq('comment_id', comment.id)

      if (error) throw error
      setReactions(data || [])
    } catch (error) {
      console.error('Error fetching reactions:', error)
    }
  }

  useEffect(() => {
    fetchReplies()
    fetchReactions()
  }, [comment.id])

  const handleReaction = async (reactionType: string) => {
    if (!user) return

    try {
      const existingReaction = reactions.find(
        r => r.user_id === user.id && r.reaction_type === reactionType
      )

      if (existingReaction) {
        // Remove reaction
        const { error } = await supabase
          .from('community_comment_reactions')
          .delete()
          .eq('id', existingReaction.id)

        if (error) throw error
      } else {
        // Remove other reactions first, then add new one
        await supabase
          .from('community_comment_reactions')
          .delete()
          .eq('comment_id', comment.id)
          .eq('user_id', user.id)

        const { error } = await supabase
          .from('community_comment_reactions')
          .insert({
            comment_id: comment.id,
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

  const handleDelete = async () => {
    try {
      const { error } = await supabase
        .from('community_posts')
        .delete()
        .eq('id', comment.id)

      if (error) throw error

      toast({
        title: "Success",
        description: "Comment deleted!"
      })

      onUpdate()
    } catch (error) {
      console.error('Error deleting comment:', error)
      toast({
        title: "Error",
        description: "Failed to delete comment",
        variant: "destructive"
      })
    }
  }

  const userReaction = reactions.find(r => r.user_id === user?.id)
  const reactionCounts = reactions.reduce((acc, reaction) => {
    acc[reaction.reaction_type] = (acc[reaction.reaction_type] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const marginLeft = depth > 0 ? `${depth * 20}px` : '0px'

  return (
    <div style={{ marginLeft }} className="space-y-3">
      <Card className="shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Avatar className="h-8 w-8 flex-shrink-0">
              <AvatarImage src={authorAvatar || ''} />
              <AvatarFallback>
                {authorName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">{authorName}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                  </p>
                </div>
                {isOwner && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
              
              <p className="text-sm mt-2">{comment.content}</p>
              
              {/* Reactions summary */}
              {Object.keys(reactionCounts).length > 0 && (
                <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                  {Object.entries(reactionCounts).map(([type, count]) => (
                    <span key={type} className="flex items-center gap-1">
                      {reactionEmojis[type as keyof typeof reactionEmojis]} {count}
                    </span>
                  ))}
                </div>
              )}
              
              {/* Action buttons */}
              <div className="flex items-center gap-2 mt-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onMouseDown={() => setShowReactionPicker(true)}
                  className="h-7 text-xs"
                >
                  <ThumbsUp className="h-3 w-3 mr-1" />
                  React
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowReplyForm(!showReplyForm)}
                  className="h-7 text-xs"
                >
                  <MessageCircle className="h-3 w-3 mr-1" />
                  Reply
                </Button>
                {replies.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowReplies(!showReplies)}
                    className="h-7 text-xs"
                  >
                    {showReplies ? 'Hide' : 'Show'} {replies.length} replies
                  </Button>
                )}
              </div>
              
              {/* Reaction picker */}
              {showReactionPicker && (
                <div className="flex items-center gap-1 mt-2 p-2 bg-muted rounded-lg">
                  {Object.entries(reactionEmojis).map(([type, emoji]) => (
                    <Button
                      key={type}
                      variant={userReaction?.reaction_type === type ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        handleReaction(type)
                        setShowReactionPicker(false)
                      }}
                      className="text-xs h-7 px-2"
                    >
                      {emoji}
                    </Button>
                  ))}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowReactionPicker(false)}
                    className="text-xs h-7 px-2"
                  >
                    ✕
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Reply form */}
      {showReplyForm && (
        <CommentWithMentions
          postId={comment.id}
          channelId={channelId}
          onCommentAdded={() => {
            fetchReplies()
            setShowReplyForm(false)
          }}
          placeholder="Write a reply..."
        />
      )}
      
      {/* Replies */}
      {showReplies && replies.length > 0 && (
        <div className="space-y-3">
          {replies.map((reply) => (
            <CommentThread
              key={reply.id}
              comment={reply}
              postId={postId}
              channelId={channelId}
              onUpdate={fetchReplies}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  )
}