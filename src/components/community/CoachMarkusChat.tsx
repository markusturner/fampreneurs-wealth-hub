import { useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { MarkusReply } from '@/components/chat/MarkusReply'
import { ArrowUp, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { WelcomeChatLibrary } from '@/components/chat/WelcomeChatLibrary'
import { useWelcomeChat, type WelcomeConversation } from '@/hooks/useWelcomeChat'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'

export function CoachMarkusChat() {
  const { user } = useAuth()
  const chat = useWelcomeChat(user?.id)
  const { toast } = useToast()
  const [draft, setDraft] = useState('')
  const [pending, setPending] = useState('')
  const composer = useRef<HTMLTextAreaElement>(null)
  const log = useRef<HTMLDivElement>(null)
  const initialized = useRef(false)

  useEffect(() => {
    if (initialized.current || chat.libraryLoading || chat.libraryError || !chat.conversations.length) return
    initialized.current = true
    void chat.openConversation(chat.conversations[0]).catch(() => {
      toast({ title: 'Could not open recent chat', description: 'Please select it from Chats.', variant: 'destructive' })
    })
  }, [chat.libraryLoading, chat.libraryError, chat.conversations])

  useEffect(() => {
    const element = log.current
    if (element) element.scrollTop = element.scrollHeight
  }, [chat.messages, pending])

  const reset = (folder: string | null = null) => {
    initialized.current = true
    chat.newChat(folder)
    setDraft('')
    requestAnimationFrame(() => composer.current?.focus())
  }
  const start = (folder: string | null = null) => {
    reset(folder)
    toast({ title: 'New chat started' })
  }
  const open = async (conversation: WelcomeConversation) => {
    initialized.current = true
    await chat.openConversation(conversation)
    setDraft('')
    composer.current?.focus()
  }
  const send = async () => {
    const message = draft.trim()
    if (!message || chat.busy) return
    initialized.current = true
    setDraft('')
    setPending(message)
    try {
      const result = await chat.send(message, [])
      if (result && !result.saved) toast({ title: 'Reply received, but chat could not be saved', description: 'Please try again.', variant: 'destructive' })
    } catch {
      setDraft(message)
      toast({ title: 'Could not send message', description: 'Please try again.', variant: 'destructive' })
    } finally { setPending('') }
  }

  return <section aria-label="Coach Markus chat" className="flex min-h-0 min-w-0 flex-1 flex-col">
    <div className="shrink-0 border-b border-border bg-card px-3 pt-2 sm:px-5">
      <WelcomeChatLibrary chat={chat} onReset={reset} onNewChat={start} onOpen={open} />
    </div>
    <div ref={log} role="log" aria-label="Coach Markus messages" aria-live="polite" className="community-scroll">
      {chat.messages.length === 0 && !pending && <div className="flex h-full min-h-40 items-center justify-center"><h2 className="text-lg font-semibold text-foreground">Ask Markus AI anything</h2></div>}
      <div className="flex flex-col gap-5">
        {chat.messages.map(message => <div key={message.id} className={`min-w-0 max-w-[90%] sm:max-w-[85%] ${message.role === 'user' ? 'self-end' : 'self-start'}`}>
          <p className="mb-1 text-[11px] font-semibold text-muted-foreground">{message.role === 'user' ? 'You' : 'Markus AI'}</p>
          {message.role === 'assistant' ? <MarkusReply content={message.content} /> : <div className="rounded-lg px-4 py-3 text-sm bg-accent text-accent-foreground">
            <div className="prose prose-sm max-w-none text-inherit [overflow-wrap:anywhere] [&_pre]:overflow-x-auto [&_a]:text-inherit [&_a]:underline"><ReactMarkdown>{message.content}</ReactMarkdown></div>
          </div>}
        </div>)}
        {pending && <div className="max-w-[90%] self-end rounded-lg bg-accent px-4 py-3 text-sm text-accent-foreground whitespace-pre-wrap [overflow-wrap:anywhere]">{pending}</div>}
        {chat.busy && <div role="status" className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />{pending ? 'Markus is thinking...' : 'Opening chat...'}</div>}
      </div>
    </div>
    <form className="community-composer" onSubmit={event => { event.preventDefault(); void send() }}>
      <Textarea ref={composer} aria-label="Message Coach Markus" placeholder="Ask Markus AI anything..." value={draft} disabled={chat.busy} onChange={event => setDraft(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); void send() } }} rows={1} className="min-h-10 max-h-32 min-w-0 flex-1 resize-none rounded-lg bg-background text-base sm:text-sm" />
      <Button type="submit" size="icon" aria-label="Send to Coach Markus" disabled={!draft.trim() || chat.busy} className="shrink-0 rounded-full bg-accent text-accent-foreground hover:bg-accent/90"><ArrowUp /></Button>
    </form>
  </section>
}