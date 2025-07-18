import { useState, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import EmojiPicker from 'emoji-picker-react'
import { ImagePlus, Send, Loader2, Mic, MicOff, Smile, Video, VideoOff } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

interface EnhancedCreatePostProps {
  onPostCreated?: () => void
  channelId?: string | null
}

export const EnhancedCreatePost = ({ onPostCreated, channelId }: EnhancedCreatePostProps) => {
  const { user } = useAuth()
  const { toast } = useToast()
  const [content, setContent] = useState('')
  const [image, setImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [video, setVideo] = useState<File | null>(null)
  const [videoPreview, setVideoPreview] = useState<string | null>(null)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const [isVideoRecording, setIsVideoRecording] = useState(false)
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setImage(file)
      const reader = new FileReader()
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setVideo(file)
      const reader = new FileReader()
      reader.onload = (e) => {
        setVideoPreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const startAudioRecording = async () => {
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
      console.error('Error starting audio recording:', error)
      toast({
        title: "Error",
        description: "Could not access microphone",
        variant: "destructive"
      })
    }
  }

  const stopAudioRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop()
      setIsRecording(false)
    }
  }

  const startVideoRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true, 
        audio: true 
      })
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        streamRef.current = stream
      }

      const recorder = new MediaRecorder(stream)
      const chunks: BlobPart[] = []

      recorder.ondataavailable = (e) => chunks.push(e.data)
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' })
        const file = new File([blob], 'recorded-video.webm', { type: 'video/webm' })
        setVideo(file)
        
        const reader = new FileReader()
        reader.onload = (e) => {
          setVideoPreview(e.target?.result as string)
        }
        reader.readAsDataURL(file)
        
        stream.getTracks().forEach(track => track.stop())
        if (videoRef.current) {
          videoRef.current.srcObject = null
        }
      }

      setMediaRecorder(recorder)
      recorder.start()
      setIsVideoRecording(true)
    } catch (error) {
      console.error('Error starting video recording:', error)
      toast({
        title: "Error",
        description: "Could not access camera",
        variant: "destructive"
      })
    }
  }

  const stopVideoRecording = () => {
    if (mediaRecorder && isVideoRecording) {
      mediaRecorder.stop()
      setIsVideoRecording(false)
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!content.trim() && !image && !video && !audioBlob) {
      toast({
        title: "Error",
        description: "Please add some content, image, video, or audio to share",
        variant: "destructive"
      })
      return
    }

    setIsSubmitting(true)
    
    try {
      let imageUrl = null
      let videoUrl = null
      let audioUrl = null
      
      if (image) {
        imageUrl = await uploadFile(image, 'community-images')
        if (!imageUrl) {
          toast({
            title: "Error",
            description: "Failed to upload image. Please try again.",
            variant: "destructive"
          })
          return
        }
      }

      if (video) {
        videoUrl = await uploadFile(video, 'course-videos')
        if (!videoUrl) {
          toast({
            title: "Error",
            description: "Failed to upload video. Please try again.",
            variant: "destructive"
          })
          return
        }
      }

      if (audioBlob) {
        const audioFile = new File([audioBlob], 'audio.webm', { type: 'audio/webm' })
        audioUrl = await uploadFile(audioFile, 'message-attachments')
        if (!audioUrl) {
          toast({
            title: "Error",
            description: "Failed to upload audio. Please try again.",
            variant: "destructive"
          })
          return
        }
      }

      const { error } = await supabase
        .from('community_posts')
        .insert({
          user_id: user?.id,
          content: content.trim(),
          image_url: imageUrl,
          video_url: videoUrl,
          audio_url: audioUrl,
          channel_id: channelId
        })

      if (error) {
        throw error
      }

      toast({
        title: "Success",
        description: "Your post has been shared!"
      })

      // Reset form
      setContent('')
      setImage(null)
      setImagePreview(null)
      setVideo(null)
      setVideoPreview(null)
      setAudioBlob(null)
      
      // Notify parent component
      onPostCreated?.()
      
    } catch (error) {
      console.error('Error creating post:', error)
      toast({
        title: "Error",
        description: "Failed to create post. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const onEmojiClick = (emojiData: any) => {
    setContent(prev => prev + emojiData.emoji)
    setShowEmojiPicker(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Textarea
        placeholder="What's on your mind?"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={3}
        className="resize-none text-base min-h-[100px]"
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
              setImage(null)
              setImagePreview(null)
            }}
          >
            Remove
          </Button>
        </div>
      )}

      {videoPreview && (
        <div className="relative">
          <video
            src={videoPreview}
            controls
            className="max-h-48 rounded-lg w-full"
          />
          <Button
            type="button"
            variant="destructive"
            size="sm"
            className="absolute top-2 right-2"
            onClick={() => {
              setVideo(null)
              setVideoPreview(null)
            }}
          >
            Remove
          </Button>
        </div>
      )}

      {isVideoRecording && (
        <div className="relative">
          <video
            ref={videoRef}
            autoPlay
            muted
            className="max-h-48 rounded-lg w-full"
          />
          <div className="absolute top-2 left-2 bg-red-500 text-white px-2 py-1 rounded text-xs">
            Recording...
          </div>
        </div>
      )}

      {audioBlob && (
        <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
          <Mic className="h-4 w-4" />
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
      
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Input
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            className="hidden"
            id="image-upload"
          />
          <label htmlFor="image-upload">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="cursor-pointer gap-1 sm:gap-2 min-h-[40px] px-2 sm:px-3"
              asChild
            >
              <span>
                <ImagePlus className="h-4 w-4" />
                <span className="hidden sm:inline">Photo</span>
              </span>
            </Button>
          </label>

          <Input
            type="file"
            accept="video/*"
            onChange={handleVideoChange}
            className="hidden"
            id="video-upload"
          />
          <label htmlFor="video-upload">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="cursor-pointer gap-1 sm:gap-2 min-h-[40px] px-2 sm:px-3"
              asChild
            >
              <span>
                <Video className="h-4 w-4" />
                <span className="hidden sm:inline">Video</span>
              </span>
            </Button>
          </label>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={isVideoRecording ? stopVideoRecording : startVideoRecording}
            className={`gap-1 sm:gap-2 min-h-[40px] px-2 sm:px-3 ${isVideoRecording ? 'bg-red-100 text-red-600' : ''}`}
          >
            {isVideoRecording ? (
              <VideoOff className="h-4 w-4" />
            ) : (
              <Video className="h-4 w-4" />
            )}
            <span className="hidden sm:inline">{isVideoRecording ? 'Stop' : 'Record'}</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onMouseDown={startAudioRecording}
            onMouseUp={stopAudioRecording}
            onMouseLeave={stopAudioRecording}
            className={`gap-1 sm:gap-2 min-h-[40px] px-2 sm:px-3 ${isRecording ? 'bg-red-100 text-red-600' : ''}`}
          >
            {isRecording ? (
              <MicOff className="h-4 w-4" />
            ) : (
              <Mic className="h-4 w-4" />
            )}
            <span className="hidden sm:inline">{isRecording ? 'Recording...' : 'Audio'}</span>
          </Button>

          <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1 sm:gap-2 min-h-[40px] px-2 sm:px-3"
              >
                <Smile className="h-4 w-4" />
                <span className="hidden sm:inline">Emoji</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <EmojiPicker onEmojiClick={onEmojiClick} />
            </PopoverContent>
          </Popover>
        </div>
        
        <Button
          type="submit"
          disabled={isSubmitting || (!content.trim() && !image && !video && !audioBlob)}
          className="gap-2 min-h-[40px] px-4 sm:px-6"
        >
          {isSubmitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          <span className="hidden sm:inline">Share</span>
          <span className="sm:hidden">Post</span>
        </Button>
      </div>
    </form>
  )
}