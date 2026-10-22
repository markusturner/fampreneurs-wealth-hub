import { useId, useState } from 'react'
import { ArrowLeft, Folder, FolderPlus, History, Loader2, MessageSquare, Plus, Search, ChevronDown, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { useToast } from '@/hooks/use-toast'
import type { useWelcomeChat, WelcomeConversation } from '@/hooks/useWelcomeChat'

type Chat = ReturnType<typeof useWelcomeChat>

export function WelcomeChatLibrary({ chat, onReset, onOpen }: { chat: Chat; onReset: (folder?: string | null) => void; onOpen: (conversation: WelcomeConversation) => Promise<void> }) {
  const [open, setOpen] = useState(false)
  const [filter, setFilter] = useState('')
  const [folder, setFolder] = useState<string | null>(null)
  const [projectDialog, setProjectDialog] = useState(false)
  const [name, setName] = useState('')
  const [creating, setCreating] = useState(false)
  const historyId = useId()
  const { toast } = useToast()
  const activeProject = chat.projects.find(project => project.id === chat.projectId)
  const selectedProject = chat.projects.find(project => project.id === folder)
  const chats = chat.conversations.filter(conversation => (!folder || conversation.project_id === folder) && conversation.title.toLowerCase().includes(filter.toLowerCase()))

  const create = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!name.trim() || creating) return
    setCreating(true)
    try {
      const project = await chat.createProject(name)
      if (!project) return
      await chat.moveToProject(project.id)
      setName('')
      setProjectDialog(false)
      setOpen(false)
    } catch {
      toast({ title: 'Could not create project', description: 'Please try again.', variant: 'destructive' })
    } finally { setCreating(false) }
  }

  return (
    <>
      <div className="mb-2 flex min-w-0 items-center justify-between gap-1 text-muted-foreground">
        <div className="flex min-w-0 items-center gap-1">
          {(chat.activeConversation || chat.projectId) && (
            <Button variant="ghost" size="icon" className="h-10 w-10 shrink-0" aria-label="Back to welcome" title="Back to welcome" disabled={chat.busy} onClick={() => onReset()}>
              <ArrowLeft />
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" disabled={chat.busy} className="h-10 min-w-0 max-w-[180px] gap-1 px-2 text-xs" aria-label="Choose chat project">
                <Folder className="shrink-0" /><span className="truncate">{activeProject?.name || 'All chats'}</span><ChevronDown className="shrink-0" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="max-h-64 max-w-[calc(100vw-2rem)] overflow-y-auto">
              {[{ id: null, name: 'No project' }, ...chat.projects].map(project => (
                <DropdownMenuItem key={project.id ?? 'none'} onClick={() => void chat.moveToProject(project.id).catch(() => toast({ title: 'Could not move chat', description: 'Please try again.', variant: 'destructive' }))}>
                  <span className="max-w-60 truncate">{project.name}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="flex shrink-0 items-center">
          <Button variant="ghost" className={`h-10 gap-1.5 px-2 text-xs ${open ? 'bg-muted text-foreground' : ''}`} aria-label="View past chats" aria-expanded={open} aria-controls={historyId} title="Past chats" disabled={chat.busy} onClick={() => { setOpen(!open); if (!open) void chat.refresh() }}><History /><span>History</span></Button>
          <Button variant="ghost" size="icon" className="h-10 w-10" aria-label="Add project" title="Add project" disabled={chat.busy} onClick={() => setProjectDialog(true)}><FolderPlus /></Button>
          <Button variant="ghost" size="icon" className="h-10 w-10" aria-label="Start new chat" title="New chat" disabled={chat.busy} onClick={() => { onReset(chat.projectId); setOpen(false) }}><Plus /></Button>
        </div>
      </div>
      {open && <section id={historyId} aria-label="Past chats" className="mb-3 w-full min-w-0 border-y border-border/70 py-2">
              <div className="mb-2 flex items-center gap-2">
                {folder && <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" aria-label="Back to all chats" onClick={() => setFolder(null)}><ArrowLeft /></Button>}
                <h2 className="min-w-0 flex-1 truncate text-xs">{selectedProject?.name || 'Past chats'}</h2>
                <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" aria-label="New chat in this project" title="New chat" onClick={() => { onReset(folder); setOpen(false) }}><Plus /></Button>
                <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" aria-label="Close past chats" title="Close history" onClick={() => setOpen(false)}><X /></Button>
              </div>
              <div className="relative mb-2"><Search className="absolute left-2.5 top-3 h-4 w-4 text-muted-foreground" /><Input aria-label="Search past chats" placeholder="Search chats" value={filter} onChange={event => setFilter(event.target.value)} className="h-10 border-border/60 bg-background/50 pl-9 text-base sm:text-sm" /></div>
              <div className="max-h-44 overflow-y-auto overscroll-contain">
                {chat.libraryLoading ? <div role="status" className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin" /><span className="sr-only">Loading past chats</span></div> : chat.libraryError ? <div className="py-4 text-center text-xs"><p>Could not load past chats.</p><Button variant="ghost" onClick={() => void chat.refresh()}>Try again</Button></div> : <>
                  {!folder && !filter && chat.projects.length > 0 && <div className="mb-1 flex items-center gap-1 overflow-x-auto border-b border-border/60 pb-1">
                    {chat.projects.map(project => <Button key={project.id} variant="ghost" className="h-10 max-w-48 shrink-0 justify-start px-2 text-xs" onClick={() => setFolder(project.id)}><Folder /><span className="truncate">{project.name}</span><span className="text-muted-foreground">{chat.conversations.filter(item => item.project_id === project.id).length}</span></Button>)}
                  </div>}
                  {chats.map(conversation => <Button key={conversation.id} variant="ghost" disabled={chat.busy} className="h-11 w-full justify-start gap-2 px-2 text-left" onClick={async () => {
                    try { await onOpen(conversation); setOpen(false) } catch { toast({ title: 'Could not open chat', description: 'Please try again.', variant: 'destructive' }) }
                  }}><MessageSquare className="text-muted-foreground" /><span className="min-w-0 flex-1 truncate text-xs text-foreground">{conversation.title}</span><span className="shrink-0 text-[10px] text-muted-foreground">{new Date(conversation.updated_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span></Button>)}
                  {chats.length === 0 && <p className="px-2 py-6 text-center text-xs text-muted-foreground">{filter ? 'No matching chats.' : 'No chats yet.'}</p>}
                </>}
              </div>
      </section>}
      <Dialog open={projectDialog} onOpenChange={value => { if (!creating) setProjectDialog(value) }}>
        <DialogContent className="max-w-sm"><DialogHeader><DialogTitle>New project</DialogTitle></DialogHeader>
          <form onSubmit={create} className="space-y-4"><Input aria-label="Project name" placeholder="Project name" maxLength={100} value={name} onChange={event => setName(event.target.value)} autoFocus disabled={creating} /><div className="flex justify-end gap-2"><Button type="button" variant="ghost" disabled={creating} onClick={() => setProjectDialog(false)}>Cancel</Button><Button type="submit" variant="secondary" disabled={!name.trim() || creating}>{creating ? <Loader2 className="animate-spin" /> : <Plus />}Create project</Button></div></form>
        </DialogContent>
      </Dialog>
    </>
  )
}