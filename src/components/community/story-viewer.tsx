import { useState, useEffect } from 'react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface Story {
  id: string
  user_id: string
  content_type: 'image' | 'video'
  content_url: string
  caption: string | null
  created_at: string
  profiles: {
    display_name: string | null
    first_name: string | null
    avatar_url: string | null
  } | null
}

interface StoryViewerProps {
  stories: Story[]
  initialStoryIndex: number
  open: boolean
  onOpenChange: (open: boolean) => void
  onViewStory?: (storyId: string) => void
}

export function StoryViewer({ 
  stories, 
  initialStoryIndex, 
  open, 
  onOpenChange,
  onViewStory 
}: StoryViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialStoryIndex)
  const [progress, setProgress] = useState(0)

  const currentStory = stories[currentIndex]

  useEffect(() => {
    if (!open || !currentStory) return

    // Mark story as viewed
    onViewStory?.(currentStory.id)

    // Auto-advance timer for images (5 seconds) or videos (duration)
    const duration = currentStory.content_type === 'image' ? 5000 : 15000
    const interval = 50 // Update progress every 50ms
    let elapsed = 0

    const timer = setInterval(() => {
      elapsed += interval
      const newProgress = (elapsed / duration) * 100
      setProgress(newProgress)

      if (newProgress >= 100) {
        if (currentIndex < stories.length - 1) {
          setCurrentIndex(currentIndex + 1)
          setProgress(0)
        } else {
          onOpenChange(false)
        }
      }
    }, interval)

    return () => clearInterval(timer)
  }, [currentIndex, currentStory, open, onOpenChange, onViewStory, stories.length])

  useEffect(() => {
    setCurrentIndex(initialStoryIndex)
    setProgress(0)
  }, [initialStoryIndex])

  if (!currentStory) return null

  const nextStory = () => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex(currentIndex + 1)
      setProgress(0)
    } else {
      onOpenChange(false)
    }
  }

  const prevStory = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
      setProgress(0)
    }
  }

  const getDisplayName = (profile: Story['profiles']) => {
    if (profile?.display_name) return profile.display_name
    if (profile?.first_name) return profile.first_name
    return 'Anonymous'
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 bg-black border-none">
        <div className="relative h-screen max-h-[90vh] flex flex-col">
          {/* Progress bar */}
          <div className="absolute top-0 left-0 right-0 z-10 flex gap-1 p-2">
            {stories.map((_, index) => (
              <div key={index} className="flex-1 h-0.5 bg-white/30 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white transition-all duration-50 ease-linear"
                  style={{
                    width: index < currentIndex ? '100%' : index === currentIndex ? `${progress}%` : '0%'
                  }}
                />
              </div>
            ))}
          </div>

          {/* Header */}
          <div className="absolute top-6 left-0 right-0 z-10 flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <Avatar className="w-8 h-8 border-2 border-white">
                <AvatarImage src={currentStory.profiles?.avatar_url || undefined} />
                <AvatarFallback className="text-xs">
                  {getDisplayName(currentStory.profiles)?.[0]}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-white text-sm font-medium">
                  {getDisplayName(currentStory.profiles)}
                </p>
                <p className="text-white/80 text-xs">
                  {formatDistanceToNow(new Date(currentStory.created_at), { addSuffix: true })}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-white hover:bg-white/20"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Content */}
          <div className="flex-1 relative flex items-center justify-center">
            {currentStory.content_type === 'image' ? (
              <img
                src={currentStory.content_url}
                alt="Story"
                className="max-w-full max-h-full object-contain"
              />
            ) : (
              <video
                src={currentStory.content_url}
                autoPlay
                muted
                className="max-w-full max-h-full object-contain"
                onEnded={nextStory}
              />
            )}

            {/* Navigation areas */}
            <div className="absolute inset-0 flex">
              <div className="flex-1 cursor-pointer" onClick={prevStory} />
              <div className="flex-1 cursor-pointer" onClick={nextStory} />
            </div>

            {/* Navigation buttons */}
            {currentIndex > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={prevStory}
                className="absolute left-2 top-1/2 -translate-y-1/2 text-white hover:bg-white/20"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            )}
            {currentIndex < stories.length - 1 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={nextStory}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-white hover:bg-white/20"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Caption */}
          {currentStory.caption && (
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4">
              <p className="text-white text-sm">{currentStory.caption}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}