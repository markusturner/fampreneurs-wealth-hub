import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/integrations/supabase/client'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { formatDistanceToNow } from 'date-fns'
import { 
  MessageCircle, 
  MoreHorizontal,
  Play,
  Pause,
  ThumbsUp,
  Edit,
  Trash2
} from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { CommentWithMentions } from './comment-with-mentions'
import { CommentThread } from './comment-thread'

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

interface Comment extends Post {
  replies?: Comment[]
}

interface CommentReaction {
  id: string
  user_id: string
  reaction_type: string
}

interface PostReaction {
  id: string
  user_id: string
  reaction_type: string
}

interface EnhancedPostCardProps {
  post: Post
  onUpdate: () => void
  isComment?: boolean
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

export const EnhancedPostCard = ({ post, onUpdate, isComment = false, depth = 0 }: EnhancedPostCardProps) => {
  const { user } = useAuth()
  const { toast } = useToast()
  const [comments, setComments] = useState<Comment[]>([])
  const [commentReactions, setCommentReactions] = useState<CommentReaction[]>([])
  const [postReactions, setPostReactions] = useState<PostReaction[]>([])
  const [showComments, setShowComments] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null)
  const [video, setVideo] = useState<HTMLVideoElement | null>(null)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [editContent, setEditContent] = useState(post.content)
  const [isEditing, setIsEditing] = useState(false)
  const [showReactionPicker, setShowReactionPicker] = useState(false)
  const longPressTimer = useRef<NodeJS.Timeout | null>(null)
  const isLongPressing = useRef(false)

  const authorName = post.profiles?.display_name || post.profiles?.first_name || 'Anonymous'
  const authorAvatar = post.profiles?.avatar_url
  const isOwner = user?.id === post.user_id

