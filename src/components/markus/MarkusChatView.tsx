import { useLayoutEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowUp, Brain, Check, ChevronDown, Copy, FileText, Folder, FolderPlus, Loader2, Mic, Plus, SquarePen, Square, Volume2, X } from 'lucide-react'
import { AI_DISCLOSURE } from '@/lib/legal'
import { MarkusReply } from '@/components/chat/MarkusReply'
import { MarkusKnowledgeBase } from '@/components/chat/MarkusKnowledgeBase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { useChatComposerTools, CHAT_ATTACH_ACCEPT, ATTACHMENT_ONLY_PROMPT } from '@/hooks/useChatComposerTools'
import { useWelcomeChat } from '@/hooks/useWelcomeChat'
import { useMarkusSkills } from '@/hooks/useMarkusSkills'
import { findSkill } from '@/lib/markus-skills'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

// Plain reply text with copy and read-aloud actions underneath, like ChatGPT.
function ReplyActions({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const [speaking, setSpeaking] = useState(false)
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500) } catch { /* clipboard blocked */ }
  }
  const speak = () => {
    if (!('speechSynthesis' in window)) return
    if (speaking) { window.speechSynthesis.cancel(); setSpeaking(false); return }
    const utterance = new SpeechSynthesisUtterance(text.replace(/[#*_`>\[\]()]/g, ''))
    utterance.onend = () => setSpeaking(false)
    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(utterance)
    setSpeaking(true)
  }
  const cls = 'h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground'
  return <div className="mt-2 flex items-center gap-0.5">
    <Button type="button" variant="ghost" size="icon" className={cls} aria-label="Copy reply" title="Copy" onClick={() => void copy()}>{copied ? <Check /> : <Copy />}</Button>
    <Button type="button" variant="ghost" size="icon" className={cn(cls, speaking && 'text-foreground')} aria-label={speaking ? 'Stop reading' : 'Read aloud'} title={speaking ? 'Stop reading' : 'Read aloud'} onClick={speak}>{speaking ? <Square /> : <Volume2 />}</Button>
  </div>
}

export function MarkusChatView() {
  const { user, profile } = useAuth()
  const chat = useWelcomeChat(user?.id)
  const { toast } = useToast()
  const [draft, setDraft] = useState('')
  const [pending, setPending] = useState('')
  const [memoryNote, setMemoryNote] = useState<{ id: string; items: string[] } | null>(null)
  const [projectDialog, setProjectDialog] = useState(false)
  const [projectName, setProjectName] = useState('')
  const [creating, setCreating] = useState(false)
  const composer = useRef<HTMLTextAreaElement>(null)
  const log = useRef<HTMLDivElement>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const [params, setParams] = useSearchParams()
  const extras = useChatComposerTools(text => setDraft(prev => (prev ? `${prev} ${text}` : text)))
  const { skills, loaded: skillsLoaded } = useMarkusSkills()
  const activeSkills = skills.filter(s => s.isActive)
  const focus = () => requestAnimationFrame(() => composer.current?.focus())

  // A skill opens a fresh chat with its guided request ready to send.
  useLayoutEffect(() => {
    if (!params.get('skill') || !skillsLoaded) return
    const skill = findSkill(params.get('skill'), activeSkills)
    if (!skill) return
    chat.newChat(null)
    setDraft(skill.prompt)
    const next = new URLSearchParams(params); next.delete('skill'); setParams(next, { replace: true })
    focus()
  }, [params, skillsLoaded])

  useLayoutEffect(() => {
    const element = log.current
    if (element) element.scrollTop = element.scrollHeight
  }, [chat.messages, pending])

  useLayoutEffect(() => { focus() }, [])

  const newChat = () => { chat.newChat(chat.projectId); setDraft(''); setMemoryNote(null); focus() }
  const send = async () => {
    const files = extras.attachments
    const message = draft.trim() || (files.length ? ATTACHMENT_ONLY_PROMPT : '')
    if (!message || chat.busy) return
    setDraft('')
    extras.clearAttachments()
    setPending(files.length ? `${message}\n\n${files.map(f => `[${f.name}]`).join(' ')}` : message)
    try {
      const result = await chat.send(message, files, 'markus')
      setMemoryNote(result?.memories?.length && result.assistantId ? { id: String(result.assistantId), items: result.memories } : null)
      if (result && !result.saved) toast({ title: 'Reply received, but chat could not be saved', description: 'Please try again.', variant: 'destructive' })
    } catch {
      setDraft(message)
      toast({ title: 'Could not send message', description: 'Please try again.', variant: 'destructive' })
    } finally { setPending(''); focus() }
  }
  const createProject = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!projectName.trim() || creating) return
    setCreating(true)
    try {
      const project = await chat.createProject(projectName)
      if (project) { await chat.moveToProject(project.id); setProjectName(''); setProjectDialog(false) }
    } catch {
      toast({ title: 'Could not create project', description: 'Please try again.', variant: 'destructive' })
    } finally { setCreating(false) }
  }

  const empty = chat.messages.length === 0 && !pending && !chat.busy
  const firstName = (profile?.first_name || '').trim()
  const activeProject = chat.projects.find(p => p.id === chat.projectId)
  const title = chat.activeConversation?.title || 'Markus AI'
  const placeholder = extras.recording ? 'Listening...' : extras.transcribing ? 'Writing what you said...' : 'Ask anything'

  const composerBox = <form onSubmit={event => { event.preventDefault(); void send() }} className="w-full rounded-[28px] border border-border bg-card p-2 shadow-sm focus-within:border-foreground/20">
    {extras.attachments.length > 0 && <div className="flex flex-wrap gap-2 px-2 pb-2 pt-1">
      {extras.attachments.map((a, i) => <span key={`${a.name}-${i}`} className="flex items-center gap-1.5 rounded-xl border border-border bg-background px-2.5 py-1.5 text-xs text-muted-foreground">
        {a.mimeType.startsWith('image/') && a.dataUrl ? <img src={a.dataUrl} alt="" className="h-5 w-5 rounded object-cover" /> : <FileText className="h-3.5 w-3.5" />}
        <span className="max-w-[160px] truncate">{a.name}</span>
        <button type="button" aria-label={`Remove ${a.name}`} onClick={() => extras.removeAttachment(i)}><X className="h-3.5 w-3.5 hover:text-destructive" /></button>
      </span>)}
    </div>}
    <div className="flex items-end gap-1">
      <input ref={fileInput} type="file" multiple accept={CHAT_ATTACH_ACCEPT} className="hidden" onChange={event => { void extras.addFiles(event.target.files); event.target.value = '' }} />
      <Button type="button" variant="ghost" size="icon" aria-label="Add photos and files" title="Add photos and files" disabled={chat.busy} onClick={() => fileInput.current?.click()} className="h-10 w-10 shrink-0 rounded-full"><Plus className="!h-5 !w-5" /></Button>
      <textarea ref={composer} aria-label="Message Markus AI" placeholder={placeholder} value={draft} rows={1} disabled={chat.busy}
        onChange={event => setDraft(event.target.value)}
        onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); void send() } }}
        className="max-h-48 min-h-10 min-w-0 flex-1 resize-none bg-transparent px-1 py-2 text-base leading-6 outline-none placeholder:text-muted-foreground [field-sizing:content]" />
      <Button type="button" variant="ghost" size="icon" aria-label={extras.recording ? 'Stop recording' : 'Speak your message'} title={extras.recording ? 'Stop recording' : 'Dictate'} disabled={chat.busy || extras.transcribing} onClick={() => void extras.toggleRecording()} className={cn('h-10 w-10 shrink-0 rounded-full', extras.recording && 'bg-destructive/15 text-destructive')}>
        {extras.transcribing ? <Loader2 className="animate-spin" /> : extras.recording ? <Square /> : <Mic className="!h-5 !w-5" />}
      </Button>
      <Button type="submit" size="icon" aria-label="Send message" disabled={(!draft.trim() && extras.attachments.length === 0) || chat.busy} className="h-10 w-10 shrink-0 rounded-full bg-foreground text-background hover:bg-foreground/85">
        {chat.busy ? <Loader2 className="animate-spin" /> : <ArrowUp className="!h-5 !w-5" />}
      </Button>
    </div>
  </form>

  return <section aria-label="Markus AI chat" className="flex min-h-0 min-w-0 flex-1 flex-col bg-background">
    <header className="flex h-14 shrink-0 items-center justify-between gap-2 px-3 sm:px-4">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" disabled={chat.busy} className="h-10 min-w-0 max-w-[70vw] gap-1 px-3 text-base font-medium sm:max-w-md" aria-label="Open chats">
            <span className="truncate">{title}</span><ChevronDown className="shrink-0 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="max-h-[70vh] w-72 overflow-y-auto">
          <DropdownMenuItem onClick={newChat}><SquarePen />New chat</DropdownMenuItem>
          <DropdownMenuItem onClick={() => setProjectDialog(true)}><FolderPlus />New project</DropdownMenuItem>
          {chat.projects.length > 0 && <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs text-muted-foreground">Move this chat to a project</DropdownMenuLabel>
            {[{ id: null as string | null, name: 'No project' }, ...chat.projects].map(p => <DropdownMenuItem key={p.id ?? 'none'} onClick={() => void chat.moveToProject(p.id).catch(() => toast({ title: 'Could not move chat', description: 'Please try again.', variant: 'destructive' }))}>
              <Folder /><span className="truncate">{p.name}</span>{chat.projectId === p.id && <Check className="ml-auto" />}
            </DropdownMenuItem>)}
          </>}
          <DropdownMenuSeparator />
          <DropdownMenuLabel className="text-xs text-muted-foreground">Recent chats</DropdownMenuLabel>
          {chat.conversations.length === 0 && <p className="px-2 py-2 text-xs text-muted-foreground">No chats yet.</p>}
          {chat.conversations.slice(0, 40).map(c => <DropdownMenuItem key={c.id} onClick={() => void chat.openConversation(c).then(focus).catch(() => toast({ title: 'Could not open chat', description: 'Please try again.', variant: 'destructive' }))}>
            <span className="min-w-0 flex-1 truncate">{c.title}</span>
            <span className="shrink-0 text-[10px] text-muted-foreground">{new Date(c.updated_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
          </DropdownMenuItem>)}
        </DropdownMenuContent>
      </DropdownMenu>
      <div className="flex shrink-0 items-center gap-0.5 text-muted-foreground">
        {activeProject && <span className="mr-1 hidden max-w-40 items-center gap-1 truncate text-xs sm:flex"><Folder className="h-3.5 w-3.5" />{activeProject.name}</span>}
        <MarkusKnowledgeBase userId={user?.id} projects={chat.projects} projectId={chat.projectId} />
        <Button variant="ghost" size="icon" className="h-10 w-10" aria-label="New chat" title="New chat" disabled={chat.busy} onClick={newChat}><SquarePen /></Button>
      </div>
    </header>

    {empty ? <div className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto px-4 pb-16">
      <div className="w-full max-w-3xl">
        <h2 className="mb-7 text-center text-2xl font-medium text-foreground sm:text-3xl">{firstName ? `What can I help with, ${firstName}?` : 'What can I help with?'}</h2>
        {composerBox}
        {activeSkills.length > 0 && <div className="mt-4 flex flex-wrap justify-center gap-2">
          {activeSkills.slice(0, 4).map(skill => <button key={skill.id} type="button" onClick={() => { setDraft(skill.prompt); focus() }} className="rounded-full border border-border px-3.5 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">{skill.title}</button>)}
        </div>}
      </div>
    </div> : <>
      <div ref={log} role="log" aria-label="Markus AI messages" aria-live="polite" className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 pb-10 pt-6">
          {chat.messages.map(message => message.role === 'user'
            ? <div key={message.id} className="max-w-[85%] self-end whitespace-pre-wrap rounded-3xl bg-muted px-5 py-2.5 text-base text-foreground [overflow-wrap:anywhere]">{message.content}</div>
            : <div key={message.id} className="min-w-0 self-stretch">
                <MarkusReply content={message.content} bubbleClassName="rounded-none bg-transparent p-0 text-base text-foreground [&_.prose]:text-base" />
                <ReplyActions text={message.content} />
                {memoryNote?.id === String(message.id) && <Link to="/markus-ai/memories" title={memoryNote.items.join('\n')} className="mt-1 inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"><Brain className="h-3.5 w-3.5" />Memory updated</Link>}
              </div>)}
          {pending && <div className="max-w-[85%] self-end whitespace-pre-wrap rounded-3xl bg-muted px-5 py-2.5 text-base text-foreground [overflow-wrap:anywhere]">{pending}</div>}
          {chat.busy && <div role="status" aria-label={pending ? 'Markus is thinking' : 'Opening chat'} className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="h-3 w-3 animate-pulse rounded-full bg-foreground" />{pending ? '' : 'Opening chat...'}
          </div>}
        </div>
      </div>
      <div className="mx-auto w-full max-w-3xl shrink-0 px-3 pb-3 sm:px-4 sm:pb-4">
        <p className="mb-2 text-center text-xs text-muted-foreground">Markus AI can make mistakes. Check important info.</p>
        {composerBox}
      </div>
    </>}
    {empty && <p className="shrink-0 px-4 pb-3 text-center text-[11px] text-muted-foreground">{AI_DISCLOSURE} <a href="/privacy-policy#ai-chats" className="underline underline-offset-2">How chats are used</a></p>}

    <Dialog open={projectDialog} onOpenChange={value => { if (!creating) setProjectDialog(value) }}>
      <DialogContent className="max-w-sm"><DialogHeader><DialogTitle>New project</DialogTitle></DialogHeader>
        <form onSubmit={createProject} className="space-y-4">
          <Input aria-label="Project name" placeholder="Project name" maxLength={100} value={projectName} onChange={event => setProjectName(event.target.value)} autoFocus disabled={creating} />
          <div className="flex justify-end gap-2"><Button type="button" variant="ghost" disabled={creating} onClick={() => setProjectDialog(false)}>Cancel</Button><Button type="submit" variant="secondary" disabled={!projectName.trim() || creating}>{creating ? <Loader2 className="animate-spin" /> : <Plus />}Create project</Button></div>
        </form>
      </DialogContent>
    </Dialog>
  </section>
}
