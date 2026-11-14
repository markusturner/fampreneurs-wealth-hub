import { useCallback, useLayoutEffect, useRef, useState } from 'react'
import { ConversationProvider, useConversation } from '@elevenlabs/react'
import { FunctionsHttpError } from '@supabase/supabase-js'
import { Loader2, Mic, MicOff, Phone, PhoneOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'
import type { WelcomeConversation, WelcomeMessage } from '@/hooks/useWelcomeChat'
import markusPhoto from '@/assets/markus_call_photo.png.asset.json'

type Line = { key: string; role: 'user' | 'assistant'; content: string; at: string; id?: Promise<string | null> }
type Props = { userId?: string; projectId: string | null; onLive?: (conversation: WelcomeConversation, messages: WelcomeMessage[]) => void; onSaved?: () => void }

export function MarkusVoiceCall(props: Props) {
  return <ConversationProvider><MarkusVoiceCallInner {...props} /></ConversationProvider>
}

function MarkusVoiceCallInner({ userId, projectId, onLive, onSaved }: Props) {
  const [open, setOpen] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [muted, setMuted] = useState(false)
  const [lines, setLines] = useState<Line[]>([])
  const linesRef = useRef<Line[]>([])
  const convoRef = useRef<WelcomeConversation | null>(null)
  const finishedRef = useRef(false)
  const logRef = useRef<HTMLDivElement | null>(null)
  const { toast } = useToast()

  useLayoutEffect(() => { const el = logRef.current; if (el) el.scrollTop = el.scrollHeight }, [lines])

  const publish = () => {
    setLines(linesRef.current)
    const convo = convoRef.current
    if (convo) onLive?.(convo, linesRef.current.map(l => ({ id: l.key, role: l.role, content: l.content })))
  }

  // Saves each spoken line to the chat as soon as it is heard; a resent agent line updates its saved copy.
  const record = (role: 'user' | 'assistant', content: string, responseId?: string) => {
    const convo = convoRef.current
    const key = responseId ? `r-${responseId}` : `${role}-${Date.now()}-${linesRef.current.length}`
    const existing = linesRef.current.find(l => l.key === key)
    if (existing) {
      linesRef.current = linesRef.current.map(l => l === existing ? { ...l, content } : l)
      publish()
      void existing.id?.then(id => { if (id) void supabase.from('ai_chat_history').update({ content }).eq('id', id) })
      return
    }
    const at = new Date().toISOString()
    const id = convo && userId
      ? Promise.resolve(supabase.from('ai_chat_history').insert({ user_id: userId, conversation_id: convo.id, role, content, created_at: at, metadata: { persona: 'rachel', source: 'voice' } }).select('id').single()).then(r => r.data?.id ?? null)
      : undefined
    linesRef.current = [...linesRef.current, { key, role, content, at, id }]
    publish()
  }

  const finish = useCallback(async () => {
    if (finishedRef.current) return
    finishedRef.current = true
    const convo = convoRef.current
    convoRef.current = null
    setOpen(false)
    if (!convo || !userId) return
    await Promise.all(linesRef.current.map(l => l.id))
    if (linesRef.current.length === 0) {
      await supabase.from('chat_conversations').delete().eq('id', convo.id).eq('user_id', userId)
    } else {
      await supabase.from('chat_conversations').update({ updated_at: new Date().toISOString() }).eq('id', convo.id).eq('user_id', userId)
      toast({ title: 'Call saved', description: 'You can keep chatting with Markus by typing below.' })
    }
    onSaved?.()
  }, [userId, onSaved, toast])

  const conversation = useConversation({
    micMuted: muted,
    onDisconnect: () => { void finish() },
    onMessage: (message: { message?: string; source?: string; role?: string; response_id?: string }) => {
      const text = message?.message?.trim()
      if (!text) return
      const fromUser = (message.role ?? message.source) === 'user'
      record(fromUser ? 'user' : 'assistant', text, fromUser ? undefined : message.response_id)
    },
    onError: () => toast({ title: 'Call problem', description: 'The call had trouble connecting. Please try again.', variant: 'destructive' }),
  })

  const start = async () => {
    setConnecting(true)
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch {
      toast({ title: 'Microphone needed', description: 'Please allow your microphone to talk with Markus.', variant: 'destructive' })
      setConnecting(false); return
    }
    try {
      const { data, error } = await supabase.functions.invoke('ai-chat', { body: { mode: 'voice_session', project_id: projectId } })
      if (error) {
        const details = error instanceof FunctionsHttpError ? await error.context.json().catch(() => null) : null
        throw new Error(details?.error || 'Could not start the call.')
      }
      if (!data?.token) throw new Error(data?.error || 'Could not start the call.')
      if (!userId) throw new Error('Please sign in again.')
      const title = `Voice call ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
      const { data: convo, error: convoError } = await supabase.from('chat_conversations').insert({ user_id: userId, title, persona: 'rachel', project_id: projectId }).select().single()
      if (convoError || !convo) throw new Error('Could not start a new chat for this call.')
      convoRef.current = convo
      finishedRef.current = false
      linesRef.current = []; setLines([])
      onLive?.(convo, [])
      await conversation.startSession({
        conversationToken: data.token,
        connectionType: 'webrtc',
        overrides: { agent: { prompt: { prompt: data.prompt }, firstMessage: data.firstMessage } },
      })
    } catch (err) {
      const convo = convoRef.current
      convoRef.current = null
      if (convo && userId) void supabase.from('chat_conversations').delete().eq('id', convo.id).eq('user_id', userId)
      toast({ title: 'Could not start the call', description: err instanceof Error ? err.message : 'Please try again.', variant: 'destructive' })
    } finally { setConnecting(false) }
  }

  const end = async () => {
    try { await conversation.endSession() } catch { /* already disconnected */ }
    void finish()
  }
  const live = conversation.status === 'connected'

  return <>
    <Button variant="ghost" size="icon" className="h-10 w-10" aria-label="Call Markus" title="Call Markus" onClick={() => setOpen(true)}><Phone /></Button>
    <Dialog open={open} onOpenChange={value => { if (value) { setOpen(true); return } if (live || connecting) void end(); else void finish() }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Call Markus</DialogTitle>
          <DialogDescription>Talk out loud with Markus. He remembers your past chats, and everything you both say is written into a new chat.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4 py-4">
          <div className={`flex h-28 w-28 items-center justify-center overflow-hidden rounded-full bg-primary/10 transition-transform duration-300 ${live && conversation.isSpeaking ? 'scale-110 ring-4 ring-primary/40' : ''}`}>
            <img src={markusPhoto.url} alt="Markus" className="h-full w-full rounded-full object-cover" />
          </div>
          <p className="text-sm text-muted-foreground" role="status">{connecting ? 'Connecting...' : live ? (conversation.isSpeaking ? 'Markus is talking' : 'Listening...') : 'Ready to call'}</p>
          {(live || lines.length > 0) && <div ref={logRef} aria-live="polite" aria-label="Call transcript" className="max-h-56 w-full overflow-y-auto overscroll-contain rounded-md border border-border p-3 text-sm">
            {lines.length === 0 ? <p className="text-center text-xs text-muted-foreground">Your words and Markus's words will show here.</p>
              : lines.map(l => <p key={l.key} className={`mb-2 ${l.role === 'user' ? 'text-right' : ''}`}><span className="block text-[11px] font-semibold text-muted-foreground">{l.role === 'user' ? 'You' : 'Markus'}</span>{l.content}</p>)}
          </div>}
          <div className="flex items-center gap-3">
            {live ? <>
              <Button variant="outline" size="icon" className="h-12 w-12 rounded-full" aria-label={muted ? 'Unmute' : 'Mute'} onClick={() => setMuted(m => !m)}>{muted ? <MicOff /> : <Mic />}</Button>
              <Button variant="destructive" size="icon" className="h-12 w-12 rounded-full" aria-label="Hang up" onClick={() => void end()}><PhoneOff /></Button>
            </> : <Button className="h-12 gap-2 rounded-full bg-[#ffb500] px-6 text-[#290a52] hover:bg-[#2eb2ff] hover:text-white" disabled={connecting || !userId} onClick={() => void start()}>{connecting ? <Loader2 className="animate-spin" /> : <Phone />}Start call</Button>}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  </>
}
