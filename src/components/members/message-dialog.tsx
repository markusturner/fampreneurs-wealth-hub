import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/integrations/supabase/client'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useToast } from '@/hooks/use-toast'
import { Loader2, Send } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface MessageDialogProfile {
  id: string
  user_id: string
  first_name: string | null
  last_name: string | null
  display_name: string | null
  avatar_url: string | null
  family_role: string | null
}

interface Message {
  id: string
  sender_id: string
  recipient_id: string
  content: string
  created_at: string
  read_at: string | null
}

interface MessageDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  recipient: MessageDialogProfile
  onMessageSent: () => void
}

export function MessageDialog({ open, onOpenChange, recipient, onMessageSent }: MessageDialogProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [newMessage, setNewMessage] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const getDisplayName = (member: MessageDialogProfile) => {
    return member.display_name || 
           (member.first_name && member.last_name ? `${member.first_name} ${member.last_name}` : 
           member.first_name || 'Family Member')
  }

  const getInitials = (member: MessageDialogProfile) => {
    if (member.first_name && member.last_name) {
      return `${member.first_name.charAt(0)}${member.last_name.charAt(0)}`
    }
    if (member.display_name) {
      const names = member.display_name.split(' ')
      return names.length > 1 
        ? `${names[0].charAt(0)}${names[names.length - 1].charAt(0)}`
        : names[0].charAt(0)
    }
    return 'U'
  }

  // Fetch conversation history
  const fetchMessages = async () => {
    if (!user?.id || !recipient.user_id) return

    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${user.id},recipient_id.eq.${recipient.user_id}),and(sender_id.eq.${recipient.user_id},recipient_id.eq.${user.id})`)
        .order('created_at', { ascending: true })

      if (error) throw error

      setMessages(data || [])
    } catch (error) {
      console.error('Error fetching messages:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Mark messages as read
  const markMessagesAsRead = async () => {
    if (!user?.id) return

    try {
      await supabase
        .from('messages')
        .update({ read_at: new Date().toISOString() })
        .eq('sender_id', recipient.user_id)
        .eq('recipient_id', user.id)
        .is('read_at', null)
    } catch (error) {
      console.error('Error marking messages as read:', error)
    }
  }

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    if (open) {
      fetchMessages()
      markMessagesAsRead()
    }
  }, [open, user?.id, recipient.user_id])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Real-time subscription for new messages
  useEffect(() => {
    if (!open || !user?.id) return

    const channel = supabase
      .channel('messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `or(and(sender_id.eq.${user.id},recipient_id.eq.${recipient.user_id}),and(sender_id.eq.${recipient.user_id},recipient_id.eq.${user.id}))`
        },
        (payload) => {
          setMessages(prev => [...prev, payload.new as Message])
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [open, user?.id, recipient.user_id])
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!newMessage.trim()) return

    setIsSubmitting(true)

    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          sender_id: user?.id,
          recipient_id: recipient.user_id,
          content: newMessage.trim()
        })

      if (error) throw error

      setNewMessage('')
      
    } catch (error) {
      console.error('Error sending message:', error)
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e as any)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] mx-4 h-[600px] flex flex-col p-0">
        <DialogHeader className="p-6 pb-4 border-b">
          <DialogTitle className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={recipient.avatar_url || "/placeholder.svg"} />
              <AvatarFallback className="bg-secondary text-secondary-foreground">
                {getInitials(recipient)}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="font-semibold">{getDisplayName(recipient)}</div>
              {recipient.family_role && (
                <div className="text-sm text-muted-foreground">{recipient.family_role}</div>
              )}
            </div>
          </DialogTitle>
        </DialogHeader>

        {/* Messages Area */}
        <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <div className="text-center">
                <div className="text-4xl mb-2">👋</div>
                <p>Start a conversation with {getDisplayName(recipient)}</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message, index) => {
                const isFromUser = message.sender_id === user?.id
                const showAvatar = index === 0 || messages[index - 1].sender_id !== message.sender_id
                
                return (
                  <div
                    key={message.id}
                    className={`flex gap-2 ${isFromUser ? 'flex-row-reverse' : 'flex-row'} animate-fade-in`}
                  >
                    {showAvatar ? (
                      <Avatar className="h-8 w-8">
                        <AvatarImage 
                          src={isFromUser ? user?.user_metadata?.avatar_url : recipient.avatar_url || "/placeholder.svg"} 
                        />
                        <AvatarFallback className="text-xs">
                          {isFromUser ? 'You' : getInitials(recipient)}
                        </AvatarFallback>
                      </Avatar>
                    ) : (
                      <div className="w-8" />
                    )}
                    
                    <div className={`max-w-[70%] ${isFromUser ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                      <div
                        className={`px-3 py-2 rounded-lg text-sm ${
                          isFromUser
                            ? 'bg-primary text-primary-foreground ml-auto'
                            : 'bg-muted text-foreground'
                        }`}
                      >
                        {message.content}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                        {!message.read_at && !isFromUser && (
                          <span className="ml-1 text-primary">• New</span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>

        {/* Message Input */}
        <form onSubmit={handleSubmit} className="p-4 border-t">
          <div className="flex gap-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={`Message ${getDisplayName(recipient)}...`}
              className="flex-1"
              disabled={isSubmitting}
            />
            <Button 
              type="submit" 
              size="sm"
              disabled={isSubmitting || !newMessage.trim()}
              className="gap-2"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}