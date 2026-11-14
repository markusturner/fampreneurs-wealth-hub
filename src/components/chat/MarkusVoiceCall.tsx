import { useCallback, useRef, useState } from 'react'
import { ConversationProvider, useConversation } from '@elevenlabs/react'
import { FunctionsHttpError } from '@supabase/supabase-js'
import { Loader2, Mic, MicOff, Phone, PhoneOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'
import markusPhoto from '@/assets/markus_call_photo.png.asset.json'

type Line = { role: 'user' | 'assistant'; content: string; at: string }

type Props = { userId?: string; projectId: string | null; onSaved?: () => void }

export function MarkusVoiceCall(props: Props) {
  return <ConversationProvider><MarkusVoiceCallInner {...props} /></ConversationProvider>
}

function MarkusVoiceCallInner({ userId, projectId, onSaved }: Props) {
  const [open, setOpen] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [muted, setMuted] = useState(false)
  const [lines, setLines] = useState<Line[]>([])
  const linesRef = useRef<Line[]>([])
  const { toast } = useToast()

  const push = (line: Line) => { linesRef.current = [...linesRef.current, line]; setLines(linesRef.current) }

  const save = useCallback(async () => {
    const transcript = linesRef.current
    linesRef.current = []
    if (!userId || transcript.length === 0) return
    const title = `Voice call ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
    const { data: convo, error } = await supabase.from('chat_conversations').insert({ user_id: userId, title, persona: 'rachel', project_id: projectId }).select().single()
    if (error || !convo) { toast({ title: 'Call ended, but it could not be saved', variant: 'destructive' }); return }
    await supabase.from('ai_chat_history').insert(transcript.map(l => ({ user_id: userId, conversation_id: convo.id, role: l.role, content: l.content, created_at: l.at, metadata: { persona: 'rachel', source: 'voice' } })))
    onSaved?.()
  }, [userId, projectId, onSaved, toast])

  const conversation = useConversation({
    micMuted: muted,
    onDisconnect: () => { void save() },
    onMessage: (message: any) => {
      const text = message?.message
      if (!text) return
      push({ role: message.source === 'user' ? 'user' : 'assistant', content: String(text), at: new Date().toISOString() })
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
      linesRef.current = []; setLines([])
      await conversation.startSession({
        conversationToken: data.token,
        connectionType: 'webrtc',
        overrides: { agent: { prompt: { prompt: data.prompt }, firstMessage: data.firstMessage } },
      })
    } catch (err) {
      toast({ title: 'Could not start the call', description: err instanceof Error ? err.message : 'Please try again.', variant: 'destructive' })
    } finally { setConnecting(false) }
  }

  const end = async () => { await conversation.endSession() }
  const live = conversation.status === 'connected'

  return <>
    <Button variant="ghost" size="icon" className="h-10 w-10" aria-label="Call Markus" title="Call Markus" onClick={() => setOpen(true)}><Phone /></Button>
    <Dialog open={open} onOpenChange={value => { if (!value && live) void end(); setOpen(value) }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Call Markus</DialogTitle>
          <DialogDescription>Talk out loud with Markus. He remembers your past chats, and this call is saved to your chats.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4 py-4">
          <div className={`flex h-28 w-28 items-center justify-center overflow-hidden rounded-full bg-primary/10 transition-transform duration-300 ${live && conversation.isSpeaking ? 'scale-110 ring-4 ring-primary/40' : ''}`}>
            <img src={markusPhoto.url} alt="Markus" className="h-full w-full rounded-full object-cover" />
          </div>
          <p className="text-sm text-muted-foreground" role="status">{connecting ? 'Connecting...' : live ? (conversation.isSpeaking ? 'Markus is talking' : 'Listening...') : 'Ready to call'}</p>
          {lines.length > 0 && <div className="max-h-40 w-full overflow-y-auto rounded-md border border-border p-2 text-xs">
            {lines.slice(-6).map((l, i) => <p key={i} className="mb-1"><span className="font-semibold">{l.role === 'user' ? 'You' : 'Markus'}:</span> {l.content}</p>)}
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
