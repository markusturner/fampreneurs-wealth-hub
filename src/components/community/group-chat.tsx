import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/integrations/supabase/client'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card } from "@/components/ui/card"
import { useToast } from '@/hooks/use-toast'
import { Send, Hash, Lock, Users, MoreVertical, Reply, Edit, Trash2 } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

interface Message {
  id: string
  content: string
  user_id: string
  created_at: string
  updated_at: string
  message_type: string
  file_url: string | null
  reply_to: string | null
  profiles?: {
    display_name: string | null
    first_name: string | null
    avatar_url: string | null
  }
}

interface Group {
  id: string
  name: string
  description: string | null
  is_private: boolean
  created_by: string
  member_count?: number
}

interface GroupChatProps {
  groupId: string | null
}

export function GroupChat({ groupId }: GroupChatProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [group, setGroup] = useState<Group | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [replyTo, setReplyTo] = useState<Message | null>(null)
  const [editingMessage, setEditingMessage] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (groupId) {
      fetchGroup()
      fetchMessages()
      subscribeToMessages()
    }
  }, [groupId])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const fetchGroup = async () => {
    if (!groupId) return

    try {
      const { data, error } = await supabase
        .from('community_groups')
        .select(`
          *,
          group_memberships(count)
        `)
        .eq('id', groupId)
        .single()

      if (error) throw error
      setGroup(data)
    } catch (error) {
      console.error('Error fetching group:', error)
    }
  }

  const fetchMessages = async () => {
    if (!groupId) return

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('group_messages')
        .select('*')
        .eq('group_id', groupId)
        .order('created_at', { ascending: true })
        .limit(100)

      if (error) throw error
      setMessages((data as any[]) || [])
    } catch (error) {
      console.error('Error fetching messages:', error)
      toast({
        title: "Error",
        description: "Failed to load messages",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const subscribeToMessages = () => {
    if (!groupId) return

    const subscription = supabase
      .channel(`group-messages-${groupId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'group_messages',
          filter: `group_id=eq.${groupId}`
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            // Fetch the new message with profile data
            fetchMessageWithProfile(payload.new.id)
          } else if (payload.eventType === 'UPDATE') {
            setMessages(prev => prev.map(msg => 
              msg.id === payload.new.id ? { ...msg, ...payload.new } : msg
            ))
          } else if (payload.eventType === 'DELETE') {
            setMessages(prev => prev.filter(msg => msg.id !== payload.old.id))
          }
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }

  const fetchMessageWithProfile = async (messageId: string) => {
    try {
      const { data, error } = await supabase
        .from('group_messages')
        .select('*')
        .eq('id', messageId)
        .single()

      if (error) throw error
      if (data) {
        setMessages(prev => [...prev, data as any])
      }
    } catch (error) {
      console.error('Error fetching message with profile:', error)
    }
  }

  const sendMessage = async () => {
    if (!newMessage.trim() || !groupId || !user) return

    setSending(true)
    try {
      const messageData: any = {
        group_id: groupId,
        user_id: user.id,
        content: newMessage.trim(),
        message_type: 'text'
      }

      if (replyTo) {
        messageData.reply_to = replyTo.id
      }

      const { error } = await supabase
        .from('group_messages')
        .insert(messageData)

      if (error) throw error

      setNewMessage('')
      setReplyTo(null)
      inputRef.current?.focus()
    } catch (error) {
      console.error('Error sending message:', error)
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive"
      })
    } finally {
      setSending(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const startEdit = (message: Message) => {
    setEditingMessage(message.id)
    setEditContent(message.content)
  }

  const saveEdit = async () => {
    if (!editingMessage || !editContent.trim()) return

    try {
      const { error } = await supabase
        .from('group_messages')
        .update({ content: editContent.trim() })
        .eq('id', editingMessage)

      if (error) throw error

      setEditingMessage(null)
      setEditContent('')
    } catch (error) {
      console.error('Error updating message:', error)
      toast({
        title: "Error",
        description: "Failed to update message",
        variant: "destructive"
      })
    }
  }

  const deleteMessage = async (messageId: string) => {
    try {
      const { error } = await supabase
        .from('group_messages')
        .delete()
        .eq('id', messageId)

      if (error) throw error
    } catch (error) {
      console.error('Error deleting message:', error)
      toast({
        title: "Error",
        description: "Failed to delete message",
        variant: "destructive"
      })
    }
  }

  const getDisplayName = (message: Message) => {
    return 'Family Member'
  }

  if (!groupId) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <Hash className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-medium">Welcome to Family Community</h3>
          <p className="text-sm text-muted-foreground">Select a group to start chatting</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading messages...</div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Group Header */}
      {group && (
        <div className="p-3 sm:p-4 border-b bg-background flex-shrink-0">
          <div className="flex items-center gap-2">
            {group.is_private ? (
              <Lock className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
            ) : (
              <Hash className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
            )}
            <div className="flex-1 min-w-0">
              <h2 className="font-semibold text-sm sm:text-base truncate">{group.name}</h2>
              {group.description && (
                <p className="text-xs sm:text-sm text-muted-foreground truncate">{group.description}</p>
              )}
            </div>
            <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
              <Button variant="ghost" size="sm" className="gap-1 sm:gap-2 text-xs sm:text-sm">
                <Users className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">{group.member_count || 0}</span>
              </Button>
              <Button variant="ghost" size="sm">
                <MoreVertical className="h-3 w-3 sm:h-4 sm:w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Messages */}
      <ScrollArea className="flex-1 p-2 sm:p-4 min-h-0">
        <div className="space-y-3 sm:space-y-4">
          {messages.map((message, index) => {
            const isOwn = message.user_id === user?.id
            const showAvatar = index === 0 || messages[index - 1].user_id !== message.user_id
            
            return (
              <div key={message.id} className={`flex gap-2 sm:gap-3 ${isOwn ? 'justify-end' : ''}`}>
                {!isOwn && showAvatar && (
                  <Avatar className="h-6 w-6 sm:h-8 sm:w-8 flex-shrink-0">
                    <AvatarImage src={message.profiles?.avatar_url || undefined} />
                    <AvatarFallback className="text-xs">
                      {getDisplayName(message).charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                )}
                {!isOwn && !showAvatar && <div className="w-6 sm:w-8 flex-shrink-0" />}
                
                <div className={`flex-1 max-w-xs sm:max-w-lg ${isOwn ? 'text-right' : ''}`}>
                  {showAvatar && (
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs sm:text-sm font-medium truncate">{getDisplayName(message)}</span>
                      <span className="text-xs text-muted-foreground flex-shrink-0">
                        {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                      </span>
                    </div>
                  )}
                  
                  <div className="group relative">
                    {editingMessage === message.id ? (
                      <div className="flex gap-2">
                        <Input
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && saveEdit()}
                          className="flex-1"
                        />
                        <Button size="sm" onClick={saveEdit}>Save</Button>
                        <Button size="sm" variant="outline" onClick={() => setEditingMessage(null)}>
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <>
                        <Card className={`p-3 ${isOwn ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                          {message.reply_to && (
                            <div className="text-xs opacity-75 border-l-2 pl-2 mb-2">
                              Replying to message...
                            </div>
                          )}
                          <p className="text-sm">{message.content}</p>
                          {message.updated_at !== message.created_at && (
                            <span className="text-xs opacity-75">(edited)</span>
                          )}
                        </Card>
                        
                        {isOwn && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="opacity-0 group-hover:opacity-100 absolute top-0 right-0 h-8 w-8 p-0"
                              >
                                <MoreVertical className="h-3 w-3" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setReplyTo(message)}>
                                <Reply className="h-4 w-4 mr-2" />
                                Reply
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => startEdit(message)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => deleteMessage(message.id)}
                                className="text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Message Input */}
      <div className="p-2 sm:p-4 border-t flex-shrink-0">
        {replyTo && (
          <div className="mb-2 p-2 bg-muted rounded text-sm">
            <div className="flex items-center justify-between">
              <span className="truncate">Replying to {getDisplayName(replyTo)}</span>
              <Button variant="ghost" size="sm" onClick={() => setReplyTo(null)}>
                ×
              </Button>
            </div>
            <p className="truncate opacity-75 text-xs">{replyTo.content}</p>
          </div>
        )}
        
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={`Message #${group?.name}`}
            disabled={sending}
            className="flex-1 text-sm"
          />
          <Button 
            onClick={sendMessage} 
            disabled={!newMessage.trim() || sending}
            size="sm"
            className="flex-shrink-0"
          >
            <Send className="h-3 w-3 sm:h-4 sm:w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}