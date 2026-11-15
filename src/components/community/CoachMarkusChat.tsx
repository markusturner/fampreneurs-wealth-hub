import { AI_DISCLOSURE } from '@/lib/legal'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { MarkusReply } from '@/components/chat/MarkusReply'
import { ArrowUp, FileText, Loader2, Mic, Paperclip, Square, X } from 'lucide-react'
import { useChatComposerTools, CHAT_ATTACH_ACCEPT, ATTACHMENT_ONLY_PROMPT } from '@/hooks/useChatComposerTools'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { WelcomeChatLibrary } from '@/components/chat/WelcomeChatLibrary'
import { useWelcomeChat, type WelcomeConversation } from '@/hooks/useWelcomeChat'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { useSearchParams } from 'react-router-dom'
import { findSkill, MARKUS_SKILLS } from '@/lib/markus-skills'

// `welcome` opens on a fresh chat with a centered greeting and composer; `hideVoice` drops the call button when a Voice Call page exists.
// `tools` adds photo/document uploads and speak-to-type to the composer.
export function CoachMarkusChat({ welcome = false, hideVoice = false, tools = false }: { welcome?: boolean; hideVoice?: boolean; tools?: boolean } = {}) {
  const { user, profile } = useAuth()
  const chat = useWelcomeChat(user?.id)
  const { toast } = useToast()
  const [draft, setDraft] = useState('')
  const [pending, setPending] = useState('')
  const composer = useRef<HTMLTextAreaElement>(null)
  const log = useRef<HTMLDivElement>(null)
  const initialized = useRef(false)
  const [params, setParams] = useSearchParams()
  const fileInput = useRef<HTMLInputElement>(null)
  const extras = useChatComposerTools(text => setDraft(prev => (prev ? `${prev} ${text}` : text)))

  // A skill opens a fresh chat with its guided request ready to send.
  useLayoutEffect(() => {
    const skill = findSkill(params.get('skill'))
    if (!skill) return
    initialized.current = true
    chat.newChat(null)
    setDraft(skill.prompt)
    const next = new URLSearchParams(params); next.delete('skill'); setParams(next, { replace: true })
    requestAnimationFrame(() => composer.current?.focus())
  }, [params])

  // Open the most recent chat from the saved copy right away instead of waiting for the network.
  useLayoutEffect(() => {
    if (welcome || initialized.current || !chat.conversations.length) return
    initialized.current = true
    void chat.openConversation(chat.conversations[0]).catch(() => {
      toast({ title: 'Could not open recent chat', description: 'Please select it from Chats.', variant: 'destructive' })
    })
  }, [chat.conversations])

  useLayoutEffect(() => {
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
    const files = extras.attachments
    const message = draft.trim() || (files.length ? ATTACHMENT_ONLY_PROMPT : '')
    if (!message || chat.busy) return
    initialized.current = true
    setDraft('')
    extras.clearAttachments()
    setPending(files.length ? `${message}\n\n${files.map(f => `[${f.name}]`).join(' ')}` : message)
    try {
      const result = await chat.send(message, files)
      if (result && !result.saved) toast({ title: 'Reply received, but chat could not be saved', description: 'Please try again.', variant: 'destructive' })
    } catch {
      setDraft(message)
      toast({ title: 'Could not send message', description: 'Please try again.', variant: 'destructive' })
    } finally { setPending('') }
  }

  const empty = chat.messages.length === 0 && !pending && !chat.busy
  const firstName = (profile?.first_name || '').trim()
  const composerField = (large: boolean) => <Textarea ref={composer} aria-label="Message Coach Markus" placeholder={placeholder} value={draft} disabled={chat.busy} onChange={event => setDraft(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); void send() } }} rows={large ? 2 : 1} className={large ? 'min-h-14 max-h-48 min-w-0 flex-1 resize-none border-0 bg-transparent px-2 text-base shadow-none focus-visible:ring-0 focus-visible:ring-offset-0' : 'min-h-10 max-h-32 min-w-0 flex-1 resize-none rounded-lg bg-background text-base sm:text-sm'} />
  const toolButtons = tools ? <>
    <input ref={fileInput} type="file" multiple accept={CHAT_ATTACH_ACCEPT} className="hidden" onChange={event => { void extras.addFiles(event.target.files); event.target.value = '' }} />
    <Button type="button" variant="ghost" size="icon" aria-label="Attach a photo or file" title="Attach a photo or file" disabled={chat.busy} onClick={() => fileInput.current?.click()} className="shrink-0 rounded-full text-muted-foreground hover:text-foreground"><Paperclip /></Button>
    <Button type="button" variant="ghost" size="icon" aria-label={extras.recording ? 'Stop recording' : 'Speak your message'} title={extras.recording ? 'Stop recording' : 'Speak your message'} disabled={chat.busy || extras.transcribing} onClick={() => void extras.toggleRecording()} className={`shrink-0 rounded-full ${extras.recording ? 'bg-destructive/15 text-destructive' : 'text-muted-foreground hover:text-foreground'}`}>{extras.transcribing ? <Loader2 className="animate-spin" /> : extras.recording ? <Square /> : <Mic />}</Button>
  </> : null
  const attachmentChips = extras.attachments.length > 0 ? <div className="flex flex-wrap gap-2 px-1 pb-2">
    {extras.attachments.map((a, i) => <span key={`${a.name}-${i}`} className="flex items-center gap-1.5 rounded-full border border-border bg-background px-2.5 py-1 text-[11px] text-muted-foreground">
      {a.mimeType.startsWith('image/') && a.dataUrl ? <img src={a.dataUrl} alt="" className="h-4 w-4 rounded object-cover" /> : <FileText className="h-3 w-3" />}
      <span className="max-w-[160px] truncate">{a.name}</span>
      <button type="button" aria-label={`Remove ${a.name}`} onClick={() => extras.removeAttachment(i)}><X className="h-3 w-3 hover:text-destructive" /></button>
    </span>)}
  </div> : null
  const placeholder = extras.recording ? 'Listening...' : extras.transcribing ? 'Writing what you said...' : 'Ask Markus AI anything...'
  const sendButton = <Button type="submit" size="icon" aria-label="Send to Coach Markus" disabled={(!draft.trim() && extras.attachments.length === 0) || chat.busy} className="shrink-0 rounded-full bg-accent text-accent-foreground hover:bg-accent/90"><ArrowUp /></Button>
  const library = <div className="shrink-0 border-b border-border bg-card px-3 pt-2 sm:px-5">
    <WelcomeChatLibrary chat={chat} onReset={reset} onNewChat={start} onOpen={open} hideVoice={hideVoice} />
  </div>

  if (welcome && empty) {
    return <section aria-label="Coach Markus chat" className="flex min-h-0 min-w-0 flex-1 flex-col">
      {library}
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto px-4 py-8">
        <div className="w-full max-w-2xl">
          <h2 className="text-center font-montserrat text-2xl font-semibold text-foreground sm:text-3xl">{firstName ? `What can I help with, ${firstName}?` : 'What can I help with?'}</h2>
          <form className="mt-6 rounded-3xl border border-border bg-card p-3 shadow-sm focus-within:border-accent/60" onSubmit={event => { event.preventDefault(); void send() }}>
            {attachmentChips}
            {composerField(true)}
            <div className="mt-1 flex items-center gap-1">
              {toolButtons}
              <div className="flex-1" />
              {sendButton}
            </div>
          </form>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {MARKUS_SKILLS.slice(0, 4).map(skill => <button key={skill.id} type="button" onClick={() => { setDraft(skill.prompt); requestAnimationFrame(() => composer.current?.focus()) }} className="rounded-full border border-border bg-background px-3.5 py-2 text-xs font-medium text-muted-foreground transition-colors hover:border-accent hover:text-foreground">{skill.title}</button>)}
          </div>
          <p className="mt-6 text-center text-[11px] text-muted-foreground">{AI_DISCLOSURE} <a href="/privacy-policy#ai-chats" className="underline underline-offset-2">How chats are used</a></p>
        </div>
      </div>
    </section>
  }

  return <section aria-label="Coach Markus chat" className="flex min-h-0 min-w-0 flex-1 flex-col">
    {library}
    <div ref={log} role="log" aria-label="Coach Markus messages" aria-live="polite" className="community-scroll">
      {chat.messages.length === 0 && !pending && <div className="flex h-full min-h-40 items-center justify-center"><div className="text-center"><h2 className="text-lg font-semibold text-foreground">Ask Markus AI anything</h2><p className="mt-1 text-xs text-muted-foreground">{AI_DISCLOSURE} <a href="/privacy-policy#ai-chats" className="underline underline-offset-2">How chats are used</a></p></div></div>}
      <div className="flex flex-col gap-5">
        {chat.messages.map(message => <div key={message.id} className={`min-w-0 max-w-[90%] sm:max-w-[85%] ${message.role === 'user' ? 'self-end' : 'self-start'}`}>
          <p className="mb-1 text-[11px] font-semibold text-muted-foreground">{message.role === 'user' ? 'You' : 'Markus AI'}</p>
          {message.role === 'assistant' ? <MarkusReply content={message.content} bubbleClassName="text-sm" /> : <div className="rounded-lg px-4 py-3 text-sm bg-accent text-accent-foreground">
            <div className="prose prose-sm max-w-none text-inherit [overflow-wrap:anywhere] [&_pre]:overflow-x-auto [&_a]:text-inherit [&_a]:underline"><ReactMarkdown>{message.content}</ReactMarkdown></div>
          </div>}
        </div>)}
        {pending && <div className="max-w-[90%] self-end rounded-lg bg-accent px-4 py-3 text-sm text-accent-foreground whitespace-pre-wrap [overflow-wrap:anywhere]">{pending}</div>}
        {chat.busy && <div role="status" className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />{pending ? 'Markus is thinking...' : 'Opening chat...'}</div>}
      </div>
    </div>
    {attachmentChips && <div className="shrink-0 bg-card px-3 pt-2">{attachmentChips}</div>}
    <form className="community-composer" onSubmit={event => { event.preventDefault(); void send() }}>
      {toolButtons}
      {composerField(false)}
      {sendButton}
    </form>
  </section>
}