import { useState, useEffect, useCallback, useRef } from 'react'
import { StripePaymentModal } from '@/components/dashboard/StripePaymentModal'
import { CommunityMembersList } from '@/components/community/CommunityMembersList'
import { EmojiButton, GifButton, PollDraftEditor } from '@/components/community/PostComposerExtras'
import { PollDisplay } from '@/components/community/PollDisplay'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/integrations/supabase/client'
import { uploadProgressStore } from '@/lib/uploadProgress'
import { useToast } from '@/hooks/use-toast'
import { useSubscription } from '@/hooks/useSubscription'
import { useUserRole } from '@/hooks/useUserRole'
import { useOwnerRole } from '@/hooks/useOwnerRole'
import * as tus from 'tus-js-client'
import { 
  Image, Video, ThumbsUp, MessageCircle, Send, 
  MoreHorizontal, Settings, Filter, Users, Wifi, Camera, X,
  Mic, MicOff, Lock, Calendar, CreditCard, Play, Pencil, Check, Pin, PinOff, ListChecks
} from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface Post {
  id: string
  title: string | null
  content: string
  user_id: string
  created_at: string
  image_url: string | null
  video_url: string | null
  audio_url: string | null
  gif_url: string | null
  author_name: string
  author_avatar: string | null
  likes_count: number
  comments_count: number
  is_liked: boolean
  channel_id: string | null
  category: string
  pinned: boolean
  pinned_at: string | null
}

interface Comment {
  id: string
  content: string
  user_id: string
  created_at: string
  image_url: string | null
  audio_url: string | null
  video_url: string | null
  author_name: string
  author_avatar: string | null
}

type PendingVideoUpload = {
  file: File
  promise: Promise<string | null>
  uploadedUrl: string | null
  status: 'uploading' | 'done' | 'error'
  jobId: string
  attachInProgress?: boolean
  cancel?: () => void
}

const PROGRAM_NAMES: Record<string, string> = {
  fbu: 'Family Business University',
  tfv: 'The Family Vault',
  tfba: 'The Family Business Accelerator',
  tffm: 'The Family Fortune Mastermind',
}

const PROGRAM_DESCRIPTIONS: Record<string, string> = {
  fbu: 'The #1 Guided Generational Wealth Community teaching families how to build lasting legacies.',
  tfv: 'Exclusive vault of resources, templates, and tools for family wealth management.',
  tfba: 'The #1 Guided Generational Wealth Community teaching you how to setup private irrevocable trusts!',
  tffm: 'The ultimate mastermind for families ready to build and protect generational fortune.',
}

// Program upgrade hierarchy: fbu -> tfv -> tfba -> tffm
const PROGRAM_UPGRADE_MAP: Record<string, string> = {
  fbu: 'tfv',
  tfv: 'tfba',
  tfba: 'tffm',
}

const CATEGORIES = [
  { label: 'All', value: 'all', emoji: '' },
  { label: 'Discussion', value: 'discussion', emoji: '💬' },
  { label: 'Wins', value: 'wins', emoji: '🏆' },
  { label: 'Updates', value: 'updates', emoji: '📣' },
  { label: 'Gems', value: 'gems', emoji: '💎' },
  { label: 'Recordings', value: 'recordings', emoji: '🎥' },
]

const MAX_VIDEO_UPLOAD_MS = 3 * 60 * 1000

