import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/integrations/supabase/client'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useToast } from '@/hooks/use-toast'
import { Send, AtSign } from 'lucide-react'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

interface Profile {
  user_id: string
  display_name: string | null
  first_name: string | null
  avatar_url: string | null
}

interface CommentWithMentionsProps {
  postId: string
  channelId?: string | null
  onCommentAdded: () => void
  placeholder?: string
}

export const CommentWithMentions = ({ 
  postId, 
  channelId, 
  onCommentAdded, 
  placeholder = "Write a comment..." 
}: CommentWithMentionsProps) => {
  const { user } = useAuth()
  const { toast } = useToast()
  const [comment, setComment] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [members, setMembers] = useState<Profile[]>([])
  const [showMentions, setShowMentions] = useState(false)
  const [mentionQuery, setMentionQuery] = useState('')
  const [cursorPosition, setCursorPosition] = useState(0)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    fetchMembers()
  }, [])

  const fetchMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, display_name, first_name, avatar_url')
        .not('user_id', 'eq', user?.id) // Exclude current user

      if (error) throw error
      setMembers(data || [])
    } catch (error) {
      console.error('Error fetching members:', error)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    const position = e.target.selectionStart
    
    setComment(value)
    setCursorPosition(position)

    // Check if user is typing @ mention
    const beforeCursor = value.substring(0, position)
    const mentionMatch = beforeCursor.match(/@(\w*)$/)
    
    if (mentionMatch) {
      setMentionQuery(mentionMatch[1])
      setShowMentions(true)
    } else {
      setShowMentions(false)
      setMentionQuery('')
    }
  }

  const insertMention = (member: Profile) => {
    const memberName = member.display_name || member.first_name || 'Unknown'
    const beforeCursor = comment.substring(0, cursorPosition)
    const afterCursor = comment.substring(cursorPosition)
    
    // Replace the @ and query with the mention
    const beforeMention = beforeCursor.replace(/@\w*$/, '')
    const newComment = `${beforeMention}@${memberName} ${afterCursor}`
    
    setComment(newComment)
    setShowMentions(false)
    setMentionQuery('')
    
    // Focus back to textarea
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus()
        const newPosition = beforeMention.length + memberName.length + 2
        textareaRef.current.setSelectionRange(newPosition, newPosition)
      }
    }, 0)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!comment.trim() || !user) return

    setIsSubmitting(true)

    try {
      const { error } = await supabase
        .from('community_posts')
        .insert({
          parent_id: postId,
          user_id: user.id,
          content: comment.trim(),
          channel_id: channelId
        })

      if (error) throw error

      setComment('')
      onCommentAdded()
      
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
      setIsSubmitting(false)
    }
  }

  const filteredMembers = members.filter(member => {
    const name = member.display_name || member.first_name || ''
    return name.toLowerCase().includes(mentionQuery.toLowerCase())
  })

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="flex gap-3">
        <Avatar className="h-8 w-8 flex-shrink-0">
          <AvatarImage src={user?.user_metadata?.avatar_url || ''} />
          <AvatarFallback>
            {user?.user_metadata?.first_name?.charAt(0)?.toUpperCase() || 'U'}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 relative">
          <Popover open={showMentions} onOpenChange={setShowMentions}>
            <PopoverTrigger asChild>
              <Textarea
                ref={textareaRef}
                placeholder={placeholder}
                value={comment}
                onChange={handleInputChange}
                rows={2}
                className="resize-none text-sm"
              />
            </PopoverTrigger>
            {showMentions && filteredMembers.length > 0 && (
              <PopoverContent className="w-64 p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search members..." value={mentionQuery} />
                  <CommandList>
                    <CommandEmpty>No members found.</CommandEmpty>
                    <CommandGroup>
                      {filteredMembers.slice(0, 5).map((member) => (
                        <CommandItem
                          key={member.user_id}
                          onSelect={() => insertMention(member)}
                          className="flex items-center gap-2"
                        >
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={member.avatar_url || ''} />
                            <AvatarFallback>
                              {(member.display_name || member.first_name || 'U').charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col">
                            <span className="text-sm font-medium">
                              {member.display_name || member.first_name || 'Unknown'}
                            </span>
                          </div>
                          <AtSign className="h-3 w-3 text-muted-foreground ml-auto" />
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            )}
          </Popover>
        </div>
      </div>
      <div className="flex justify-end">
        <Button
          type="submit"
          size="sm"
          disabled={isSubmitting || !comment.trim()}
        >
          <Send className="h-4 w-4 mr-1" />
          Comment
        </Button>
      </div>
    </form>
  )
}