import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Heart, MessageCircle, Send, ChevronDown, ChevronUp, Trash2 } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface Comment {
  id: string
  content: string
  user_id: string
  parent_id: string | null
  created_at: string
  profile?: {
    display_name: string | null
    avatar_url: string | null
  }
  likes_count: number
  user_liked: boolean
  replies: Comment[]
}

interface CourseCommentsProps {
  courseId: string
  lessonId?: string | null
}

export function CourseComments({ courseId, lessonId }: CourseCommentsProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState('')
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyContent, setReplyContent] = useState('')
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set())
  const [submitting, setSubmitting] = useState(false)
  const [loading, setLoading] = useState(true)

  const fetchComments = useCallback(async () => {
    const { data: commentsData, error } = await supabase
      .from('course_comments')
      .select('*')
      .eq('course_id', courseId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching comments:', error)
      return
    }

    if (!commentsData || commentsData.length === 0) {
      setComments([])
      setLoading(false)
      return
    }

    // Fetch profiles for all comment user_ids
    const userIds = [...new Set(commentsData.map(c => c.user_id))]
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, display_name, avatar_url')
      .in('user_id', userIds)

    const profileMap = new Map(
      (profiles || []).map(p => [p.user_id, p])
    )

    // Fetch likes counts
    const commentIds = commentsData.map(c => c.id)
    const { data: likesData } = await supabase
      .from('course_comment_likes')
      .select('comment_id, user_id')
      .in('comment_id', commentIds)

    const likesMap = new Map<string, { count: number; userLiked: boolean }>()
    ;(likesData || []).forEach(l => {
      const existing = likesMap.get(l.comment_id) || { count: 0, userLiked: false }
      existing.count++
      if (l.user_id === user?.id) existing.userLiked = true
      likesMap.set(l.comment_id, existing)
    })

    // Build threaded structure
    const commentMap = new Map<string, Comment>()
    const topLevel: Comment[] = []

    commentsData.forEach(c => {
      const likes = likesMap.get(c.id) || { count: 0, userLiked: false }
      const comment: Comment = {
        id: c.id,
        content: c.content,
        user_id: c.user_id,
        parent_id: c.parent_id,
        created_at: c.created_at,
        profile: profileMap.get(c.user_id) || undefined,
        likes_count: likes.count,
        user_liked: likes.userLiked,
        replies: [],
      }
      commentMap.set(c.id, comment)
    })

    commentMap.forEach(comment => {
      if (comment.parent_id && commentMap.has(comment.parent_id)) {
        commentMap.get(comment.parent_id)!.replies.push(comment)
      } else if (!comment.parent_id) {
        topLevel.push(comment)
      }
    })

    // Sort replies by oldest first
    commentMap.forEach(c => {
      c.replies.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    })

    setComments(topLevel)
    setLoading(false)
  }, [courseId, user?.id])

  useEffect(() => {
    fetchComments()
  }, [fetchComments, lessonId])

  const handleSubmitComment = async (parentId?: string | null) => {
    if (!user?.id) {
      toast({ title: 'Please log in to comment', variant: 'destructive' })
      return
    }

    const content = parentId ? replyContent.trim() : newComment.trim()
    if (!content) return

    setSubmitting(true)
    const { error } = await supabase.from('course_comments').insert({
      course_id: courseId,
      lesson_id: lessonId || null,
      user_id: user.id,
      parent_id: parentId || null,
      content,
    })

    if (error) {
      toast({ title: 'Failed to post comment', variant: 'destructive' })
    } else {
      if (parentId) {
        setReplyContent('')
        setReplyingTo(null)
        setExpandedReplies(prev => new Set([...prev, parentId]))
      } else {
        setNewComment('')
      }
      fetchComments()
    }
    setSubmitting(false)
  }

  const handleLike = async (commentId: string, userLiked: boolean) => {
    if (!user?.id) return

    if (userLiked) {
      await supabase.from('course_comment_likes').delete().eq('comment_id', commentId).eq('user_id', user.id)
    } else {
      await supabase.from('course_comment_likes').insert({ comment_id: commentId, user_id: user.id })
    }
    fetchComments()
  }

  const handleDelete = async (commentId: string) => {
    if (!user?.id) return
    await supabase.from('course_comments').delete().eq('id', commentId)
    fetchComments()
  }

  const toggleReplies = (commentId: string) => {
    setExpandedReplies(prev => {
      const next = new Set(prev)
      next.has(commentId) ? next.delete(commentId) : next.add(commentId)
      return next
    })
  }

  const CommentItem = ({ comment, isReply = false }: { comment: Comment; isReply?: boolean }) => {
    const initials = comment.profile?.display_name
      ? comment.profile.display_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
      : '?'

    return (
      <div className={`flex gap-2.5 ${isReply ? 'ml-8 mt-2' : 'mt-3'}`}>
        <Avatar className="h-7 w-7 shrink-0">
          <AvatarImage src={comment.profile?.avatar_url || ''} />
          <AvatarFallback className="text-[10px]" style={{ backgroundColor: '#290a52', color: '#fff' }}>
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold truncate" style={{ color: '#290a52' }}>
              {comment.profile?.display_name || 'Member'}
            </span>
            <span className="text-[10px] text-muted-foreground shrink-0">
              {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
            </span>
          </div>
          <p className="text-xs text-foreground mt-0.5 whitespace-pre-wrap break-words">{comment.content}</p>
          <div className="flex items-center gap-3 mt-1">
            <button
              onClick={() => handleLike(comment.id, comment.user_liked)}
              className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
            >
              <Heart
                className="h-3 w-3"
                style={{
                  fill: comment.user_liked ? '#FFB500' : 'transparent',
                  color: comment.user_liked ? '#FFB500' : 'currentColor',
                }}
              />
              {comment.likes_count > 0 && <span>{comment.likes_count}</span>}
            </button>
            {!isReply && (
              <button
                onClick={() => { setReplyingTo(replyingTo === comment.id ? null : comment.id); setReplyContent('') }}
                className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
              >
                <MessageCircle className="h-3 w-3" />
                Reply
              </button>
            )}
            {comment.user_id === user?.id && (
              <button
                onClick={() => handleDelete(comment.id)}
                className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-destructive transition-colors"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* Replies toggle */}
          {!isReply && comment.replies.length > 0 && (
            <button
              onClick={() => toggleReplies(comment.id)}
              className="flex items-center gap-1 text-[10px] font-medium mt-1.5 transition-colors"
              style={{ color: '#290a52' }}
            >
              {expandedReplies.has(comment.id) ? (
                <><ChevronUp className="h-3 w-3" /> Hide {comment.replies.length} {comment.replies.length === 1 ? 'reply' : 'replies'}</>
              ) : (
                <><ChevronDown className="h-3 w-3" /> View {comment.replies.length} {comment.replies.length === 1 ? 'reply' : 'replies'}</>
              )}
            </button>
          )}

          {/* Expanded replies */}
          {!isReply && expandedReplies.has(comment.id) && comment.replies.map(reply => (
            <CommentItem key={reply.id} comment={reply} isReply />
          ))}

          {/* Reply input */}
          {replyingTo === comment.id && (
            <div className="flex gap-2 mt-2">
              <Textarea
                value={replyContent}
                onChange={e => setReplyContent(e.target.value)}
                placeholder="Write a reply..."
                className="min-h-[32px] text-xs py-1.5 px-2 resize-none"
                rows={1}
              />
              <Button
                size="icon"
                className="h-8 w-8 shrink-0"
                style={{ backgroundColor: '#ffb500', color: '#290a52' }}
                disabled={!replyContent.trim() || submitting}
                onClick={() => handleSubmitComment(comment.id)}
              >
                <Send className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-border p-4 space-y-3">
      <p className="text-sm font-bold" style={{ color: '#290a52' }}>Comments</p>

      {/* New comment input */}
      {user && (
        <div className="flex gap-2">
          <Textarea
            value={newComment}
            onChange={e => setNewComment(e.target.value)}
            placeholder="Add a comment..."
            className="min-h-[36px] text-xs py-2 px-2.5 resize-none"
            rows={2}
          />
          <Button
            size="icon"
            className="h-9 w-9 shrink-0 self-end"
            style={{ backgroundColor: '#ffb500', color: '#290a52' }}
            disabled={!newComment.trim() || submitting}
            onClick={() => handleSubmitComment(null)}
          >
            <Send className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      {/* Comments list */}
      {loading ? (
        <p className="text-xs text-muted-foreground">Loading comments...</p>
      ) : comments.length === 0 ? (
        <p className="text-xs text-muted-foreground">No comments yet. Be the first!</p>
      ) : (
        <div className="space-y-1">
          {comments.map(comment => (
            <CommentItem key={comment.id} comment={comment} />
          ))}
        </div>
      )}
    </div>
  )
}
