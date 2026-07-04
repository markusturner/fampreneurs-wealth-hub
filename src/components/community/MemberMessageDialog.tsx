import { useEffect, useRef, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { Loader2, Send } from 'lucide-react'

interface DM {
  id: string
  sender_id: string
  receiver_id: string
  content: string
  created_at: string
}

interface Props {
  open: boolean
  onOpenChange: (o: boolean) => void
  recipientId: string | null
  recipientName: string | null
  recipientAvatar?: string | null
}

export function MemberMessageDialog({ open, onOpenChange, recipientId, recipientName, recipientAvatar }: Props) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [messages, setMessages] = useState<DM[]>([])
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open || !user || !recipientId) return
    setLoading(true)
    ;(async () => {
      const { data } = await supabase
        .from('direct_messages')
        .select('*')
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${recipientId}),and(sender_id.eq.${recipientId},receiver_id.eq.${user.id})`)
        .order('created_at', { ascending: true })
      setMessages((data || []) as DM[])
      setLoading(false)
    })()

    const channel = supabase
      .channel(`dm-popup-${user.id}-${recipientId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'direct_messages',
        filter: `receiver_id=eq.${user.id}`,
      }, (payload) => {
        const m = payload.new as DM
        if (m.sender_id === recipientId) setMessages(prev => [...prev, m])
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [open, user?.id, recipientId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = async () => {
    if (!text.trim() || !user || !recipientId || sending) return
    setSending(true)
    try {
      const { data, error } = await supabase
        .from('direct_messages')
        .insert({ sender_id: user.id, receiver_id: recipientId, content: text.trim() })
        .select()
        .single()
      if (error) throw error
      setMessages(prev => [...prev, data as DM])
      setText('')
    } catch (e: any) {
      toast({ title: 'Send failed', description: e?.message || 'Try again', variant: 'destructive' })
    } finally {
      setSending(false)
    }
  }

  const initials = (recipientName || 'M').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-4 border-b border-border">
          <DialogTitle className="flex items-center gap-3 text-base">
            <Avatar className="h-9 w-9">
              {recipientAvatar && <AvatarImage src={recipientAvatar} />}
              <AvatarFallback className="text-xs">{initials}</AvatarFallback>
            </Avatar>
            <span className="truncate">{recipientName || 'Member'}</span>
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="h-80 px-4 py-3">
          {loading ? (
            <div className="h-full flex items-center justify-center">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : messages.length === 0 ? (
            <p className="text-center text-xs text-muted-foreground py-10">Send your first message.</p>
          ) : (
            <div className="space-y-2">
              {messages.map(m => {
                const mine = m.sender_id === user?.id
                return (
                  <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap break-words ${
                      mine ? 'bg-[#ffb500] text-[#290a52]' : 'bg-muted text-foreground'
                    }`}>
                      {m.content}
                    </div>
                  </div>
                )
              })}
              <div ref={bottomRef} />
            </div>
          )}
        </ScrollArea>

        <div className="p-3 border-t border-border flex items-end gap-2">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
            placeholder="Type a message…"
            rows={1}
            className="min-h-[40px] max-h-32 resize-none"
          />
          <Button
            onClick={send}
            disabled={!text.trim() || sending}
            size="icon"
            className="h-10 w-10 bg-[#ffb500] hover:bg-[#ffc733] text-[#290a52]"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
