import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/integrations/supabase/client'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card } from "@/components/ui/card"
import { useToast } from '@/hooks/use-toast'
import { Send, Hash, Lock, Users, Edit, Reply, Trash2, Settings, MoreVertical } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"

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
  
  // Edit Group states
  const [editGroupOpen, setEditGroupOpen] = useState(false)
  const [editGroupName, setEditGroupName] = useState('')
  const [editGroupDescription, setEditGroupDescription] = useState('')
  const [editGroupPrivate, setEditGroupPrivate] = useState(false)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (groupId) {
      fetchGroup()
      fetchMessages()
      const cleanup = subscribeToMessages()
      
      // Return cleanup function
      return cleanup
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

      if (error) throw error
      
      // Fetch profile data for all unique users
      const userIds = [...new Set(data?.map(msg => msg.user_id) || [])]
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name, first_name, avatar_url')
        .in('user_id', userIds)
      
      // Map profiles to messages
      const messagesWithProfiles = data?.map(msg => ({
        ...msg,
        profiles: profiles?.find(p => p.user_id === msg.user_id) || null
      })) || []
      
      setMessages(messagesWithProfiles)
    } catch (error) {
      console.error('Error fetching messages:', error)
    } finally {
      setLoading(false)
    }
  }

  const subscribeToMessages = () => {
    if (!groupId) return

    const channel = supabase.channel(`group_${groupId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'group_messages',
          filter: `group_id=eq.${groupId}`
        },
        async (payload) => {
          const newMessage = payload.new as Message
          // Fetch the message with profile data
          const messageWithProfile = await fetchMessageWithProfile(newMessage.id)
          if (messageWithProfile) {
            setMessages(prev => [...prev, messageWithProfile])
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'group_messages',
          filter: `group_id=eq.${groupId}`
        },
        async (payload) => {
          const updatedMessage = payload.new as Message
          const messageWithProfile = await fetchMessageWithProfile(updatedMessage.id)
          if (messageWithProfile) {
            setMessages(prev => prev.map(msg => 
              msg.id === updatedMessage.id ? messageWithProfile : msg
            ))
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'group_messages',
          filter: `group_id=eq.${groupId}`
        },
        (payload) => {
          const deletedMessage = payload.old as Message
          setMessages(prev => prev.filter(msg => msg.id !== deletedMessage.id))
        }
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }

  const fetchMessageWithProfile = async (messageId: string): Promise<Message | null> => {
    try {
      const { data: message, error } = await supabase
        .from('group_messages')
        .select('*')
        .eq('id', messageId)
        .single()

      if (error) throw error
      
      // Fetch profile data for the message user
      const { data: profile } = await supabase
        .from('profiles')
        .select('user_id, display_name, first_name, avatar_url')
        .eq('user_id', message.user_id)
        .single()
      
      return {
        ...message,
        profiles: profile || null
      } as Message
    } catch (error) {
      console.error('Error fetching message with profile:', error)
      return null
    }
  }

  const sendMessage = async () => {
    if (!newMessage.trim() || !groupId || !user) return

    setSending(true)
    try {
      const { error } = await supabase
        .from('group_messages')
        .insert({
          content: newMessage.trim(),
          group_id: groupId,
          user_id: user.id,
          reply_to: replyTo?.id || null
        })

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

  // Edit Group functions
  const canEditGroup = () => {
    return group && (group.created_by === user?.id)
  }

  const startEditGroup = () => {
    if (!group) return
    setEditGroupName(group.name)
    setEditGroupDescription(group.description || '')
    setEditGroupPrivate(group.is_private)
    setEditGroupOpen(true)
  }

  const updateGroup = async () => {
    if (!group || !editGroupName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a group name",
        variant: "destructive"
      })
      return
    }

    try {
      const { error } = await supabase
        .from('community_groups')
        .update({
          name: editGroupName.trim(),
          description: editGroupDescription.trim() || null,
          is_private: editGroupPrivate
        })
        .eq('id', group.id)

      if (error) throw error

      toast({
        title: "Success",
        description: `Group "${editGroupName}" updated successfully!`,
      })

      // Update local group state
      setGroup({
        ...group,
        name: editGroupName.trim(),
        description: editGroupDescription.trim() || null,
        is_private: editGroupPrivate
      })

      setEditGroupOpen(false)
    } catch (error) {
      console.error('Error updating group:', error)
      toast({
        title: "Error",
        description: "Failed to update group",
        variant: "destructive"
      })
    }
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
    <div className="flex-1 flex flex-col min-h-0 relative">
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
              {canEditGroup() && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={startEditGroup}
                  className="gap-1 sm:gap-2 text-xs sm:text-sm hover:bg-muted"
                >
                  <Settings className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">Edit Group</span>
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Messages */}
      <ScrollArea className="flex-1 p-2 sm:p-4 min-h-0 pb-24">
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
                        <Button size="sm" variant="outline" onClick={() => setEditingMessage(null)}>Cancel</Button>
                      </div>
                    ) : (
                      <>
                        <Card className={`p-2 sm:p-3 ${isOwn ? 'bg-primary text-primary-foreground ml-auto' : 'bg-muted'}`}>
                          {message.reply_to && (
                            <div className="text-xs opacity-75 mb-1 pb-1 border-b border-current/20">
                              Replying to message
                            </div>
                          )}
                          <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                        </Card>
                        
                        {/* Message actions */}
                        {isOwn && (
                          <>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 absolute -top-2 right-0"
                                >
                                  <MoreVertical className="h-3 w-3" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => setReplyTo(message)}>
                                  <Reply className="h-3 w-3 mr-2" />
                                  Reply
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => startEdit(message)}>
                                  <Edit className="h-3 w-3 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => deleteMessage(message.id)}
                                  className="text-destructive"
                                >
                                  <Trash2 className="h-3 w-3 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </>
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

      {/* Message Input - Fixed at bottom of screen */}
      <div className="fixed bottom-0 left-0 right-0 p-2 sm:p-4 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-10">
        {replyTo && (
          <div className="mb-2 p-2 bg-muted rounded text-sm max-w-4xl mx-auto">
            <div className="flex items-center justify-between">
              <span className="truncate">Replying to {getDisplayName(replyTo)}</span>
              <Button variant="ghost" size="sm" onClick={() => setReplyTo(null)}>
                ×
              </Button>
            </div>
            <p className="truncate opacity-75 text-xs">{replyTo.content}</p>
          </div>
        )}
        
        <div className="flex gap-2 max-w-4xl mx-auto">
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

      {/* Edit Group Dialog */}
      <Dialog open={editGroupOpen} onOpenChange={setEditGroupOpen}>
        <DialogContent className="w-[95vw] max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Group</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-group-name">Group Name</Label>
              <Input
                id="edit-group-name"
                value={editGroupName}
                onChange={(e) => setEditGroupName(e.target.value)}
                placeholder="Enter group name"
              />
            </div>
            
            <div>
              <Label htmlFor="edit-group-description">Description (Optional)</Label>
              <Textarea
                id="edit-group-description"
                value={editGroupDescription}
                onChange={(e) => setEditGroupDescription(e.target.value)}
                placeholder="Enter group description"
                rows={3}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="edit-private-group"
                checked={editGroupPrivate}
                onCheckedChange={setEditGroupPrivate}
              />
              <Label htmlFor="edit-private-group">Private Group</Label>
            </div>

            <div className="flex gap-2 pt-2">
              <Button onClick={updateGroup} className="flex-1">
                Update Group
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setEditGroupOpen(false)}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}