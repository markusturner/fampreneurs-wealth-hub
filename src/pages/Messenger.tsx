import { useState, useEffect, useRef } from 'react'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/integrations/supabase/client'
import { Search, Send, MessageCircle } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface Profile {
  user_id: string
  display_name: string | null
  avatar_url: string | null
}

interface DirectMessage {
  id: string
  sender_id: string
  receiver_id: string
  content: string
  is_read: boolean
  created_at: string
}

interface ConversationSummary {
  user_id: string
  display_name: string | null
  avatar_url: string | null
  last_message: string
  last_message_at: string
  unread_count: number
}

export default function Messenger() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [conversations, setConversations] = useState<ConversationSummary[]>([])
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [messages, setMessages] = useState<DirectMessage[]>([])
  const [message, setMessage] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Fetch all profiles and messages to build conversation list
  useEffect(() => {
    if (!user) return
    const init = async () => {
      try {
        // Fetch profiles
        const { data: profileData } = await supabase
          .from('profiles')
          .select('user_id, display_name, avatar_url')
          .neq('user_id', user.id)
          .order('display_name')
        
        setProfiles(profileData || [])

        // Fetch all DMs involving current user
        const { data: dmData } = await supabase
          .from('direct_messages')
          .select('*')
          .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
          .order('created_at', { ascending: false })

        // Build conversation summaries
        const convMap = new Map<string, { lastMsg: DirectMessage; unread: number }>()
        for (const dm of dmData || []) {
          const otherId = dm.sender_id === user.id ? dm.receiver_id : dm.sender_id
          if (!convMap.has(otherId)) {
            convMap.set(otherId, { lastMsg: dm, unread: 0 })
          }
          if (dm.receiver_id === user.id && !dm.is_read) {
            const entry = convMap.get(otherId)!
            entry.unread++
          }
        }

        const profileMap = new Map((profileData || []).map(p => [p.user_id, p]))
        const convList: ConversationSummary[] = []
        convMap.forEach((val, otherId) => {
          const p = profileMap.get(otherId)
          convList.push({
            user_id: otherId,
            display_name: p?.display_name || 'Member',
            avatar_url: p?.avatar_url || null,
            last_message: val.lastMsg.content,
            last_message_at: val.lastMsg.created_at,
            unread_count: val.unread,
          })
        })

        // Add profiles that don't have conversations yet
        for (const p of profileData || []) {
          if (!convMap.has(p.user_id)) {
            convList.push({
              user_id: p.user_id,
              display_name: p.display_name || 'Member',
              avatar_url: p.avatar_url,
              last_message: '',
              last_message_at: '',
              unread_count: 0,
            })
          }
        }

        // Sort: conversations with messages first (by date), then others alphabetically
        convList.sort((a, b) => {
          if (a.last_message_at && b.last_message_at) return new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()
          if (a.last_message_at) return -1
          if (b.last_message_at) return 1
          return (a.display_name || '').localeCompare(b.display_name || '')
        })

        setConversations(convList)
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [user])

  // Fetch messages for selected conversation
  useEffect(() => {
    if (!user || !selectedUserId) return
    const fetchMessages = async () => {
      const { data } = await supabase
        .from('direct_messages')
        .select('*')
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${selectedUserId}),and(sender_id.eq.${selectedUserId},receiver_id.eq.${user.id})`)
        .order('created_at', { ascending: true })
      
      setMessages(data || [])

      // Mark received messages as read
      await supabase
        .from('direct_messages')
        .update({ is_read: true })
        .eq('sender_id', selectedUserId)
        .eq('receiver_id', user.id)
        .eq('is_read', false)

      // Update unread count in conversations list
      setConversations(prev => prev.map(c => 
        c.user_id === selectedUserId ? { ...c, unread_count: 0 } : c
      ))
    }
    fetchMessages()

    // Subscribe to new messages in this conversation
    const channel = supabase
      .channel(`dm-${user.id}-${selectedUserId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'direct_messages',
        filter: `receiver_id=eq.${user.id}`,
      }, (payload) => {
        const newMsg = payload.new as DirectMessage
        if (newMsg.sender_id === selectedUserId) {
          setMessages(prev => [...prev, newMsg])
          // Mark as read immediately
          supabase.from('direct_messages').update({ is_read: true }).eq('id', newMsg.id)
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [user, selectedUserId])

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const getInitials = (name: string | null) => {
    if (!name) return 'M'
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  const selectedConvo = conversations.find(c => c.user_id === selectedUserId)

  const filtered = conversations.filter(c =>
    !searchQuery || c.display_name?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleSend = async () => {
    if (!message.trim() || !selectedUserId || !user || sending) return
    setSending(true)
    try {
      const { data, error } = await supabase
        .from('direct_messages')
        .insert({
          sender_id: user.id,
          receiver_id: selectedUserId,
          content: message.trim(),
        })
        .select()
        .single()

      if (error) throw error

      setMessages(prev => [...prev, data])
      
      // Update conversation list
      setConversations(prev => {
        const updated = prev.map(c => 
          c.user_id === selectedUserId 
            ? { ...c, last_message: message.trim(), last_message_at: new Date().toISOString() }
            : c
        )
        // Re-sort
        updated.sort((a, b) => {
          if (a.last_message_at && b.last_message_at) return new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()
          if (a.last_message_at) return -1
          if (b.last_message_at) return 1
          return (a.display_name || '').localeCompare(b.display_name || '')
        })
        return updated
      })
      
      setMessage('')
    } catch (error) {
      console.error('Error sending message:', error)
      toast({ title: 'Error', description: 'Failed to send message', variant: 'destructive' })
    } finally {
      setSending(false)
    }
  }

  const formatTime = (dateStr: string) => {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - d.getTime()
    if (diff < 86400000) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    if (diff < 604800000) return d.toLocaleDateString([], { weekday: 'short' })
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
  }

  return (
    <div className="flex flex-col max-w-5xl mx-auto px-3 sm:px-4 py-3">
      <div className="mb-3 flex-shrink-0">
        <h1 className="text-xl sm:text-2xl font-bold">Messenger</h1>
        <p className="text-muted-foreground text-sm">View and send messages</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[200px]">
        {/* Conversations List - hidden on mobile when a conversation is selected */}
        <Card className={`md:col-span-1 flex flex-col ${selectedUserId ? 'hidden md:flex' : 'flex'}`}>
          <div className="p-3 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search conversations"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
              {loading ? (
                <div className="p-4 text-center text-muted-foreground text-sm">Loading...</div>
              ) : filtered.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground text-sm">No conversations</div>
              ) : (
                filtered.map(c => (
                  <button
                    key={c.user_id}
                    onClick={() => setSelectedUserId(c.user_id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors hover:bg-muted/50 ${
                      selectedUserId === c.user_id ? 'bg-accent/10' : ''
                    }`}
                  >
                    <Avatar className="h-10 w-10">
                      {c.avatar_url && <AvatarImage src={c.avatar_url} />}
                      <AvatarFallback>{getInitials(c.display_name)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-sm truncate">{c.display_name}</p>
                        {c.last_message_at && (
                          <span className="text-[10px] text-muted-foreground flex-shrink-0">{formatTime(c.last_message_at)}</span>
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-muted-foreground truncate">{c.last_message || 'No messages yet'}</p>
                        {c.unread_count > 0 && (
                          <span className="ml-1 flex-shrink-0 h-5 w-5 rounded-full text-[10px] font-bold flex items-center justify-center text-white" style={{ backgroundColor: '#ffb500' }}>
                            {c.unread_count}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </ScrollArea>
        </Card>

        {/* Chat Area - full width on mobile when conversation selected */}
        <Card className={`md:col-span-2 flex flex-col ${selectedUserId ? 'flex' : 'hidden md:flex'}`}>
          {selectedConvo ? (
            <>
              <div className="flex items-center gap-3 p-4 border-b">
                <Button variant="ghost" size="icon" className="h-8 w-8 md:hidden flex-shrink-0" onClick={() => setSelectedUserId(null)}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                </Button>
                <Avatar className="h-10 w-10">
                  {selectedConvo.avatar_url && <AvatarImage src={selectedConvo.avatar_url} />}
                  <AvatarFallback>{getInitials(selectedConvo.display_name)}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold text-sm">{selectedConvo.display_name}</p>
                  <p className="text-xs text-muted-foreground">Active</p>
                </div>
              </div>
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-3">
                  {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full py-12 text-center">
                      <MessageCircle className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                      <p className="text-muted-foreground text-sm">No messages yet</p>
                      <p className="text-muted-foreground text-xs mt-1">Send a message to start the conversation</p>
                    </div>
                  ) : (
                    messages.map(msg => (
                      <div key={msg.id} className={`flex ${msg.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${
                          msg.sender_id === user?.id
                            ? 'bg-[hsl(43,100%,50%)] text-[hsl(270,80%,15%)] font-medium'
                            : 'bg-accent text-accent-foreground'
                        }`}>
                          <p>{msg.content}</p>
                          <p className={`text-[10px] mt-1 ${msg.sender_id === user?.id ? 'text-[hsl(270,80%,15%)]/60' : 'text-muted-foreground'}`}>
                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>
              <div className="flex items-center gap-2 p-3 border-t">
                <Input
                  placeholder={`Message ${selectedConvo.display_name?.split(' ')[0] || 'member'}...`}
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSend()}
                  disabled={sending}
                />
                <Button size="icon" onClick={handleSend} disabled={!message.trim() || sending}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageCircle className="h-16 w-16 text-muted-foreground/20 mx-auto mb-4" />
                <p className="text-muted-foreground">Select a conversation to start messaging</p>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
