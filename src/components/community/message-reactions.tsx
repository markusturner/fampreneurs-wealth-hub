import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { ThumbsUp, Heart, Laugh, Angry, Frown, Plus } from 'lucide-react'

interface Reaction {
  id: string
  reaction_type: string
  user_id: string
  user_count: number
}

interface MessageReactionsProps {
  messageId: string
  reactions: Reaction[]
  onReactionUpdate: () => void
}

const reactionEmojis = {
  like: { icon: ThumbsUp, emoji: '👍' },
  love: { icon: Heart, emoji: '❤️' },
  laugh: { icon: Laugh, emoji: '😂' },
  angry: { icon: Angry, emoji: '😠' },
  sad: { icon: Frown, emoji: '😢' }
}

export function MessageReactions({ messageId, reactions, onReactionUpdate }: MessageReactionsProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [showReactionPicker, setShowReactionPicker] = useState(false)

  const addReaction = async (reactionType: string) => {
    if (!user) return

    try {
      const { error } = await supabase
        .from('message_reactions')
        .insert({
          message_id: messageId,
          user_id: user.id,
          reaction_type: reactionType
        })

      if (error) throw error
      onReactionUpdate()
      setShowReactionPicker(false)
    } catch (error) {
      console.error('Error adding reaction:', error)
      toast({
        title: "Error",
        description: "Failed to add reaction",
        variant: "destructive"
      })
    }
  }

  const removeReaction = async (reactionType: string) => {
    if (!user) return

    try {
      const { error } = await supabase
        .from('message_reactions')
        .delete()
        .eq('message_id', messageId)
        .eq('user_id', user.id)
        .eq('reaction_type', reactionType)

      if (error) throw error
      onReactionUpdate()
    } catch (error) {
      console.error('Error removing reaction:', error)
      toast({
        title: "Error",
        description: "Failed to remove reaction",
        variant: "destructive"
      })
    }
  }

  const getUserReaction = (reactionType: string) => {
    return reactions.find(r => r.reaction_type === reactionType && r.user_id === user?.id)
  }

  const getReactionCount = (reactionType: string) => {
    return reactions.find(r => r.reaction_type === reactionType)?.user_count || 0
  }

  return (
    <div className="flex items-center gap-1 mt-1">
      {/* Display existing reactions */}
      {Object.entries(reactionEmojis).map(([type, { emoji }]) => {
        const count = getReactionCount(type)
        const userReacted = !!getUserReaction(type)
        
        if (count === 0) return null
        
        return (
          <Button
            key={type}
            variant={userReacted ? "secondary" : "ghost"}
            size="sm"
            className="h-6 px-2 text-xs gap-1"
            onClick={() => userReacted ? removeReaction(type) : addReaction(type)}
          >
            <span>{emoji}</span>
            <span>{count}</span>
          </Button>
        )
      })}
      
      {/* Add reaction button */}
      <Popover open={showReactionPicker} onOpenChange={setShowReactionPicker}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0 opacity-60 hover:opacity-100">
            <Plus className="h-3 w-3" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2" side="top">
          <div className="flex gap-1">
            {Object.entries(reactionEmojis).map(([type, { emoji }]) => (
              <Button
                key={type}
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-base"
                onClick={() => addReaction(type)}
              >
                {emoji}
              </Button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}