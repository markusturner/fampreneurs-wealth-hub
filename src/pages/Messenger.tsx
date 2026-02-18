import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/integrations/supabase/client'
import { Search, Send, MessageCircle } from 'lucide-react'

interface Conversation {
  user_id: string
  display_name: string | null
  avatar_url: string | null
  last_message?: string
  last_message_at?: string
}

export default function Messenger() {
  const { user, profile } = useAuth()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConvo, setSelectedConvo] = useState<Conversation | null>(null)
  const [message, setMessage] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchProfiles = async () => {
      try {
        const { data } = await supabase
          .from('profiles')
          .select('user_id, display_name, avatar_url')
          .neq('user_id', user?.id || '')
          .order('display_name')
        setConversations((data || []).map(p => ({ ...p, last_message: 'No messages yet' })))
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    fetchProfiles()
  }, [user])

  const getInitials = (name: string | null) => {
    if (!name) return 'M'
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  const filtered = conversations.filter(c =>
    !searchQuery || c.display_name?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleSend = () => {
    if (!message.trim() || !selectedConvo) return
    // placeholder - would integrate with real messaging
    setMessage('')
  }

  return (
    <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 max-w-5xl">
      <div className="mb-4">
        <h1 className="text-xl sm:text-2xl font-bold">Messenger</h1>
        <p className="text-muted-foreground text-sm">View and send messages</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[calc(100vh-220px)]">
        {/* Conversations List */}
        <Card className="md:col-span-1">
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
          <ScrollArea className="h-[calc(100%-60px)]">
            <div className="p-2 space-y-1">
              {loading ? (
                <div className="p-4 text-center text-muted-foreground text-sm">Loading...</div>
              ) : filtered.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground text-sm">No conversations</div>
              ) : (
                filtered.map(c => (
                  <button
                    key={c.user_id}
                    onClick={() => setSelectedConvo(c)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors hover:bg-muted/50 ${
                      selectedConvo?.user_id === c.user_id ? 'bg-accent/10' : ''
                    }`}
                  >
                    <Avatar className="h-10 w-10">
                      {c.avatar_url && <AvatarImage src={c.avatar_url} />}
                      <AvatarFallback>{getInitials(c.display_name)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{c.display_name || 'Member'}</p>
                      <p className="text-xs text-muted-foreground truncate">{c.last_message}</p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </ScrollArea>
        </Card>

        {/* Chat Area */}
        <Card className="md:col-span-2 flex flex-col">
          {selectedConvo ? (
            <>
              <div className="flex items-center gap-3 p-4 border-b">
                <Avatar className="h-10 w-10">
                  {selectedConvo.avatar_url && <AvatarImage src={selectedConvo.avatar_url} />}
                  <AvatarFallback>{getInitials(selectedConvo.display_name)}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold text-sm">{selectedConvo.display_name || 'Member'}</p>
                  <p className="text-xs text-muted-foreground">Active</p>
                </div>
              </div>
              <div className="flex-1 flex items-center justify-center p-6">
                <div className="text-center">
                  <MessageCircle className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-muted-foreground text-sm">No messages yet</p>
                  <p className="text-muted-foreground text-xs mt-1">Send a message to start the conversation</p>
                </div>
              </div>
              <div className="flex items-center gap-2 p-3 border-t">
                <Input
                  placeholder={`Message ${selectedConvo.display_name?.split(' ')[0] || 'member'}...`}
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSend()}
                />
                <Button size="icon" onClick={handleSend} disabled={!message.trim()}>
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
