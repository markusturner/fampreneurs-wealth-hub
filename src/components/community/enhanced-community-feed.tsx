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

const reactionEmojis = {
  like: '👍',
  love: '❤️',
  laugh: '😂',
  wow: '😮',
  sad: '😢',
  angry: '😡'
}

export function EnhancedCommunityFeed() {
  const { user, profile } = useAuth()
  const { toast } = useToast()
  const [posts, setPosts] = useState<Post[]>([])
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [newPost, setNewPost] = useState('')
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    fetchPosts()
    fetchAnnouncements()
  }, [])

  const fetchPosts = async () => {
    try {
      const { data, error } = await supabase
        .from('community_posts')
        .select(`
          *,
          profiles(display_name, first_name, avatar_url)
        `)
        .is('parent_id', null)
        .order('created_at', { ascending: false })

      if (error) throw error
      setPosts(data || [])
    } catch (error) {
      console.error('Error fetching posts:', error)
    }
  }

  const fetchAnnouncements = async () => {
    try {
      const { data, error } = await supabase
        .from('announcements')
        .select(`
          *,
          profiles(display_name, first_name)
        `)
        .order('created_at', { ascending: false })
        .limit(5)

      if (error) throw error
      setAnnouncements(data || [])
    } catch (error) {
      console.error('Error fetching announcements:', error)
    }
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedImage(file)
      const reader = new FileReader()
      reader.onload = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      const chunks: BlobPart[] = []

      recorder.ondataavailable = (e) => chunks.push(e.data)
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' })
        setAudioBlob(blob)
        stream.getTracks().forEach(track => track.stop())
      }

      setMediaRecorder(recorder)
      recorder.start()
      setIsRecording(true)
    } catch (error) {
      console.error('Error starting recording:', error)
      toast({
        title: "Error",
        description: "Could not access microphone",
        variant: "destructive"
      })
    }
  }

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop()
      setIsRecording(false)
    }
  }

  const uploadFile = async (file: File, bucket: string): Promise<string | null> => {
    const fileExt = file.name?.split('.').pop() || 'bin'
    const fileName = `${user?.id}/${Date.now()}.${fileExt}`
    
    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(fileName, file)
    
    if (uploadError) {
      console.error('Error uploading file:', uploadError)
      return null
    }
    
    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(fileName)
    
    return publicUrl
  }

  const createPost = async () => {
    if (!newPost.trim() && !selectedImage && !audioBlob) return

    setIsSubmitting(true)
    
    try {
      let imageUrl = null
      let audioUrl = null

      if (selectedImage) {
        imageUrl = await uploadFile(selectedImage, 'community-images')
        if (!imageUrl) throw new Error('Failed to upload image')
      }

      if (audioBlob) {
        const audioFile = new File([audioBlob], 'audio.webm', { type: 'audio/webm' })
        audioUrl = await uploadFile(audioFile, 'community-audio')
        if (!audioUrl) throw new Error('Failed to upload audio')
      }

      const { error } = await supabase
        .from('community_posts')
        .insert({
          content: newPost.trim(),
          user_id: user?.id,
          image_url: imageUrl,
          audio_url: audioUrl
        })

      if (error) throw error

      // Reset form
      setNewPost('')
      setSelectedImage(null)
      setImagePreview(null)
      setAudioBlob(null)
      
      fetchPosts()
      toast({
        title: "Success",
        description: "Post created successfully!"
      })
    } catch (error) {
      console.error('Error creating post:', error)
      toast({
        title: "Error",
        description: "Failed to create post",
        variant: "destructive"
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const onEmojiClick = (emojiData: any) => {
    setNewPost(prev => prev + emojiData.emoji)
    setShowEmojiPicker(false)
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
            <div className="flex gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={profile?.avatar_url || ''} />
                <AvatarFallback>
                  {profile?.first_name?.charAt(0) || 'A'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-3">
                <Textarea
                  value={newPost}
                  onChange={(e) => setNewPost(e.target.value)}
                  placeholder="What's on your mind?"
                  className="min-h-[80px]"
                />
                
                {imagePreview && (
                  <div className="relative">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="max-h-48 rounded-lg object-cover"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="absolute top-2 right-2"
                      onClick={() => {
                        setSelectedImage(null)
                        setImagePreview(null)
                      }}
                    >
                      Remove
                    </Button>
                  </div>
                )}

                {audioBlob && (
                  <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                    <Volume2 className="h-4 w-4" />
                    <span className="text-sm">Audio recorded</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setAudioBlob(null)}
                    >
                      Remove
                    </Button>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                      id="image-upload"
                    />
                    <label htmlFor="image-upload">
                      <Button variant="ghost" size="sm" asChild>
                        <span className="cursor-pointer flex items-center gap-2">
                          <ImagePlus className="h-4 w-4" />
                          Photo
                        </span>
                      </Button>
                    </label>

                    <Button
                      variant="ghost"
                      size="sm"
                      onMouseDown={startRecording}
                      onMouseUp={stopRecording}
                      onMouseLeave={stopRecording}
                      className={isRecording ? 'bg-red-100 text-red-600' : ''}
                    >
                      {isRecording ? (
                        <MicOff className="h-4 w-4" />
                      ) : (
                        <Mic className="h-4 w-4" />
                      )}
                      {isRecording ? 'Recording...' : 'Audio'}
                    </Button>

                    <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
                      <PopoverTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <Smile className="h-4 w-4 mr-2" />
                          Emoji
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <EmojiPicker onEmojiClick={onEmojiClick} />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <Button 
                    onClick={createPost} 
                    disabled={isSubmitting || (!newPost.trim() && !selectedImage && !audioBlob)}
                    className="bg-primary hover:bg-primary/90"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Post
                  </Button>
                </div>
              </div>
            </div>
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

// Enhanced Post Card Component
interface PostCardProps {
  post: Post
  onUpdate: () => void
  isReply?: boolean
  depth?: number
}

const PostCard = ({ post, onUpdate, isReply = false, depth = 0 }: PostCardProps) => {
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

  useEffect(() => {
    if (!isReply) {
      fetchComments()
      fetchReactions()
    }
  }, [post.id, isReply])

  const fetchComments = async () => {
    try {
      const { data, error } = await supabase
        .from('community_posts')
        .select(`
          *,
          profiles(display_name, first_name, avatar_url)
        `)
        .eq('parent_id', post.id)
        .order('created_at', { ascending: true })

      if (error) throw error
      setComments(data || [])
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

  const handleReaction = async (reactionType: string) => {
    if (!user) return

    try {
      const existingReaction = reactions.find(
        r => r.user_id === user.id && r.reaction_type === reactionType
      )

      if (existingReaction) {
        await supabase
          .from('community_reactions')
          .delete()
          .eq('id', existingReaction.id)
      } else {
        await supabase
          .from('community_reactions')
          .delete()
          .eq('post_id', post.id)
          .eq('user_id', user.id)

        await supabase
          .from('community_reactions')
          .insert({
            post_id: post.id,
            user_id: user.id,
            reaction_type: reactionType
          })
      }

      fetchReactions()
    } catch (error) {
      console.error('Error handling reaction:', error)
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
      <CardHeader className="pb-3 p-4">
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

      <CardContent className="space-y-4 p-4">
        {/* Post Content */}
        {post.content && (
          <p className="text-sm leading-relaxed">{post.content}</p>
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