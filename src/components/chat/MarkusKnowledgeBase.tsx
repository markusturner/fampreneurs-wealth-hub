import { useEffect, useState } from 'react'
import { BookOpen, Loader2, Trash2, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'

type Item = { id: string; title: string; project_id: string | null; source_type: string; created_at: string }
type Project = { id: string; name: string }

const toBase64 = (file: File) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader()
  reader.onload = () => resolve(String(reader.result).split(',')[1] || '')
  reader.onerror = reject
  reader.readAsDataURL(file)
})

export function MarkusKnowledgeBase({ userId, projects, projectId }: { userId?: string; projects: Project[]; projectId: string | null }) {
  const [open, setOpen] = useState(false)
  return <>
    <Button variant="ghost" size="icon" className="h-10 w-10" aria-label="Knowledge Base" title="Knowledge Base" onClick={() => setOpen(true)}><BookOpen /></Button>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-h-[90dvh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Knowledge Base</DialogTitle>
          <DialogDescription>Add notes or files about your family and goals. Only you can see them, and Markus uses them in chats and calls.</DialogDescription>
        </DialogHeader>
        {open && <MarkusKnowledgePanel userId={userId} projects={projects} projectId={projectId} />}
      </DialogContent>
    </Dialog>
  </>
}

// Notes and files a member saves for Markus. Memories live on their own page.
export function MarkusKnowledgePanel({ userId, projects, projectId }: { userId?: string; projects: Project[]; projectId: string | null }) {
  const [items, setItems] = useState<Item[]>([])
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [scope, setScope] = useState<string>('')
  const [busy, setBusy] = useState(false)
  const { toast } = useToast()

  const load = async () => {
    if (!userId) return
    const { data } = await supabase.from('markus_user_knowledge').select('id,title,project_id,source_type,created_at').eq('user_id', userId).neq('source_type', 'memory').order('created_at', { ascending: false })
    setItems((data as Item[]) ?? [])
  }
  useEffect(() => { setScope(projectId ?? ''); void load() }, [userId])

  const add = async (entry: { title: string; content: string; source_type: 'note' | 'file' }) => {
    if (!userId) return
    const { error } = await supabase.from('markus_user_knowledge').insert({ user_id: userId, project_id: scope || null, ...entry, title: entry.title.slice(0, 200), content: entry.content.slice(0, 60000) })
    if (error) throw error
    await load()
  }

  const saveNote = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!title.trim() || !content.trim() || busy) return
    setBusy(true)
    try { await add({ title: title.trim(), content: content.trim(), source_type: 'note' }); setTitle(''); setContent('') }
    catch { toast({ title: 'Could not save note', variant: 'destructive' }) }
    finally { setBusy(false) }
  }

  const upload = async (file: File) => {
    if (busy) return
    if (file.size > 10 * 1024 * 1024) { toast({ title: 'File too large', description: 'Please use a file under 10 MB.', variant: 'destructive' }); return }
    setBusy(true)
    try {
      let text = ''
      if (/\.(txt|md|csv|json)$/i.test(file.name) || file.type.startsWith('text/')) text = await file.text()
      else {
        const { data, error } = await supabase.functions.invoke('extract-document-text', { body: { files: [{ name: file.name, mime: file.type, data: await toBase64(file) }] } })
        if (error || !data?.text) throw error || new Error('No text')
        text = String(data.text)
      }
      if (!text.trim()) throw new Error('Empty')
      await add({ title: file.name, content: text, source_type: 'file' })
      toast({ title: 'File added', description: 'Markus will use it in your chats and calls.' })
    } catch { toast({ title: 'Could not read that file', description: 'Try a PDF, image or text file.', variant: 'destructive' }) }
    finally { setBusy(false) }
  }

  const remove = async (id: string) => {
    const { error } = await supabase.from('markus_user_knowledge').delete().eq('id', id)
    if (error) toast({ title: 'Could not remove', variant: 'destructive' }); else setItems(prev => prev.filter(i => i.id !== id))
  }

  const projectName = (id: string | null) => id ? projects.find(p => p.id === id)?.name || 'Project' : 'All chats'

  return <div className="space-y-4">
    <label className="block text-xs font-medium">Use for
      <select value={scope} onChange={e => setScope(e.target.value)} className="mt-1 block h-10 w-full rounded-md border border-input bg-background px-2 text-sm">
        <option value="">All chats</option>
        {projects.map(p => <option key={p.id} value={p.id}>Project: {p.name}</option>)}
      </select>
    </label>
    <form onSubmit={saveNote} className="space-y-2">
      <Input placeholder="Note title" value={title} onChange={e => setTitle(e.target.value)} maxLength={200} />
      <Textarea placeholder="Write anything Markus should know..." value={content} onChange={e => setContent(e.target.value)} rows={4} />
      <div className="flex gap-2">
        <Button type="submit" disabled={busy || !title.trim() || !content.trim()}>Save note</Button>
        <Button type="button" variant="outline" disabled={busy} className="gap-2" asChild>
          <label className="cursor-pointer">{busy ? <Loader2 className="animate-spin" /> : <Upload />}Upload file
            <input type="file" className="sr-only" accept=".pdf,.txt,.md,.csv,image/*" onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) void upload(f) }} />
          </label>
        </Button>
      </div>
    </form>
    <div className="space-y-1 border-t border-border pt-3">
      {items.length === 0 ? <p className="text-xs text-muted-foreground">Nothing saved yet.</p> : items.map(item => <div key={item.id} className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted">
        <div className="min-w-0 flex-1"><p className="truncate text-sm">{item.title}</p><p className="text-[11px] text-muted-foreground">{projectName(item.project_id)}</p></div>
        <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`Remove ${item.title}`} onClick={() => void remove(item.id)}><Trash2 /></Button>
      </div>)}
    </div>
  </div>
}
