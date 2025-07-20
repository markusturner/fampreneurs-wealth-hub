import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/integrations/supabase/client'
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Heart, Bookmark, MessageCircle, Send, Trash2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { formatDistanceToNow } from 'date-fns'

interface VideoInteractionsProps {
  videoId: string
}

interface Comment {
  id: string
  content: string
  created_at: string
  user_id: string
  parent_id: string | null
  user_profile?: {
    display_name: string | null
    avatar_url: string | null
  }
}

export function VideoInteractions({ videoId }: VideoInteractionsProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState('')
  const [isLiked, setIsLiked] = useState(false)
  const [isSaved, setIsSaved] = useState(false)
  const [likesCount, setLikesCount] = useState(0)
  const [commentsCount, setCommentsCount] = useState(0)
  const [loading, setLoading] = useState(true)

  // Fetch comments
  const fetchComments = async () => {
    try {
      // First get comments
      const { data: commentsData, error: commentsError } = await supabase
        .from('video_comments')
        .select('*')
        .eq('video_id', videoId)
        .is('parent_id', null)
        .order('created_at', { ascending: false })

      if (commentsError) throw commentsError

      // Then get user profiles for the comments
      if (commentsData && commentsData.length > 0) {
        const userIds = [...new Set(commentsData.map(c => c.user_id))]
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('user_id, display_name, avatar_url')
          .in('user_id', userIds)

        if (profilesError) throw profilesError

        // Combine comments with profiles
        const commentsWithProfiles = commentsData.map(comment => ({
          ...comment,
          user_profile: profilesData?.find(p => p.user_id === comment.user_id)
        }))

        setComments(commentsWithProfiles)
      } else {
        setComments([])
      }
      
      setCommentsCount(commentsData?.length || 0)
    } catch (error) {
      console.error('Error fetching comments:', error)
    }
  }

  // Fetch likes count and user's like status
  const fetchLikes = async () => {
    try {
      // Get total likes count
      const { count, error: countError } = await supabase
        .from('video_likes')
        .select('*', { count: 'exact', head: true })
        .eq('video_id', videoId)

      if (countError) throw countError
      setLikesCount(count || 0)

      // Check if current user has liked
      if (user) {
        const { data, error } = await supabase
          .from('video_likes')
          .select('id')
          .eq('video_id', videoId)
          .eq('user_id', user.id)
          .single()

        if (error && error.code !== 'PGRST116') throw error
        setIsLiked(!!data)
      }
    } catch (error) {
      console.error('Error fetching likes:', error)
    }
  }

  // Fetch saved status
  const fetchSavedStatus = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('saved_videos')
        .select('id')
        .eq('video_id', videoId)
        .eq('user_id', user.id)
        .single()

      if (error && error.code !== 'PGRST116') throw error
      setIsSaved(!!data)
    } catch (error) {
      console.error('Error fetching saved status:', error)
    }
  }

  // Handle like/unlike
  const handleLike = async () => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please log in to like videos.",
        variant: "destructive"
      })
      return
    }

    try {
      if (isLiked) {
        // Unlike
        const { error } = await supabase
          .from('video_likes')
          .delete()
          .eq('video_id', videoId)
          .eq('user_id', user.id)

        if (error) throw error
        setIsLiked(false)
        setLikesCount(prev => prev - 1)
      } else {
        // Like
        const { error } = await supabase
          .from('video_likes')
          .insert([{ video_id: videoId, user_id: user.id }])

        if (error) throw error
        setIsLiked(true)
        setLikesCount(prev => prev + 1)
      }
    } catch (error) {
      console.error('Error toggling like:', error)
      toast({
        title: "Error",
        description: "Failed to update like status.",
        variant: "destructive"
      })
    }
  }

  // Handle save/unsave
  const handleSave = async () => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please log in to save videos.",
        variant: "destructive"
      })
      return
    }

    try {
      if (isSaved) {
        // Unsave
        const { error } = await supabase
          .from('saved_videos')
          .delete()
          .eq('video_id', videoId)
          .eq('user_id', user.id)

        if (error) throw error
        setIsSaved(false)
        toast({
          title: "Video unsaved",
          description: "Video removed from your saved list."
        })
      } else {
        // Save
        const { error } = await supabase
          .from('saved_videos')
          .insert([{ video_id: videoId, user_id: user.id }])

        if (error) throw error
        setIsSaved(true)
        toast({
          title: "Video saved",
          description: "Video added to your saved list."
        })
      }
    } catch (error) {
      console.error('Error toggling save:', error)
      toast({
        title: "Error",
        description: "Failed to update save status.",
        variant: "destructive"
      })
    }
  }

  // Handle comment submission
  const handleCommentSubmit = async () => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please log in to comment.",
        variant: "destructive"
      })
      return
    }

    if (!newComment.trim()) return

    try {
      const { error } = await supabase
        .from('video_comments')
        .insert([{
          video_id: videoId,
          user_id: user.id,
          content: newComment.trim()
        }])

      if (error) throw error

      setNewComment('')
      await fetchComments()
      toast({
        title: "Comment added",
        description: "Your comment has been posted."
      })
    } catch (error) {
      console.error('Error adding comment:', error)
      toast({
        title: "Error",
        description: "Failed to post comment.",
        variant: "destructive"
      })
    }
  }

  // Handle comment deletion
  const handleDeleteComment = async (commentId: string) => {
    try {
      const { error } = await supabase
        .from('video_comments')
        .delete()
        .eq('id', commentId)

      if (error) throw error

      await fetchComments()
      toast({
        title: "Comment deleted",
        description: "Your comment has been removed."
      })
    } catch (error) {
      console.error('Error deleting comment:', error)
      toast({
        title: "Error",
        description: "Failed to delete comment.",
        variant: "destructive"
      })
    }
  }

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      await Promise.all([
        fetchComments(),
        fetchLikes(),
        fetchSavedStatus()
      ])
      setLoading(false)
    }

    loadData()
  }, [videoId, user])

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="flex gap-4">
              <div className="h-10 w-20 bg-muted rounded"></div>
              <div className="h-10 w-20 bg-muted rounded"></div>
            </div>
            <div className="h-20 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="p-6 space-y-6">
        {/* Like and Save Buttons */}
        <div className="flex items-center gap-4">
          <Button
            variant={isLiked ? "default" : "outline"}
            size="sm"
            onClick={handleLike}
            className="flex items-center gap-2"
          >
            <Heart className={`h-4 w-4 ${isLiked ? 'fill-current' : ''}`} />
            {likesCount} {likesCount === 1 ? 'Like' : 'Likes'}
          </Button>

          <Button
            variant={isSaved ? "default" : "outline"}
            size="sm"
            onClick={handleSave}
            className="flex items-center gap-2"
          >
            <Bookmark className={`h-4 w-4 ${isSaved ? 'fill-current' : ''}`} />
            {isSaved ? 'Saved' : 'Save'}
          </Button>

          <div className="flex items-center gap-2 text-muted-foreground">
            <MessageCircle className="h-4 w-4" />
            {commentsCount} {commentsCount === 1 ? 'Comment' : 'Comments'}
          </div>
        </div>

        {/* Comment Form */}
        <div className="space-y-3">
          <Textarea
            placeholder={user ? "Add a comment..." : "Please log in to comment"}
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            disabled={!user}
            className="min-h-[80px]"
          />
          <div className="flex justify-end">
            <Button
              onClick={handleCommentSubmit}
              disabled={!user || !newComment.trim()}
              size="sm"
              className="flex items-center gap-2"
            >
              <Send className="h-4 w-4" />
              Comment
            </Button>
          </div>
        </div>

        {/* Comments List */}
        <div className="space-y-4">
          <h4 className="font-semibold">Comments</h4>
          {comments.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No comments yet. Be the first to comment!</p>
          ) : (
            <div className="space-y-4">
              {comments.map((comment) => (
                <div key={comment.id} className="flex gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={comment.user_profile?.avatar_url || ''} />
                    <AvatarFallback>
                      {comment.user_profile?.display_name?.[0] || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">
                        {comment.user_profile?.display_name || 'Anonymous'}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-sm">{comment.content}</p>
                    {user?.id === comment.user_id && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteComment(comment.id)}
                        className="h-6 px-2 text-xs text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        Delete
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}