  const fetchComments = async () => {
    if (!isComment) {
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
  }

  const fetchCommentReactions = async () => {
    if (isComment) {
      try {
        const { data, error } = await supabase
          .from('community_comment_reactions')
          .select('*')
          .eq('comment_id', post.id)

        if (error) throw error
        setCommentReactions(data || [])
      } catch (error) {
        console.error('Error fetching comment reactions:', error)
      }
    }
  }

  const fetchPostReactions = async () => {
    if (!isComment) {
      try {
        const { data, error } = await supabase
          .from('community_reactions')
          .select('*')
          .eq('post_id', post.id)

        if (error) throw error
        setPostReactions(data || [])
      } catch (error) {
        console.error('Error fetching post reactions:', error)
      }
    }
  }

  useEffect(() => {
    fetchComments()
    if (isComment) {
      fetchCommentReactions()
    } else {
      fetchPostReactions()
    }
  }, [post.id, isComment])

  const handleCommentReaction = async (reactionType: string) => {
    if (!user || !isComment) return

    try {
      const existingReaction = commentReactions.find(
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
          .eq('comment_id', post.id)
          .eq('user_id', user.id)

        const { error } = await supabase
          .from('community_comment_reactions')
          .insert({
            comment_id: post.id,
            user_id: user.id,
            reaction_type: reactionType
          })

        if (error) throw error
      }

      fetchCommentReactions()
    } catch (error) {
      console.error('Error handling comment reaction:', error)
      toast({
        title: "Error",
        description: "Failed to update reaction. Please try again.",
        variant: "destructive"
      })
    }
  }

  const handlePostReaction = async (reactionType: string) => {
    if (!user || isComment) return

    try {
      const existingReaction = postReactions.find(
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
        // Remove other reactions first, then add new one
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

      fetchPostReactions()
    } catch (error) {
      console.error('Error handling post reaction:', error)
      toast({
        title: "Error",
        description: "Failed to update reaction. Please try again.",
        variant: "destructive"
      })
    }
  }


  const handleEdit = async () => {
    if (!editContent.trim()) return

    setIsEditing(true)
    try {
      const { error } = await supabase
        .from('community_posts')
        .update({ content: editContent.trim() })
        .eq('id', post.id)

      if (error) throw error

      toast({
        title: "Success",
        description: "Post updated!"
      })

      setShowEditDialog(false)
      onUpdate()
    } catch (error) {
      console.error('Error editing post:', error)
      toast({
        title: "Error",
        description: "Failed to update post",
        variant: "destructive"
      })
    } finally {
      setIsEditing(false)
    }
  }

  const handleDelete = async () => {
    try {
      const { error } = await supabase
        .from('community_posts')
        .delete()
        .eq('id', post.id)

      if (error) throw error

      toast({
        title: "Success",
        description: `${isComment ? 'Comment' : 'Post'} deleted!`
      })

      onUpdate()
    } catch (error) {
      console.error('Error deleting post:', error)
      toast({
        title: "Error",
        description: `Failed to delete ${isComment ? 'comment' : 'post'}`,
        variant: "destructive"
      })
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

  const handleLongPressStart = () => {
    if (!isComment) return
    
    isLongPressing.current = true
    longPressTimer.current = setTimeout(() => {
      if (isLongPressing.current) {
        setShowReactionPicker(true)
      }
    }, 500)
  }

  const handleLongPressEnd = () => {
    isLongPressing.current = false
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }

  const userCommentReaction = commentReactions.find(r => r.user_id === user?.id)
  const commentReactionCounts = commentReactions.reduce((acc, reaction) => {
    acc[reaction.reaction_type] = (acc[reaction.reaction_type] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const userPostReaction = postReactions.find(r => r.user_id === user?.id)
  const postReactionCounts = postReactions.reduce((acc, reaction) => {
    acc[reaction.reaction_type] = (acc[reaction.reaction_type] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const marginLeft = depth > 0 ? `${depth * 20}px` : '0px'

  return (
    <Card 
      className="shadow-soft" 
      style={{ marginLeft }}
      onMouseDown={handleLongPressStart}
      onMouseUp={handleLongPressEnd}
      onMouseLeave={handleLongPressEnd}
      onTouchStart={handleLongPressStart}
      onTouchEnd={handleLongPressEnd}
    >
      <CardHeader className="pb-3 p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <Link 
              to={`/member/${post.user_id}`}
              className="h-10 w-10 flex-shrink-0 rounded-full overflow-hidden bg-muted hover:opacity-80 transition-opacity"
            >
              {authorAvatar ? (
                <img 
                  src={authorAvatar} 
                  alt={authorName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-primary text-primary-foreground flex items-center justify-center">
                  {authorName.charAt(0).toUpperCase()}
                </div>
              )}
            </Link>
            <div className="min-w-0 flex-1">
              <Link 
                to={`/member/${post.user_id}`}
                className="font-semibold text-sm truncate hover:underline"
              >
                {authorName}
              </Link>
              <p className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
              </p>
            </div>
          </div>
          {isOwner && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="flex-shrink-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setShowEditDialog(true)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
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

        {/* Video Player */}
        {post.video_url && (
          <video
            src={post.video_url}
            controls
            className="w-full rounded-lg max-h-96"
            preload="metadata"
          >
            Your browser does not support the video tag.
          </video>
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

        {/* Post Reactions Summary (only for original posts) */}
        {!isComment && Object.keys(postReactionCounts).length > 0 && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              {Object.entries(postReactionCounts).map(([type, count]) => (
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

        {/* Comment Reactions Summary (only for comments) */}
        {isComment && Object.keys(commentReactionCounts).length > 0 && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              {Object.entries(commentReactionCounts).map(([type, count]) => (
                <span key={type} className="flex items-center gap-1">
                  {reactionEmojis[type as keyof typeof reactionEmojis]} {count}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-2 border-t">
          {isComment ? (
            <Button
              variant={userCommentReaction ? "default" : "ghost"}
              size="sm"
              onClick={() => handleCommentReaction('like')}
              className="flex-1 gap-1"
            >
              <ThumbsUp className="h-4 w-4" />
              Like
            </Button>
          ) : (
            <>
              <Button
                variant={userPostReaction ? "default" : "ghost"}
                size="sm"
                onClick={() => handlePostReaction('like')}
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
                Comment ({comments.length})
              </Button>
            </>
          )}
        </div>



        {/* Reaction Picker for Comments (shown on long press) */}
        {isComment && showReactionPicker && (
          <div className="flex items-center gap-1 flex-wrap p-2 bg-muted rounded-lg">
            {Object.entries(reactionEmojis).map(([type, emoji]) => (
              <Button
                key={type}
                variant={userCommentReaction?.reaction_type === type ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  handleCommentReaction(type)
                  setShowReactionPicker(false)
                }}
                className="text-xs h-8 px-2"
              >
                {emoji}
              </Button>
            ))}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowReactionPicker(false)}
              className="text-xs h-8 px-2"
            >
              ✕
            </Button>
          </div>
        )}

        {/* Comments Section */}
        {showComments && comments.length > 0 && !isComment && (
          <div className="space-y-3 pt-4 border-t">
            {comments.map((comment) => (
              <CommentThread
                key={comment.id}
                comment={comment}
                postId={post.id}
                channelId={post.channel_id}
                onUpdate={fetchComments}
                depth={0}
              />
            ))}
          </div>
        )}

        {/* Comment Form at bottom */}
        {showComments && !isComment && (
          <div className="pt-4 border-t space-y-4">
            <CommentWithMentions
              postId={post.id}
              channelId={post.channel_id}
              onCommentAdded={fetchComments}
            />
          </div>
        )}
      </CardContent>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit {isComment ? 'Comment' : 'Post'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              rows={4}
              placeholder="Edit your content..."
            />
            <div className="flex gap-2">
              <Button
                onClick={handleEdit}
                disabled={isEditing || !editContent.trim()}
                className="flex-1"
              >
                {isEditing ? 'Saving...' : 'Save'}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowEditDialog(false)}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  )
}