export default function WorkspaceCommunity() {
  const { user, profile } = useAuth()
  const { toast } = useToast()
  const { subscriptionStatus, createCheckout } = useSubscription()
  const { isAdmin } = useUserRole()
  const { isOwner } = useOwnerRole(user?.id ?? null)
  const [searchParams, setSearchParams] = useSearchParams()
  const program = searchParams.get('program') || ''
  const postParam = searchParams.get('post') || ''
  const programName = PROGRAM_NAMES[program] || 'Community'
  const programDesc = PROGRAM_DESCRIPTIONS[program] || ''

  // If we have a post param but no program, look up the post's program and redirect
  useEffect(() => {
    if (postParam && !program) {
      supabase
        .from('community_posts')
        .select('program')
        .eq('id', postParam)
        .single()
        .then(({ data }) => {
          if (data?.program) {
            setSearchParams({ program: data.program }, { replace: true })
          }
        })
    }
  }, [postParam, program])
  const [newPost, setNewPost] = useState('')
  const [newPostTitle, setNewPostTitle] = useState('')
  const [postGifUrl, setPostGifUrl] = useState<string | null>(null)
  const [pollEnabled, setPollEnabled] = useState(false)
  const [pollQuestion, setPollQuestion] = useState('')
  const [pollOptions, setPollOptions] = useState<string[]>(['', ''])
  const [postToAll, setPostToAll] = useState(false)
  const [postCategory, setPostCategory] = useState('discussion')
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState('all')
  const [expandedPosts, setExpandedPosts] = useState<Set<string>>(new Set())
  const [memberCount, setMemberCount] = useState(0)
  const [onlineCount, setOnlineCount] = useState(0)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [communityPhoto, setCommunityPhoto] = useState<string | null>(null)
  const [communityName, setCommunityName] = useState('')
  const [communityDesc, setCommunityDesc] = useState('')
  const [postImageFile, setPostImageFile] = useState<File | null>(null)
  const [postImagePreview, setPostImagePreview] = useState<string | null>(null)
  const [postAudioFile, setPostAudioFile] = useState<File | null>(null)
  const [postVideoFile, setPostVideoFile] = useState<File | null>(null)
  const [postVideoPreview, setPostVideoPreview] = useState<string | null>(null)
  const [isPosting, setIsPosting] = useState(false)
  
  const imageInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)
  const audioInputRef = useRef<HTMLInputElement>(null)
  const communityPhotoRef = useRef<HTMLInputElement>(null)
  const postVideoUploadRef = useRef<PendingVideoUpload | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])

  // Owner-only custom date/time for posts
  const [useCustomDateTime, setUseCustomDateTime] = useState(false)
  const [customDate, setCustomDate] = useState('')
  const [customTime, setCustomTime] = useState('')

  // Edit post state
  const [editingPostId, setEditingPostId] = useState<string | null>(null)
  const [editingPostContent, setEditingPostContent] = useState('')
  const [editingPostCategory, setEditingPostCategory] = useState('discussion')
  const [editingPostDate, setEditingPostDate] = useState('')
  const [editingPostTitle, setEditingPostTitle] = useState('')

  // Comments state
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set())
  const [postComments, setPostComments] = useState<Record<string, Comment[]>>({})
  const [commentText, setCommentText] = useState<Record<string, string>>({})
  const [commentImageFiles, setCommentImageFiles] = useState<Record<string, File | null>>({})
  const [commentAudioFiles, setCommentAudioFiles] = useState<Record<string, File | null>>({})
  const [commentVideoFiles, setCommentVideoFiles] = useState<Record<string, File | null>>({})
  const commentImageRefs = useRef<Record<string, HTMLInputElement | null>>({})
  const commentVideoRefs = useRef<Record<string, HTMLInputElement | null>>({})
  const commentAudioRefs = useRef<Record<string, HTMLInputElement | null>>({})

  // Locked community popup - only opens when user clicks "Unlock Now"
  const [lockedPopupOpen, setLockedPopupOpen] = useState(false)

  // Check if user has access to this specific program community.
  // Admin-invited users only get access to the exact community matching their assigned program_name.
  const PROGRAM_NAME_TO_KEY: Record<string, string> = {
    'Family Business University': 'fbu',
    'The Family Business University': 'fbu',
    'The Family Vault': 'tfv',
    'The Family Business Accelerator': 'tfba',
    'The Family Fortune Mastermind': 'tffm',
  }
  // Support multi-program assignments stored as comma-separated strings
  const profileProgramKeys = profile?.program_name
    ? profile.program_name.split(',').map(p => PROGRAM_NAME_TO_KEY[p.trim()]).filter(Boolean)
    : []
  // No program selected yet = loading state, don't block
  const hasProgramAccess = !program || isAdmin || isOwner || subscriptionStatus.programs.includes(program) || profileProgramKeys.includes(program)

  const fetchPosts = useCallback(async () => {
    try {
      const { data: postsData, error } = await supabase
        .from('community_posts')
        .select('*')
        .or(`program.eq.${program},program.is.null`)
        .order('created_at', { ascending: false })
        .limit(30)

      if (error) throw error

      const postIds = (postsData || []).map(p => p.id)
      
      const [{ data: likes }, { data: comments }] = await Promise.all([
        supabase.from('community_reactions').select('post_id, user_id').in('post_id', postIds.length ? postIds : ['']),
        supabase.from('community_comments').select('post_id').in('post_id', postIds.length ? postIds : ['']),
      ])

      const userIds = [...new Set((postsData || []).map(p => p.user_id))]
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name, avatar_url')
        .in('user_id', userIds.length ? userIds : [''])

      const profileMap = new Map((profiles || []).map(p => [p.user_id, p]))

      setPosts((postsData || []).map(post => {
        const authorProfile = profileMap.get(post.user_id)
        const postLikes = (likes || []).filter(l => l.post_id === post.id)
        const postComments = (comments || []).filter(c => c.post_id === post.id)
        
        // Use stored category, fallback to content detection
        let category = (post as any).category || 'discussion'
        if (category === 'discussion') {
          const content = post.content.toLowerCase()
          if (content.includes('#win') || content.includes('🏆')) category = 'wins'
          else if (content.includes('#update') || content.includes('📣')) category = 'updates'
          else if (content.includes('#gem') || content.includes('💎')) category = 'gems'
          else if (content.includes('#recording') || content.includes('🎥') || post.video_url) category = 'recordings'
        }

        return {
          id: post.id,
          title: (post as any).title || null,
          content: post.content,
          user_id: post.user_id,
          created_at: post.created_at,
          image_url: post.image_url,
          video_url: post.video_url,
          audio_url: post.audio_url,
          gif_url: (post as any).gif_url || null,
          author_name: authorProfile?.display_name || 'Member',
          author_avatar: authorProfile?.avatar_url || null,
          likes_count: postLikes.length,
          comments_count: postComments.length,
          is_liked: postLikes.some(l => l.user_id === user?.id),
          channel_id: post.channel_id,
          category,
          pinned: (post as any).pinned || false,
          pinned_at: (post as any).pinned_at || null,
        }
      }))
    } catch (error) {
      console.error('Error fetching posts:', error)
    } finally {
      setLoading(false)
    }
  }, [user?.id, program])

  useEffect(() => { fetchPosts() }, [fetchPosts])

  useEffect(() => {
    setCommunityName(programName)
    setCommunityDesc(programDesc)
  }, [programName, programDesc])

  // Load persisted community photo from community_groups
  useEffect(() => {
    if (!program) return
    const loadCommunityPhoto = async () => {
      const groupName = PROGRAM_NAMES[program]
      if (!groupName) return
      const { data } = await supabase
        .from('community_groups')
        .select('image_url')
        .eq('name', groupName)
        .maybeSingle()
      if (data?.image_url) {
        setCommunityPhoto(data.image_url)
      } else {
        setCommunityPhoto(null)
      }
    }
    loadCommunityPhoto()
  }, [program])

  const getEligibleCommunityUserIds = useCallback(async (): Promise<string[]> => {
    if (!program) return []

    const assignedProgramName = PROGRAM_NAMES[program]
    if (!assignedProgramName) return []

    // Get users assigned to this program who have completed their profile (not just invited)
    // program_name may be a comma-separated list, so use ilike to match within the string
    const { data: programProfiles } = await supabase
      .from('profiles')
      .select('user_id')
      .ilike('program_name', `%${assignedProgramName}%`)
      .not('display_name', 'is', null)
      .or('needs_profile_completion.is.null,needs_profile_completion.eq.false')

    const ids = (programProfiles || []).map(profile => profile.user_id)
    if (ids.length === 0) return []

    // Only include users who have completed onboarding
    const { data: onboarded } = await supabase
      .from('onboarding_responses')
      .select('user_id')
      .in('user_id', ids)

    const onboardedIds = new Set((onboarded || []).map(o => o.user_id))
    return ids.filter(id => onboardedIds.has(id))
  }, [program])

  useEffect(() => {
    const fetchMemberCount = async () => {
      const eligibleUserIds = await getEligibleCommunityUserIds()
      setMemberCount(eligibleUserIds.length)
    }

    fetchMemberCount()
  }, [getEligibleCommunityUserIds])

  // Real-time presence tracking for online count
  useEffect(() => {
    if (!user?.id || !program) return

    let qualifiedUserIds: string[] = []
    let channelRef: ReturnType<typeof supabase.channel> | null = null

    const setup = async () => {
      qualifiedUserIds = await getEligibleCommunityUserIds()

      const channelName = `community-presence-${program}`
      const channel = supabase.channel(channelName, {
        config: { presence: { key: user.id } },
      })

      channel
        .on('presence', { event: 'sync' }, () => {
          const state = channel.presenceState()
          const onlineQualified = Object.keys(state).filter(id => qualifiedUserIds.includes(id))
          setOnlineCount(onlineQualified.length)
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            await channel.track({ user_id: user.id, online_at: new Date().toISOString() })
          }
        })

      channelRef = channel
    }

    setup()

    return () => {
      if (channelRef) supabase.removeChannel(channelRef)
    }
  }, [getEligibleCommunityUserIds, user?.id, program])

  // Reset popup closed state whenever program changes (so it doesn't stay open from a previous community)
  useEffect(() => {
    setLockedPopupOpen(false)
  }, [program])

  const uploadFile = async (file: File, folder: string): Promise<string | null> => {
    const ext = file.name.split('.').pop()
    // RLS on community-images requires the first path segment to be the user id
    const path = `${user!.id}/${folder}/${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('community-images').upload(path, file, {
      contentType: file.type || undefined,
      upsert: false,
    })
    if (error) {
      console.error('Upload error:', error)
      toast({ title: 'Upload failed', description: error.message, variant: 'destructive' })
      return null
    }
    const { data: urlData } = supabase.storage.from('community-images').getPublicUrl(path)
    return urlData.publicUrl
  }

  // Upload with real-time progress via XHR (Supabase JS doesn't expose progress events)
  const uploadFileWithProgress = (
    file: File,
    folder: string,
    onProgress: (percent: number, details?: { loadedBytes?: number; speedBps?: number; etaSeconds?: number | null; message?: string }) => void,
  ): Promise<string | null> => {
    return new Promise(async (resolve, reject) => {
      try {
        const ext = file.name.split('.').pop()
        const path = `${user!.id}/${folder}/${Date.now()}.${ext}`
        const { data: { session } } = await supabase.auth.getSession()
        const token = session?.access_token
        if (!token) {
          reject(new Error('Please sign in again before uploading videos.'))
          return
        }
        const startedAt = Date.now()
        let settled = false
        let activeUpload: tus.Upload | null = null
        const timeoutId = window.setTimeout(() => {
          if (settled) return
          settled = true
          activeUpload?.abort(true)
          reject(new Error('Video upload took longer than 3 minutes. Try a shorter or compressed video.'))
        }, MAX_VIDEO_UPLOAD_MS)
        const settle = (value: string | null, error?: Error) => {
          if (settled) return
          settled = true
          window.clearTimeout(timeoutId)
          if (error) reject(error)
          else resolve(value)
        }
        const upload = new tus.Upload(file, {
          endpoint: 'https://tbofkvyezmpovoezjyyl.supabase.co/storage/v1/upload/resumable',
          retryDelays: [0, 1000, 3000, 5000],
          chunkSize: 6 * 1024 * 1024,
          headers: {
            authorization: `Bearer ${token}`,
            'x-upsert': 'false',
          },
          uploadDataDuringCreation: true,
          removeFingerprintOnSuccess: true,
          metadata: {
            bucketName: 'community-images',
            objectName: path,
            contentType: file.type || 'video/mp4',
            cacheControl: '3600',
          },
          onProgress: (bytesUploaded, bytesTotal) => {
            const elapsedSeconds = Math.max((Date.now() - startedAt) / 1000, 0.5)
            const speedBps = bytesUploaded / elapsedSeconds
            const etaSeconds = speedBps > 0 ? Math.max(0, (bytesTotal - bytesUploaded) / speedBps) : null
            const percent = Math.max(1, Math.min(99, Math.round((bytesUploaded / bytesTotal) * 100)))
            onProgress(percent, { loadedBytes: bytesUploaded, speedBps, etaSeconds, message: 'Uploading video...' })
          },
          onError: (error) => settle(null, error instanceof Error ? error : new Error(String(error))),
          onSuccess: () => {
            const { data: urlData } = supabase.storage.from('community-images').getPublicUrl(path)
            settle(urlData.publicUrl)
          },
        })
        activeUpload = upload
        upload.start()
      } catch (e) {
        console.error('Upload init error:', e)
        reject(e instanceof Error ? e : new Error('Could not start video upload.'))
      }
    })
  }

  const handleCreatePost = async (): Promise<boolean> => {
    const hasContent = newPost.trim() || newPostTitle.trim() || postGifUrl || postImageFile || postVideoFile || postAudioFile || (pollEnabled && pollQuestion.trim())
    if (!hasContent || !user?.id || isPosting) return false
    setIsPosting(true)
    try {
      let imageUrl: string | null = null
      let videoUrl: string | null = null
      let audioUrl: string | null = null
      const linkedVideoUrl = extractFirstVideoUrl(newPost.trim())

      if (postImageFile) {
        imageUrl = await uploadFile(postImageFile, 'community')
        if (!imageUrl) return false
      }
      // For pasted video URLs (YouTube, Fathom, etc.), use immediately.
      // For uploaded video FILES, upload begins when selected; posting only attaches the result if ready.
      const pendingVideoUpload = postVideoUploadRef.current
      if (linkedVideoUrl && !postVideoFile) {
        videoUrl = linkedVideoUrl
      } else if (pendingVideoUpload?.uploadedUrl) {
        videoUrl = pendingVideoUpload.uploadedUrl
      }
      if (postAudioFile) {
        audioUrl = await uploadFile(postAudioFile, 'community-audio')
        if (!audioUrl) return false
      }

      // Build custom created_at if owner set one
      let customCreatedAt: string | undefined = undefined
      if (isOwner && useCustomDateTime && customDate) {
        const dateStr = customTime ? `${customDate}T${customTime}:00` : `${customDate}T12:00:00`
        customCreatedAt = new Date(dateStr).toISOString()
      }

      // Validate poll
      const cleanedPollOptions = pollOptions.map(o => o.trim()).filter(Boolean)
      const validPoll = pollEnabled && pollQuestion.trim() && cleanedPollOptions.length >= 2

      const basePayload = {
        title: newPostTitle.trim() || null,
        content: newPost.trim(),
        user_id: user.id,
        image_url: imageUrl,
        video_url: videoUrl,
        audio_url: audioUrl,
        gif_url: postGifUrl,
        category: (videoUrl || pendingVideoUpload) ? 'recordings' : postCategory,
        ...(customCreatedAt ? { created_at: customCreatedAt } : {}),
      }

      const insertedPostIds: string[] = []
      if (postToAll && (isAdmin || isOwner)) {
        const allPrograms = Object.keys(PROGRAM_NAMES)
        const inserts = allPrograms.map(prog => ({ ...basePayload, program: prog }))
        const { data, error } = await supabase.from('community_posts').insert(inserts as any).select('id')
        if (error) throw error
        ;(data || []).forEach(p => insertedPostIds.push(p.id))
      } else {
        const { data, error } = await supabase
          .from('community_posts')
          .insert({ ...basePayload, program } as any)
          .select('id')
          .single()
        if (error) throw error
        if (data?.id) insertedPostIds.push(data.id)
      }

      // Insert polls (one per inserted post)
      if (validPoll && insertedPostIds.length > 0) {
        const pollRows = insertedPostIds.map(pid => ({
          post_id: pid,
          user_id: user.id,
          question: pollQuestion.trim(),
          options: cleanedPollOptions,
        }))
        await supabase.from('community_polls').insert(pollRows as any)
      }

      // Notify mentioned users (fire and forget)
      notifyMentionedUsers(newPost.trim(), 'post', 'post')

      if (pendingVideoUpload && videoUrl) {
        uploadProgressStore.finish(pendingVideoUpload.jobId, 'done', 'Video uploaded and attached')
      }

      // Background attach for video files — upload already started when the file was selected
      if (pendingVideoUpload && insertedPostIds.length > 0 && !videoUrl) {
        ;(async () => {
          try {
            const uploaded = pendingVideoUpload.uploadedUrl || await pendingVideoUpload.promise
            if (uploaded) {
              uploadProgressStore.update(pendingVideoUpload.jobId, 100, { status: 'processing', message: 'Processing video...', etaSeconds: null })
              await supabase
                .from('community_posts')
                .update({ video_url: uploaded, category: 'recordings' } as any)
                .in('id', insertedPostIds)
              fetchPosts()
              uploadProgressStore.finish(pendingVideoUpload.jobId, 'done', 'Video uploaded and attached')
            } else {
              uploadProgressStore.finish(pendingVideoUpload.jobId, 'error', 'Video upload failed')
            }
          } catch (e) {
            console.error('Background video upload failed:', e)
            uploadProgressStore.finish(pendingVideoUpload.jobId, 'error', e instanceof Error ? e.message : 'Video upload failed')
          }
        })()
      }
      setNewPost('')
      setNewPostTitle('')
      setPostGifUrl(null)
      setPollEnabled(false)
      setPollQuestion('')
      setPollOptions(['', ''])
      // Reset textarea height
      const textarea = document.querySelector<HTMLTextAreaElement>('.post-composer-textarea');
      if (textarea) textarea.style.height = '';
      setPostImageFile(null)
      setPostImagePreview(null)
      setPostVideoFile(null)
      setPostVideoPreview(null)
      postVideoUploadRef.current = null
      setPostAudioFile(null)
      setPostCategory('discussion')
      setPostToAll(false)
      setUseCustomDateTime(false)
      setCustomDate('')
      setCustomTime('')
      fetchPosts()
      toast({ title: 'Posted!' })
      return true
    } catch (error) {
      console.error('Error creating post:', error)
      toast({ title: 'Error', description: error instanceof Error ? error.message : 'Failed to create post.', variant: 'destructive' })
      return false
    } finally {
      setIsPosting(false)
    }
  }

  const handleLike = async (postId: string, isLiked: boolean) => {
    if (!user?.id) return
    try {
      if (isLiked) {
        await supabase.from('community_reactions').delete().eq('post_id', postId).eq('user_id', user.id)
      } else {
        await supabase.from('community_reactions').insert({ post_id: postId, user_id: user.id, reaction_type: 'like' })
      }
      fetchPosts()
    } catch (error) { console.error('Error toggling like:', error) }
  }

  const handleDeletePost = async (postId: string) => {
    try {
      const { data, error } = await supabase
        .from('community_posts')
        .delete()
        .eq('id', postId)
        .select('id')
      if (error) throw error
      if (!data || data.length === 0) {
        toast({ title: 'Not allowed', description: 'You do not have permission to delete this post.', variant: 'destructive' })
        return
      }
      setPosts(prev => prev.filter(p => p.id !== postId))
      toast({ title: 'Post deleted' })
    } catch (error: any) {
      toast({ title: 'Error', description: error?.message || 'Failed to delete post.', variant: 'destructive' })
    }
  }

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setPostImageFile(file)
      setPostImagePreview(URL.createObjectURL(file))
    }
  }

  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const jobId = uploadProgressStore.start(file.name, file.size)
      const pending: PendingVideoUpload = {
        file,
        promise: Promise.resolve(null),
        uploadedUrl: null,
        status: 'uploading',
        jobId,
      }
      setPostVideoFile(file)
      setPostVideoPreview(URL.createObjectURL(file))
      postVideoUploadRef.current = pending

      uploadProgressStore.update(jobId, 1, { message: 'Starting video upload...', etaSeconds: null })
      pending.promise = uploadFileWithProgress(file, 'community-videos', (p, details) => {
        uploadProgressStore.update(jobId, p, details)
      }).then((url) => {
        pending.uploadedUrl = url
        pending.status = url ? 'done' : 'error'
        if (url) {
          uploadProgressStore.update(jobId, 100, { status: 'processing', message: 'Uploaded — finalizing when you post...', etaSeconds: null })
        } else {
          uploadProgressStore.finish(jobId, 'error', 'Video upload failed')
        }
        return url
      }).catch((error) => {
        pending.status = 'error'
        uploadProgressStore.finish(jobId, 'error', error instanceof Error ? error.message : 'Video upload failed')
        toast({ title: 'Video upload failed', description: error instanceof Error ? error.message : 'Please try a shorter video.', variant: 'destructive' })
        return null
      })
    }
  }

  const handleAudioSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setPostAudioFile(file)
    }
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (e) => {
        audioChunksRef.current.push(e.data)
      }

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        const audioFile = new File([audioBlob], `recording-${Date.now()}.webm`, { type: 'audio/webm' })
        setPostAudioFile(audioFile)
        stream.getTracks().forEach(track => track.stop())
      }

      mediaRecorder.start()
      setIsRecording(true)
    } catch (err) {
      toast({ title: 'Microphone access denied', variant: 'destructive' })
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }

  const handleCommunityPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !program) return

    // Show preview immediately
    setCommunityPhoto(URL.createObjectURL(file))

    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${program}/${Date.now()}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('community-photos')
        .upload(fileName, file, { cacheControl: '3600', upsert: true })

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('community-photos')
        .getPublicUrl(fileName)

      const groupName = PROGRAM_NAMES[program]
      const { error: updateError } = await supabase
        .from('community_groups')
        .update({ image_url: publicUrl })
        .eq('name', groupName)

      if (updateError) throw updateError

      setCommunityPhoto(publicUrl)
      toast({ title: 'Community photo saved!' })
    } catch (error) {
      console.error('Error uploading community photo:', error)
      toast({ title: 'Error', description: 'Failed to save community photo.', variant: 'destructive' })
    }
  }

  // Comments functions
  const toggleComments = async (postId: string) => {
    const newExpanded = new Set(expandedComments)
    if (newExpanded.has(postId)) {
      newExpanded.delete(postId)
    } else {
      newExpanded.add(postId)
      if (!postComments[postId]) {
        await fetchCommentsForPost(postId)
      }
    }
    setExpandedComments(newExpanded)
  }

  const fetchCommentsForPost = async (postId: string) => {
    try {
      const { data, error } = await supabase
        .from('community_comments')
        .select('*')
        .eq('post_id', postId)
        .order('created_at', { ascending: true })

      if (error) throw error

      const userIds = [...new Set((data || []).map(c => c.user_id))]
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name, avatar_url')
        .in('user_id', userIds.length ? userIds : [''])

      const profileMap = new Map((profiles || []).map(p => [p.user_id, p]))

      setPostComments(prev => ({
        ...prev,
        [postId]: (data || []).map(c => ({
          id: c.id,
          content: c.content,
          user_id: c.user_id,
          created_at: c.created_at,
          image_url: (c as any).image_url || null,
          audio_url: (c as any).audio_url || null,
          video_url: (c as any).video_url || null,
          author_name: profileMap.get(c.user_id)?.display_name || 'Member',
          author_avatar: profileMap.get(c.user_id)?.avatar_url || null,
        }))
      }))
    } catch (error) {
      console.error('Error fetching comments:', error)
    }
  }

  const handleSubmitComment = async (postId: string) => {
    const text = commentText[postId]?.trim()
    const imgFile = commentImageFiles[postId]
    const audFile = commentAudioFiles[postId]
    const vidFile = commentVideoFiles[postId]

    if (!text && !imgFile && !audFile && !vidFile) return
    if (!user?.id) return

    try {
      let imageUrl: string | null = null
      let audioUrl: string | null = null
      let videoUrl: string | null = null

      if (imgFile) imageUrl = await uploadFile(imgFile, 'comment-images')
      if (audFile) audioUrl = await uploadFile(audFile, 'comment-audio')
      if (vidFile) videoUrl = await uploadFile(vidFile, 'comment-videos')

      const { error } = await supabase
        .from('community_comments')
        .insert({
          post_id: postId,
          user_id: user.id,
          content: text || '',
          image_url: imageUrl,
          audio_url: audioUrl,
          video_url: videoUrl,
        } as any)

      if (error) throw error

      // Notify mentioned users
      if (text) notifyMentionedUsers(text, postId, 'comment')

      setCommentText(prev => ({ ...prev, [postId]: '' }))
      setCommentImageFiles(prev => ({ ...prev, [postId]: null }))
      setCommentAudioFiles(prev => ({ ...prev, [postId]: null }))
      setCommentVideoFiles(prev => ({ ...prev, [postId]: null }))
      await fetchCommentsForPost(postId)
      fetchPosts() // refresh comment count
    } catch (error) {
      console.error('Error posting comment:', error)
      toast({ title: 'Error', description: 'Failed to post comment.', variant: 'destructive' })
    }
  }

  const getInitials = (name: string) =>
    name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)

  const formatPostDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    return `${months[date.getMonth()]} ${date.getDate()}`
  }

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 60) return `${mins}m`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}h`
    const days = Math.floor(hours / 24)
    if (days < 30) return `${days}d`
    return `${Math.floor(days / 30)}mo`
  }

  const renderContentWithMentions = (content: string) => {
    // Match @Name or @First Last (up to 3 words, no newlines)
    const mentionRegex = /@([A-Za-z]\w*(?:\s[A-Za-z]\w*){0,2})/g
    const parts: React.ReactNode[] = []
    let lastIndex = 0
    let match

    while ((match = mentionRegex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        parts.push(content.slice(lastIndex, match.index))
      }
      parts.push(
        <strong key={match.index} className="font-bold">
          @{match[1]}
        </strong>
      )
      lastIndex = match.index + match[0].length
    }

    if (lastIndex < content.length) {
      parts.push(content.slice(lastIndex))
    }

    return parts.length > 0 ? parts : content
  }

  const extractMentions = (content: string): string[] => {
    const mentionRegex = /@([A-Za-z]\w*(?:\s[A-Za-z]\w*){0,2})/g
    const mentions: string[] = []
    let match
    while ((match = mentionRegex.exec(content)) !== null) {
      mentions.push(match[1])
    }
    return mentions
  }

  const notifyMentionedUsers = async (content: string, referenceId: string, type: 'post' | 'comment') => {
    if (!user?.id) return
    const mentions = extractMentions(content)
    if (mentions.length === 0) return

    try {
      // Look up mentioned users by display_name
      const { data: mentionedProfiles } = await supabase
        .from('profiles')
        .select('user_id, display_name')
        .in('display_name', mentions)

      if (!mentionedProfiles || mentionedProfiles.length === 0) return

      const notifications = mentionedProfiles
        .filter(p => p.user_id !== user.id)
        .map(p => ({
          user_id: p.user_id,
          sender_id: user.id,
          notification_type: 'community_post',
          title: type === 'post' ? 'You were mentioned in a post' : 'You were mentioned in a comment',
          message: `${profile?.display_name || 'Someone'} mentioned you: "${content.substring(0, 100)}${content.length > 100 ? '...' : ''}"`,
          reference_id: referenceId,
          is_read: false,
        }))

      if (notifications.length > 0) {
        await supabase.from('notifications').insert(notifications)
      }
    } catch (error) {
      console.error('Error notifying mentioned users:', error)
    }
  }

  const isEmbeddableVideoUrl = (url: string): boolean => {
    if (!url) return false
    return /youtube\.com|youtu\.be|loom\.com|vimeo\.com|tella\.tv|fathom\.video|fathom\.fm|fathom\.video\/share|fathom\.video\/calls|fathom\.video\/embed|fathom\.fm\/share|fathom\.fm\/calls|fathom\.fm\/embed/.test(url)
  }

  const extractFirstVideoUrl = (text: string): string | null => {
    if (!text) return null
    const match = text.match(/https?:\/\/[^\s<]+/g)
    if (!match) return null
    return match.find(u => isEmbeddableVideoUrl(u)) || null
  }

  const getEmbedUrl = (url: string): string => {
    if (url.includes("youtube.com") || url.includes("youtu.be")) {
      const videoId = url.includes("youtu.be")
        ? url.split("youtu.be/")[1]?.split("?")[0]
        : new URLSearchParams(url.split("?")[1]).get("v")
      return `https://www.youtube.com/embed/${videoId}`
    }
    if (url.includes("loom.com")) {
      const loomId = url.split("loom.com/share/")[1]?.split("?")[0]
      return `https://www.loom.com/embed/${loomId}`
    }
    if (url.includes("vimeo.com")) {
      const vimeoId = url.split("vimeo.com/")[1]?.split("?")[0]
      return `https://player.vimeo.com/video/${vimeoId}`
    }
    // Tella.tv
    if (url.includes("tella.tv")) {
      if (url.includes("/embed")) return url
      const tellaMatch = url.match(/tella\.tv\/(?:video|share)\/([a-zA-Z0-9_-]+)/)
      if (tellaMatch) return `https://www.tella.tv/video/${tellaMatch[1]}/embed`
    }
    // Fathom recordings (fathom.video / fathom.fm)
    if (url.includes("fathom.video") || url.includes("fathom.fm")) {
      const fathomMatch = url.match(/fathom\.(?:video|fm)\/(?:share|calls|embed)\/([a-zA-Z0-9_-]+)/)
      if (fathomMatch) return `https://fathom.video/embed/${fathomMatch[1]}`
      return url
    }
    return url
  }

  const renderVideoEmbed = (url: string, className = 'aspect-video w-full mt-3 rounded-lg overflow-hidden border') => (
    <div className={className}>
      <iframe
        src={getEmbedUrl(url)}
        className="w-full h-full"
        title="Video preview"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  )

  // Get the next program for upgrade
  const getUpgradeProgram = () => {
    const upgradeTo = PROGRAM_UPGRADE_MAP[program]
    if (!upgradeTo) return null
    const { PROGRAMS } = require('@/lib/stripe-programs')
    return PROGRAMS.find((p: any) => p.id === upgradeTo) || null
  }

  const handleAutoUpgrade = async () => {
    // Find the lowest price for the next program
    const { PROGRAMS } = await import('@/lib/stripe-programs')
    const nextProgramId = PROGRAM_UPGRADE_MAP[program] || program
    const nextProgram = PROGRAMS.find((p: any) => p.id === nextProgramId)
    if (nextProgram && nextProgram.pricing.length > 0) {
      const lowestPrice = nextProgram.pricing.reduce((min: any, p: any) => p.amount < min.amount ? p : min, nextProgram.pricing[0])
      createCheckout(lowestPrice.price_id, lowestPrice.mode, nextProgram.name)
    }
  }

  // Filter posts by active category, then sort with pinned first
  const filteredPosts = (activeCategory === 'all'
    ? posts
    : posts.filter(p => p.category === activeCategory)
  ).slice().sort((a, b) => {
    if (a.pinned && !b.pinned) return -1
    if (!a.pinned && b.pinned) return 1
    if (a.pinned && b.pinned) {
      return new Date(b.pinned_at || b.created_at).getTime() - new Date(a.pinned_at || a.created_at).getTime()
    }
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })

  const handleTogglePin = async (post: Post) => {
    const newPinned = !post.pinned
    const { error } = await supabase
      .from('community_posts')
      .update({ pinned: newPinned, pinned_at: newPinned ? new Date().toISOString() : null } as any)
      .eq('id', post.id)
    if (error) {
      toast({ title: 'Error', description: 'Failed to update pin', variant: 'destructive' })
      return
    }
    setPosts(prev => prev.map(p => p.id === post.id ? { ...p, pinned: newPinned, pinned_at: newPinned ? new Date().toISOString() : null } : p))
    toast({ title: newPinned ? 'Post pinned' : 'Post unpinned' })
  }

  const categoryLabel = CATEGORIES.find(c => c.value === postCategory)

  // Mobile post composer dialog state
  const [mobilePostOpen, setMobilePostOpen] = useState(false)

  const handleMobilePost = async () => {
    const posted = await handleCreatePost()
    if (posted) setMobilePostOpen(false)
  }

  // If no program selected, show loading if resolving from post param, otherwise prompt
  if (!program) {
    if (postParam) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center space-y-3">
            <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-muted-foreground text-sm">Loading community...</p>
          </div>
        </div>
      )
    }
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-3">
          <MessageCircle className="h-12 w-12 text-muted-foreground/30 mx-auto" />
          <p className="text-muted-foreground">Select a community from the sidebar to get started.</p>
        </div>
      </div>
    )
  }

  // If community is locked, render blurred content with overlay popup
  if (!hasProgramAccess && !subscriptionStatus.loading) {
    return (
      <div className="relative min-h-screen bg-background overflow-hidden">
        {/* Blurred background content */}
        <div className="blur-md pointer-events-none select-none opacity-60">
          <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6">
            <div className="flex flex-col lg:flex-row gap-6">
              <div className="flex-1 min-w-0 space-y-4">
                <h2 className="text-lg font-bold">{programName}</h2>
                {/* Fake post composer */}
                <div className="rounded-xl border border-border p-4 bg-card space-y-3">
                  <div className="flex gap-3 items-center">
                    <div className="w-10 h-10 rounded-full bg-muted" />
                    <div className="flex-1 h-8 rounded-lg bg-muted" />
                  </div>
                </div>
                {/* Fake posts */}
                {[1,2,3].map(i => (
                  <div key={i} className="rounded-xl border border-border p-4 bg-card space-y-3">
                    <div className="flex gap-3 items-center">
                      <div className="w-10 h-10 rounded-full bg-muted" />
                      <div className="space-y-1.5 flex-1">
                        <div className="h-3.5 w-32 bg-muted rounded" />
                        <div className="h-2.5 w-20 bg-muted/60 rounded" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="h-3 bg-muted rounded w-full" />
                      <div className="h-3 bg-muted rounded w-4/5" />
                      <div className="h-3 bg-muted rounded w-3/5" />
                    </div>
                  </div>
                ))}
              </div>
              <div className="w-full lg:w-72 space-y-4">
                <div className="rounded-xl border border-border p-4 bg-card space-y-3">
                  <div className="h-16 w-full rounded-lg bg-muted" />
                  <div className="h-4 w-36 bg-muted rounded mx-auto" />
                  <div className="h-3 w-48 bg-muted/60 rounded mx-auto" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Dark overlay */}
        <div className="absolute inset-0 bg-black/50" />

        {/* Centered lock icon + trigger popup */}
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-[#ffb500]/20 flex items-center justify-center mx-auto">
              <Lock className="h-8 w-8 text-[#ffb500]" />
            </div>
            <div className="space-y-1">
              <h3 className="text-white text-xl font-bold">This community is locked</h3>
              <p className="text-white/70 text-sm">Upgrade to access {programName}</p>
            </div>
            <Button
              className="rounded-xl px-8 h-11 font-semibold"
              style={{ backgroundColor: '#ffb500', color: '#290a52' }}
              onClick={() => setLockedPopupOpen(true)}
            >
              Unlock Now
            </Button>
          </div>
        </div>

        {/* Stripe-style payment modal */}
        <StripePaymentModal
          open={lockedPopupOpen}
          onOpenChange={setLockedPopupOpen}
          programFilter={program as any}
          title={`Unlock ${programName}`}
        />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Main Feed */}
          <div className="flex-1 min-w-0 space-y-4">
            {/* Community name header on mobile only */}
            <h2 className="text-lg font-bold lg:hidden">{programName}</h2>

            {/* Mobile: Simple "Write something" bar */}
            <div className="lg:hidden">
              <Card className="border-border/50 cursor-pointer" onClick={() => setMobilePostOpen(true)}>
                <CardContent className="p-3 flex items-center gap-3">
                  <Avatar className="h-10 w-10 flex-shrink-0">
                    {profile?.avatar_url && <AvatarImage src={profile.avatar_url} />}
                    <AvatarFallback className="bg-primary/10 text-primary text-sm">
                      {getInitials(profile?.display_name || 'U')}
                    </AvatarFallback>
                  </Avatar>
                  <span className="flex-1 text-sm text-muted-foreground">Write something...</span>
                </CardContent>
              </Card>
            </div>

            {/* Mobile Post Dialog - Skool style */}
            <Dialog open={mobilePostOpen} onOpenChange={setMobilePostOpen}>
              <DialogContent className="lg:hidden fixed inset-0 max-w-full w-full h-full translate-x-0 translate-y-0 left-0 top-0 rounded-none border-0 p-0 flex flex-col z-[70] [&>button]:hidden">
                {/* Top bar */}
                <div className="grid grid-cols-3 items-center px-4 py-3 border-b border-border/50 bg-background">
                  <div className="flex justify-start">
                    <button
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                      onClick={() => setMobilePostOpen(false)}
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                  <span className="text-sm font-semibold text-center">New Post</span>
                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      onClick={handleMobilePost}
                      disabled={isPosting || (!newPost.trim() && !newPostTitle.trim() && !postGifUrl && !postImageFile && !postVideoFile && !postAudioFile && !(pollEnabled && pollQuestion.trim()))}
                      className="rounded-full px-5 h-8 text-xs font-bold hover:bg-[hsl(43,100%,50%)] hover:text-[hsl(270,80%,15%)] transition-colors"
                    >
                      {isPosting ? 'POSTING...' : 'POST'}
                    </Button>
                  </div>
                </div>

                {/* Send to all toggle for admins */}
                {(isAdmin || isOwner) && (
                  <div className="flex items-center justify-between px-4 py-2 border-b border-border/30 bg-muted/30">
                    <span className="text-xs text-muted-foreground">📧 Send email to all members</span>
                    <button
                      className={`text-xs font-semibold px-3 py-1 rounded-full border transition-colors ${postToAll ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground'}`}
                      onClick={() => setPostToAll(!postToAll)}
                    >
                      {postToAll ? 'ON' : 'OFF'}
                    </button>
                  </div>
                )}

                {/* Owner-only custom date/time */}
                {isOwner && (
                  <div className="px-4 py-2 border-b border-border/30 bg-muted/30 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">📅 Custom date & time</span>
                      <button
                        className={`text-xs font-semibold px-3 py-1 rounded-full border transition-colors ${useCustomDateTime ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground'}`}
                        onClick={() => setUseCustomDateTime(!useCustomDateTime)}
                      >
                        {useCustomDateTime ? 'ON' : 'OFF'}
                      </button>
                    </div>
                    {useCustomDateTime && (
                      <div className="flex gap-2">
                        <Input type="date" value={customDate} onChange={e => setCustomDate(e.target.value)} className="h-8 text-xs flex-1" />
                        <Input type="time" value={customTime} onChange={e => setCustomTime(e.target.value)} className="h-8 text-xs w-28" />
                      </div>
                    )}
                  </div>
                )}


                <div className="flex items-center gap-3 px-4 pt-4 pb-2">
                  <Avatar className="h-11 w-11 flex-shrink-0">
                    {profile?.avatar_url && <AvatarImage src={profile.avatar_url} />}
                    <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                      {getInitials(profile?.display_name || 'U')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="leading-tight">
                    <p className="font-semibold text-sm">{profile?.display_name || 'You'}</p>
                    <p className="text-xs text-muted-foreground">
                      posting in <span className="font-medium text-foreground">{programName.length > 28 ? programName.slice(0, 28) + '…' : programName}</span>
                    </p>
                  </div>
                </div>

                {/* Content area */}
                <div className="flex-1 px-4 overflow-y-auto">
                  <Input
                    placeholder="Title (optional)"
                    value={newPostTitle}
                    onChange={(e) => setNewPostTitle(e.target.value)}
                    className="border-0 px-0 text-base font-semibold placeholder:text-muted-foreground/40 focus-visible:ring-0 focus-visible:ring-offset-0 h-auto py-2 mb-1"
                  />
                  <Textarea
                    placeholder="Share something with the community..."
                    value={newPost}
                    onChange={(e) => setNewPost(e.target.value)}
                    className="border-0 px-0 resize-none min-h-[180px] focus-visible:ring-0 focus-visible:ring-offset-0 text-sm placeholder:text-muted-foreground/40"
                    autoFocus
                  />

                  {/* Poll editor */}
                  {pollEnabled && (
                    <div className="mt-2">
                      <PollDraftEditor
                        question={pollQuestion}
                        options={pollOptions}
                        onChange={(q, o) => { setPollQuestion(q); setPollOptions(o) }}
                        onRemove={() => { setPollEnabled(false); setPollQuestion(''); setPollOptions(['', '']) }}
                      />
                    </div>
                  )}

                  {/* GIF preview */}
                  {postGifUrl && (
                    <div className="relative inline-block mt-3">
                      <img src={postGifUrl} alt="GIF" className="max-h-48 rounded-xl" />
                      <button onClick={() => setPostGifUrl(null)} className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-0.5 shadow">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  )}

                  {/* Live video link preview */}
                  {(() => {
                    const link = extractFirstVideoUrl(newPost)
                    if (!link) return null
                    return renderVideoEmbed(link)
                  })()}

                  {/* Attachment previews */}
                  {(postImagePreview || postVideoPreview || postAudioFile) && (
                    <div className="flex flex-wrap gap-2 mt-3 pb-2">
                      {postImagePreview && (
                        <div className="relative inline-block">
                          <img src={postImagePreview} alt="Preview" className="h-24 rounded-xl object-cover" />
                          <button onClick={() => { setPostImageFile(null); setPostImagePreview(null) }} className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-0.5 shadow">
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      )}
                      {postVideoPreview && (
                        <div className="relative inline-block">
                          <video src={postVideoPreview} className="h-24 rounded-xl object-cover" />
                          <button onClick={() => { setPostVideoFile(null); setPostVideoPreview(null); postVideoUploadRef.current = null }} className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-0.5 shadow">
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      )}
                      {postAudioFile && (
                        <div className="relative inline-flex items-center gap-2 bg-muted rounded-xl px-3 py-2">
                          <Mic className="h-4 w-4 text-primary" />
                          <span className="text-xs font-medium">{postAudioFile.name.slice(0, 20)}</span>
                          <button onClick={() => setPostAudioFile(null)}>
                            <X className="h-3 w-3 text-muted-foreground" />
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Bottom toolbar */}
                <div className="border-t border-border/50 px-4 py-3 pb-6 flex items-center gap-2 bg-muted/30 mb-[env(safe-area-inset-bottom)] flex-wrap">
                  <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
                  <input ref={videoInputRef} type="file" accept="video/*" className="hidden" onChange={handleVideoSelect} />
                  <input ref={audioInputRef} type="file" accept="audio/*" className="hidden" onChange={handleAudioSelect} />
                  <button className="w-9 h-9 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors" onClick={() => imageInputRef.current?.click()}>
                    <Image className="h-5 w-5" />
                  </button>
                  <button className="w-9 h-9 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors" onClick={() => videoInputRef.current?.click()}>
                    <Video className="h-5 w-5" />
                  </button>
                  <button
                    className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${isRecording ? 'text-destructive bg-destructive/10' : 'text-muted-foreground hover:text-foreground hover:bg-muted'}`}
                    onClick={isRecording ? stopRecording : startRecording}
                  >
                    {isRecording ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                  </button>
                  <EmojiButton onPick={(e) => setNewPost(prev => prev + e)} />
                  <GifButton onPick={(url) => setPostGifUrl(url)} />
                  <button
                    className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${pollEnabled ? 'text-[#ffb500] bg-[#ffb500]/10' : 'text-muted-foreground hover:text-foreground hover:bg-muted'}`}
                    onClick={() => setPollEnabled(v => !v)}
                    aria-label="Add poll"
                  >
                    <ListChecks className="h-5 w-5" />
                  </button>
                  <div className="ml-auto">
                    <Select value={postCategory} onValueChange={setPostCategory}>
                      <SelectTrigger className="h-9 w-auto text-xs rounded-full border-border/70 bg-background px-3">
                        <SelectValue placeholder="Category" />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.filter(c => c.value !== 'all').map(c => (
                          <SelectItem key={c.value} value={c.value}>{c.emoji} {c.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {/* Desktop: Full inline Post Composer */}
            <Card className="border-border/50 hidden lg:block">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-start gap-3">
                  <Avatar className="h-10 w-10 flex-shrink-0 mt-1">
                    {profile?.avatar_url && <AvatarImage src={profile.avatar_url} />}
                    <AvatarFallback className="bg-primary/10 text-primary text-sm">
                      {getInitials(profile?.display_name || 'U')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 space-y-2">
                    <Input
                      placeholder="Title (optional)"
                      value={newPostTitle}
                      onChange={(e) => setNewPostTitle(e.target.value)}
                      className="h-9 border-0 bg-muted/50 rounded-lg px-4 text-sm font-semibold placeholder:text-muted-foreground/60 focus-visible:ring-1"
                    />
                    <Textarea
                      placeholder="Write something..."
                      value={newPost}
                      onChange={(e) => {
                        setNewPost(e.target.value);
                        e.target.style.height = 'auto';
                        if (e.target.value) {
                          e.target.style.height = e.target.scrollHeight + 'px';
                        } else {
                          e.target.style.height = '';
                        }
                      }}
                      className="post-composer-textarea min-h-[44px] resize-none border-0 bg-muted/50 rounded-lg px-4 py-2.5 focus-visible:ring-1 text-sm overflow-hidden"
                      rows={1}
                    />
                    {pollEnabled && (
                      <PollDraftEditor
                        question={pollQuestion}
                        options={pollOptions}
                        onChange={(q, o) => { setPollQuestion(q); setPollOptions(o) }}
                        onRemove={() => { setPollEnabled(false); setPollQuestion(''); setPollOptions(['', '']) }}
                      />
                    )}
                    {postGifUrl && (
                      <div className="relative inline-block">
                        <img src={postGifUrl} alt="GIF" className="max-h-40 rounded-lg" />
                        <button onClick={() => setPostGifUrl(null)} className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-0.5">
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                    {/* Preview attachments */}
                    <div className="flex flex-wrap gap-2">
                      {postImagePreview && (
                        <div className="relative inline-block">
                          <img src={postImagePreview} alt="Preview" className="h-20 rounded-lg object-cover" />
                          <button onClick={() => { setPostImageFile(null); setPostImagePreview(null) }} className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-0.5">
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      )}
                      {postVideoPreview && (
                        <div className="relative inline-block">
                          <video src={postVideoPreview} className="h-20 rounded-lg object-cover" />
                          <button onClick={() => { setPostVideoFile(null); setPostVideoPreview(null); postVideoUploadRef.current = null }} className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-0.5">
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      )}
                      {postAudioFile && (
                        <div className="relative inline-flex items-center gap-1 bg-muted/50 rounded-lg px-3 py-1.5">
                          <Mic className="h-3.5 w-3.5" />
                          <span className="text-xs">{postAudioFile.name.slice(0, 20)}</span>
                          <button onClick={() => setPostAudioFile(null)} className="ml-1">
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-nowrap">
                      <div className="flex items-center gap-1 flex-nowrap min-w-0 flex-1">
                        <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
                        <input ref={videoInputRef} type="file" accept="video/*" className="hidden" onChange={handleVideoSelect} />
                        <input ref={audioInputRef} type="file" accept="audio/*" className="hidden" onChange={handleAudioSelect} />
                        <Button variant="ghost" size="icon" title="Photo" className="h-8 w-8" onClick={() => imageInputRef.current?.click()}>
                          <Image className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" title="Video" className="h-8 w-8" onClick={() => videoInputRef.current?.click()}>
                          <Video className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title={isRecording ? 'Stop recording' : 'Audio'}
                          className={`h-8 w-8 ${isRecording ? 'text-destructive' : ''}`}
                          onClick={isRecording ? stopRecording : startRecording}
                        >
                          {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                        </Button>
                        <EmojiButton onPick={(e) => setNewPost(prev => prev + e)} className="!h-8 !w-8" />
                        <GifButton onPick={(url) => setPostGifUrl(url)} className="!h-8 !w-8" />
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Poll"
                          className={`h-8 w-8 ${pollEnabled ? 'text-[#ffb500]' : ''}`}
                          onClick={() => setPollEnabled(v => !v)}
                        >
                          <ListChecks className="h-4 w-4" />
                        </Button>
                        <Select value={postCategory} onValueChange={setPostCategory}>
                          <SelectTrigger className="h-8 w-10 text-xs border-0 bg-muted/50 px-2 [&>svg]:hidden justify-center" title="Category">
                            <SelectValue>
                              {CATEGORIES.find(c => c.value === postCategory)?.emoji || '💬'}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {CATEGORIES.filter(c => c.value !== 'all').map(c => (
                              <SelectItem key={c.value} value={c.value}>{c.emoji} {c.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {(isAdmin || isOwner) && (
                          <Button
                            variant={postToAll ? 'default' : 'ghost'}
                            size="icon"
                            title="Post to all communities"
                            className={`h-8 w-8 ${postToAll ? 'bg-[#ffb500] text-[#290a52] hover:bg-[#ffb500]/90' : ''}`}
                            onClick={() => setPostToAll(!postToAll)}
                          >
                            <Users className="h-4 w-4" />
                          </Button>
                        )}
                        {isOwner && (
                          <Button
                            variant={useCustomDateTime ? 'default' : 'ghost'}
                            size="icon"
                            title="Custom date"
                            className={`h-8 w-8 ${useCustomDateTime ? 'bg-[#ffb500] text-[#290a52] hover:bg-[#ffb500]/90' : ''}`}
                            onClick={() => setUseCustomDateTime(!useCustomDateTime)}
                          >
                            <Calendar className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      <div className="ml-auto flex-shrink-0">
                        <Button size="sm" onClick={handleCreatePost} disabled={isPosting || (!newPost.trim() && !newPostTitle.trim() && !postGifUrl && !postImageFile && !postVideoFile && !postAudioFile && !(pollEnabled && pollQuestion.trim()))} className="gap-1.5 bg-[#ffb500] hover:bg-[#2eb2ff] text-foreground">
                          <Send className="h-4 w-4" />
                          {isPosting ? 'Posting...' : postToAll ? 'Post to All' : 'Post'}
                        </Button>
                      </div>
                    </div>
                    {isOwner && useCustomDateTime && (
                      <div className="flex items-center gap-2 flex-wrap">
                        <Input type="date" value={customDate} onChange={e => setCustomDate(e.target.value)} className="h-8 text-xs w-40" />
                        
                      </div>
                    )}
                  </div>
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
              ) : filteredPosts.length === 0 ? (
                <Card className="border-border/50">
                  <CardContent className="p-8 text-center">
                    <MessageCircle className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-50" />
                    <h3 className="font-semibold mb-1">No posts yet</h3>
                    <p className="text-sm text-muted-foreground">
                      {activeCategory !== 'all' ? `No ${activeCategory} posts yet. Be the first!` : 'Be the first to share something!'}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                filteredPosts.map(post => (
                  <Card key={post.id} className="border-border/50 hover:border-border transition-colors">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <Avatar className="h-10 w-10 flex-shrink-0">
                          {post.author_avatar && <AvatarImage src={post.author_avatar} />}
                          <AvatarFallback className="bg-secondary text-secondary-foreground text-sm font-semibold">
                            {getInitials(post.author_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-sm">{post.author_name}</span>
                            <span className="text-xs text-muted-foreground">{formatPostDate(post.created_at)}</span>
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 capitalize">{post.category}</Badge>
                            {post.pinned && (
                              <Badge className="text-[10px] px-1.5 py-0 bg-[#ffb500] text-foreground hover:bg-[#ffb500] gap-1">
                                <Pin className="h-2.5 w-2.5" /> Pinned
                              </Badge>
                            )}
                          </div>
                          {editingPostId === post.id ? (
                            <div className="mt-2 space-y-2">
                              <Input
                                placeholder="Title (optional)"
                                value={editingPostTitle}
                                onChange={(e) => setEditingPostTitle(e.target.value)}
                                className="h-9 bg-muted/50 rounded-lg px-3 text-sm font-semibold focus-visible:ring-1"
                              />
                              <Textarea
                                value={editingPostContent}
                                onChange={(e) => {
                                  setEditingPostContent(e.target.value);
                                  e.target.style.height = 'auto';
                                  if (e.target.value) {
                                    e.target.style.height = e.target.scrollHeight + 'px';
                                  } else {
                                    e.target.style.height = '';
                                  }
                                }}
                                className="min-h-[44px] resize-none bg-muted/50 rounded-lg px-3 py-2 text-sm overflow-hidden focus-visible:ring-1"
                                rows={1}
                                ref={(el) => {
                                  if (el) {
                                    el.style.height = 'auto';
                                    el.style.height = el.scrollHeight + 'px';
                                  }
                                }}
                              />
                              <div className="flex items-center gap-2 flex-wrap">
                                <Select value={editingPostCategory} onValueChange={setEditingPostCategory}>
                                  <SelectTrigger className="h-7 w-auto min-w-[120px] text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {CATEGORIES.filter(c => c.value !== 'all').map(c => (
                                      <SelectItem key={c.value} value={c.value}>{c.emoji} {c.label}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                {(isOwner) && (
                                  <Input
                                    type="date"
                                    value={editingPostDate}
                                    onChange={(e) => setEditingPostDate(e.target.value)}
                                    className="h-7 text-xs w-44"
                                  />
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  size="sm"
                                  className="h-7 gap-1 text-xs bg-[#ffb500] hover:bg-[#2eb2ff] text-foreground"
                                  onClick={async () => {
                                    if (!editingPostContent.trim()) return;
                                    const updateData: Record<string, unknown> = {
                                      content: editingPostContent.trim(),
                                      category: editingPostCategory,
                                      title: editingPostTitle.trim() || null,
                                    };
                                    if (isOwner && editingPostDate) {
                                      const originalTime = new Date(post.created_at);
                                      const newDate = new Date(editingPostDate + 'T' + originalTime.toISOString().split('T')[1]);
                                      updateData.created_at = newDate.toISOString();
                                    }
                                    const { error } = await supabase
                                      .from('community_posts')
                                      .update(updateData)
                                      .eq('id', post.id);
                                    if (error) {
                                      toast({ title: 'Error', description: 'Failed to update post', variant: 'destructive' });
                                    } else {
                                      setPosts(prev => prev.map(p => p.id === post.id ? { ...p, content: editingPostContent.trim(), category: editingPostCategory, title: editingPostTitle.trim() || null, ...(updateData.created_at ? { created_at: updateData.created_at as string } : {}) } : p));
                                      setEditingPostId(null);
                                      toast({ title: 'Post updated' });
                                    }
                                  }}
                                >
                                  <Check className="h-3 w-3" /> Save
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 text-xs bg-[#ffb500] hover:bg-[#2eb2ff] text-foreground"
                                  onClick={() => setEditingPostId(null)}
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          ) : (
                            (() => {
                              const isExpanded = expandedPosts.has(post.id)
                              const lineCount = (post.content.match(/\n/g) || []).length + 1
                              const shouldClamp = !isExpanded && (lineCount > 3 || post.content.length > 280)
                              return (
                                <div className="mt-2">
                                  {post.title && (
                                    <h3 className="text-base font-semibold leading-snug mb-1">{post.title}</h3>
                                  )}
                                  {post.content && (
                                    <p className={`text-sm whitespace-pre-wrap break-words leading-relaxed ${shouldClamp ? 'line-clamp-3' : ''}`}>
                                      {renderContentWithMentions(post.content)}
                                    </p>
                                  )}
                                  {post.content && (lineCount > 3 || post.content.length > 280) && (
                                    <button
                                      type="button"
                                      onClick={() => setExpandedPosts(prev => {
                                        const next = new Set(prev)
                                        if (next.has(post.id)) next.delete(post.id); else next.add(post.id)
                                        return next
                                      })}
                                      className="text-xs font-medium text-[#2eb2ff] hover:underline mt-1"
                                    >
                                      {isExpanded ? 'Show less' : 'Show more'}
                                    </button>
                                  )}
                                </div>
                              )
                            })()
                          )}
                          
                          {post.image_url && (
                            <img src={post.image_url} alt="" className="rounded-lg mt-3 max-h-80 object-cover w-full" />
                          )}
                          {post.gif_url && (
                            <img src={post.gif_url} alt="GIF" className="rounded-lg mt-3 max-h-80 object-contain" />
                          )}
                          {post.video_url && (
                            isEmbeddableVideoUrl(post.video_url) ? (
                              renderVideoEmbed(post.video_url)
                            ) : (
                              <video src={post.video_url} controls className="rounded-lg mt-3 max-h-80 w-full" />
                            )
                          )}
                          {!post.video_url && post.content && (() => {
                            const videoLink = extractFirstVideoUrl(post.content)
                            if (!videoLink) return null
                            return renderVideoEmbed(videoLink)
                          })()}
                          {post.audio_url && (
                            <audio src={post.audio_url} controls className="mt-3 w-full" />
                          )}
                          <PollDisplay postId={post.id} />

                          <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border/50">
                             <button
                              onClick={() => handleLike(post.id, post.is_liked)}
                              className={`flex items-center gap-1.5 text-sm transition-colors ${
                                post.is_liked ? 'text-secondary font-medium' : 'text-foreground/60 hover:text-foreground'
                              }`}
                            >
                              <ThumbsUp className={`h-4 w-4 ${post.is_liked ? 'fill-current' : ''}`} />
                              {post.likes_count > 0 && post.likes_count}
                            </button>
                            <button 
                              onClick={() => toggleComments(post.id)}
                              className="flex items-center gap-1.5 text-sm text-foreground/60 hover:text-foreground transition-colors"
                            >
                              <MessageCircle className="h-4 w-4" />
                              {post.comments_count > 0 && post.comments_count}
                            </button>
                          </div>

                          {/* Comments Section */}
                          {expandedComments.has(post.id) && (
                            <div className="mt-3 pt-3 border-t border-border/30 space-y-3">
                              {/* Existing comments */}
                              {(postComments[post.id] || []).map(comment => (
                                <div key={comment.id} className="flex items-start gap-2 group/comment">
                                  <Avatar className="h-7 w-7 flex-shrink-0">
                                    {comment.author_avatar && <AvatarImage src={comment.author_avatar} />}
                                    <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                                      {getInitials(comment.author_name)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="flex-1 min-w-0">
                                    <div className="bg-muted/50 rounded-lg px-3 py-2">
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs font-semibold">{comment.author_name}</span>
                                        <span className="text-[10px] text-muted-foreground">{timeAgo(comment.created_at)}</span>
                                        {(comment.user_id === user?.id || isAdmin || isOwner) && (
                                          <button
                                            onClick={async () => {
                                              try {
                                                await supabase.from('community_comments').delete().eq('id', comment.id)
                                                fetchCommentsForPost(post.id)
                                                toast({ title: 'Comment deleted' })
                                              } catch {
                                                toast({ title: 'Error', description: 'Failed to delete comment', variant: 'destructive' })
                                              }
                                            }}
                                            className="opacity-0 group-hover/comment:opacity-100 text-destructive hover:text-destructive/80 transition-opacity"
                                          >
                                            <X className="h-3 w-3" />
                                          </button>
                                        )}
                                      </div>
                                      {comment.content && <p className="text-sm mt-0.5">{renderContentWithMentions(comment.content)}</p>}
                                      {comment.image_url && (
                                        <img src={comment.image_url} alt="" className="rounded mt-2 max-h-40 object-cover" />
                                      )}
                                      {comment.video_url && (
                                        <video src={comment.video_url} controls className="rounded mt-2 max-h-40 w-full" />
                                      )}
                                      {comment.audio_url && (
                                        <audio src={comment.audio_url} controls className="mt-2 w-full h-8" />
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))}

                              {/* Comment input */}
                              <div className="flex items-start gap-2">
                                <Avatar className="h-7 w-7 flex-shrink-0">
                                  {profile?.avatar_url && <AvatarImage src={profile.avatar_url} />}
                                  <AvatarFallback className="bg-primary/10 text-primary text-xs">
                                    {getInitials(profile?.display_name || 'U')}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 space-y-1.5">
                                  <div className="flex gap-1.5">
                                    <Input
                                      placeholder="Write a comment..."
                                      value={commentText[post.id] || ''}
                                      onChange={(e) => setCommentText(prev => ({ ...prev, [post.id]: e.target.value }))}
                                      className="h-8 text-sm flex-1"
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                          e.preventDefault()
                                          handleSubmitComment(post.id)
                                        }
                                      }}
                                    />
                                    <Button size="sm" className="h-8 px-2" onClick={() => handleSubmitComment(post.id)}>
                                      <Send className="h-3.5 w-3.5" />
                                    </Button>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <input 
                                      ref={(el) => { commentImageRefs.current[post.id] = el }} 
                                      type="file" accept="image/*" className="hidden" 
                                      onChange={(e) => {
                                        const file = e.target.files?.[0]
                                        if (file) setCommentImageFiles(prev => ({ ...prev, [post.id]: file }))
                                      }} 
                                    />
                                    <input 
                                      ref={(el) => { commentVideoRefs.current[post.id] = el }} 
                                      type="file" accept="video/*" className="hidden" 
                                      onChange={(e) => {
                                        const file = e.target.files?.[0]
                                        if (file) setCommentVideoFiles(prev => ({ ...prev, [post.id]: file }))
                                      }} 
                                    />
                                    <input 
                                      ref={(el) => { commentAudioRefs.current[post.id] = el }} 
                                      type="file" accept="audio/*" className="hidden" 
                                      onChange={(e) => {
                                        const file = e.target.files?.[0]
                                        if (file) setCommentAudioFiles(prev => ({ ...prev, [post.id]: file }))
                                      }} 
                                    />
                                    <Button variant="ghost" size="sm" className="h-6 px-1.5 text-[10px]" onClick={() => commentImageRefs.current[post.id]?.click()}>
                                      <Image className="h-3 w-3" />
                                    </Button>
                                    <Button variant="ghost" size="sm" className="h-6 px-1.5 text-[10px]" onClick={() => commentVideoRefs.current[post.id]?.click()}>
                                      <Video className="h-3 w-3" />
                                    </Button>
                                    <Button variant="ghost" size="sm" className="h-6 px-1.5 text-[10px]" onClick={() => commentAudioRefs.current[post.id]?.click()}>
                                      <Mic className="h-3 w-3" />
                                    </Button>
                                    {commentImageFiles[post.id] && (
                                      <span className="text-[10px] text-muted-foreground">📷 attached</span>
                                    )}
                                    {commentVideoFiles[post.id] && (
                                      <span className="text-[10px] text-muted-foreground">🎥 attached</span>
                                    )}
                                    {commentAudioFiles[post.id] && (
                                      <span className="text-[10px] text-muted-foreground">🎤 attached</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        {(post.user_id === user?.id || isAdmin || isOwner) && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {(isAdmin || isOwner) && (
                                <DropdownMenuItem onClick={() => handleTogglePin(post)}>
                                  {post.pinned ? (
                                    <><PinOff className="h-3.5 w-3.5 mr-2" /> Unpin Post</>
                                  ) : (
                                    <><Pin className="h-3.5 w-3.5 mr-2" /> Pin Post</>
                                  )}
                                </DropdownMenuItem>
                              )}
                              {(post.user_id === user?.id || isAdmin || isOwner) && (
                                <DropdownMenuItem onClick={() => {
                                  setEditingPostId(post.id);
                                  setEditingPostContent(post.content);
                                  setEditingPostTitle(post.title || '');
                                  setEditingPostCategory(post.category || 'discussion');
                                  const postDate = new Date(post.created_at);
                                  setEditingPostDate(postDate.toISOString().split('T')[0]);
                                }}>
                                  <Pencil className="h-3.5 w-3.5 mr-2" />
                                  Edit Post
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem className="text-destructive" onClick={() => handleDeletePost(post.id)}>
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

          {/* Right Sidebar - hidden on mobile */}
          <div className="hidden lg:block w-full lg:w-72 xl:w-80 flex-shrink-0 space-y-4">
            <Card className="border-border/50 overflow-hidden">
              {/* Community Photo */}
              <div 
                className="relative h-32 bg-muted cursor-pointer group"
                onClick={() => communityPhotoRef.current?.click()}
              >
                {communityPhoto ? (
                  <img src={communityPhoto} alt={programName} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground">
                    <Camera className="h-8 w-8 mb-1 opacity-50" />
                    <span className="text-xs">Add community photo</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Camera className="h-6 w-6 text-white" />
                </div>
                <input ref={communityPhotoRef} type="file" accept="image/*" className="hidden" onChange={handleCommunityPhotoUpload} />
              </div>
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
                <Button variant="outline" className="w-full text-sm" size="sm" onClick={() => setSettingsOpen(true)}>
                  <Settings className="h-3.5 w-3.5 mr-1.5" />
                  Settings
                </Button>
              </CardContent>
            </Card>

            {/* Community Members */}
            <CommunityMembersList program={program} />
          </div>
        </div>
      </div>
      
      {/* Settings Dialog */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Community Settings</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Community Name</Label>
              <Input value={communityName} onChange={e => setCommunityName(e.target.value)} />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={communityDesc} onChange={e => setCommunityDesc(e.target.value)} rows={3} />
            </div>
            <div>
              <Label>Community Photo</Label>
              <div 
                className="mt-2 border-2 border-dashed border-border rounded-lg h-32 flex items-center justify-center cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => communityPhotoRef.current?.click()}
              >
                {communityPhoto ? (
                  <img src={communityPhoto} alt="" className="h-full w-full object-cover rounded-lg" />
                ) : (
                  <div className="text-center text-muted-foreground">
                    <Camera className="h-6 w-6 mx-auto mb-1" />
                    <p className="text-xs">Upload cover image</p>
                    <p className="text-xs opacity-50">1460 x 752 px</p>
                  </div>
                )}
              </div>
            </div>
            <div>
              <Label>Privacy</Label>
              <Select defaultValue="public">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">Public</SelectItem>
                  <SelectItem value="private">Private</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full" onClick={() => { setSettingsOpen(false); toast({ title: 'Settings saved' }) }}>
              Save Settings
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="pb-20 md:pb-0" />
    </div>
  )
}
