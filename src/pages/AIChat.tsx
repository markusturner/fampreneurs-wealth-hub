import { useState, useRef, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Send, Bot, User, Loader2, Shield, Building2, FileText, Paperclip, Settings2, X, ChevronDown, Upload, Mic, Square, Plus, FolderOpen, MessageSquare, MoreHorizontal, Trash2, FolderPlus, ArrowLeft, PanelLeftOpen, Video } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/integrations/supabase/client'
import { useIsAdminOrOwner } from '@/hooks/useIsAdminOrOwner'
import { useAuth } from '@/contexts/AuthContext'
import ReactMarkdown from 'react-markdown'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

type Persona = 'rachel' | 'asset_protection' | 'business_structure' | 'trust_writer'

interface Message {
  id: string
  content: string
  role: 'user' | 'assistant'
  timestamp: Date
  attachments?: string[]
}

interface Conversation {
  id: string
  title: string
  persona: Persona
  project_id: string | null
  created_at: string
  updated_at: string
}

interface ChatProject {
  id: string
  name: string
  created_at: string
}

interface AIModel {
  id: string
  label: string
  description: string
}

interface PersonaSettings {
  instructions: string
  files: { name: string; type: string }[]
}

const AI_MODELS: AIModel[] = [
  { id: 'gpt-5', label: 'GPT-5', description: 'Powerful all-rounder' },
  { id: 'gpt-5-mini', label: 'GPT-5 Mini', description: 'Fast & cost-effective' },
  { id: 'gemini-flash', label: 'Gemini Flash', description: 'Fast, balanced responses' },
  { id: 'gemini-pro', label: 'Gemini Pro', description: 'Advanced reasoning & analysis' },
  { id: 'claude', label: 'Claude', description: 'Thoughtful & detailed' },
]

const PERSONAS: { id: Persona; label: string; icon: React.ElementType; description: string; color: string; activeColor: string }[] = [
  { id: 'rachel', label: 'Rachel', icon: Bot, description: 'General Family Office Director', color: '#ffb500', activeColor: '#ffb500' },
  { id: 'asset_protection', label: 'Asset Protection', icon: Shield, description: 'Trust docs & asset shielding', color: '#10b981', activeColor: '#10b981' },
  { id: 'business_structure', label: 'Biz Structure', icon: Building2, description: 'F.L.I.P. Formula™ guidance', color: '#6366f1', activeColor: '#6366f1' },
  { id: 'trust_writer', label: 'Trust Writer', icon: FileText, description: 'Draft trust clauses', color: '#ec4899', activeColor: '#ec4899' },
]

const PERSONA_GREETINGS: Record<Persona, string> = {
  rachel: "Hello! I'm Rachel, your Family Office AI assistant. How can I help you today?",
  asset_protection: "Welcome! I specialize in asset protection strategies and trust document guidance. What assets would you like to protect?",
  business_structure: "Hi! I'm your Business Structure Builder, powered by The F.L.I.P. Formula™. Let's optimize your business entities for maximum tax savings. What's your current setup?",
  trust_writer: "Hello! I help draft trust clauses and provisions for irrevocable trusts. What type of trust provision would you like to work on?",
}

const PRESET_PROMPTS: Record<Persona, { label: string; prompt: string }[]> = {
  rachel: [
    { label: '💬 I need help', prompt: '__i_need_help__' },
  ],
  asset_protection: [
    { label: '🛡️ Setup an asset protection trust', prompt: 'How can I setup an asset protection trust?' },
    { label: '🏦 Infinite banking concept', prompt: 'Can you explain the infinite banking concept?' },
    { label: '📜 Family constitution contents', prompt: 'What should I include within my family constitution?' },
  ],
  business_structure: [
    { label: '🚀 START', prompt: 'START' },
  ],
  trust_writer: [
    { label: '📝 Draft a clause or provision', prompt: 'Draft a clause or provision in my trust' },
  ],
}

const DEFAULT_PERSONA_SETTINGS: Record<Persona, PersonaSettings> = {
  rachel: { instructions: '', files: [] },
  asset_protection: { instructions: '', files: [] },
  business_structure: { instructions: '', files: [] },
  trust_writer: { instructions: '', files: [] },
}

export default function AIChat() {
  const [activePersona, setActivePersona] = useState<Persona>('rachel')
  const [selectedModel, setSelectedModel] = useState<string>('gpt-5')
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', content: PERSONA_GREETINGS.rachel, role: 'assistant', timestamp: new Date() }
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [personaSettings, setPersonaSettings] = useState<Record<Persona, PersonaSettings>>({ ...DEFAULT_PERSONA_SETTINGS })
  const [attachedFiles, setAttachedFiles] = useState<File[]>([])
  const [isRecording, setIsRecording] = useState(false)
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const chatFileRef = useRef<HTMLInputElement>(null)
  const settingsFileRef = useRef<HTMLInputElement>(null)
  const [settingsTab, setSettingsTab] = useState<string>('rachel')
  const { toast } = useToast()
  const { isAdminOrOwner } = useIsAdminOrOwner()
  const { profile, user } = useAuth()
  const displayName = profile?.display_name || profile?.first_name || ''
  const [workspaceVideoOpen, setWorkspaceVideoOpen] = useState(false)
  const [workspaceVideoUrl, setWorkspaceVideoUrl] = useState('')
  const [settingsLoaded, setSettingsLoaded] = useState(false)
  const [savingSettings, setSavingSettings] = useState(false)

  // Sidebar state
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [projects, setProjects] = useState<ChatProject[]>([])
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)
  const [newProjectName, setNewProjectName] = useState('')
  const [showNewProject, setShowNewProject] = useState(false)

  // Load conversations and projects
  useEffect(() => {
    if (user?.id) {
      loadConversations()
      loadProjects()
    }
  }, [user?.id])

  // Load persona settings from DB
  useEffect(() => {
    const loadSettings = async () => {
      const { data } = await supabase.from('ai_persona_settings').select('persona, instructions')
      if (data) {
        const loaded = { ...DEFAULT_PERSONA_SETTINGS }
        for (const row of data as any[]) {
          if (loaded[row.persona as Persona]) {
            loaded[row.persona as Persona].instructions = row.instructions || ''
          }
        }
        // Load files from storage for each persona
        for (const persona of ['rachel', 'asset_protection', 'business_structure', 'trust_writer'] as Persona[]) {
          const { data: files } = await supabase.storage.from('ai-persona-documents').list(persona)
          if (files && files.length > 0) {
            loaded[persona].files = files.map(f => ({ name: f.name, type: f.metadata?.mimetype || 'application/octet-stream' }))
          }
        }
        setPersonaSettings(loaded)
        setSettingsLoaded(true)
      }
    }
    loadSettings()
  }, [])

  // Load workspace video URL and auto-show for first-time visitors
  useEffect(() => {
    supabase.from('app_settings').select('workspace_video_url').single().then(({ data }) => {
      const url = (data as any)?.workspace_video_url
      if (url) {
        setWorkspaceVideoUrl(url)
        // Auto-open for users who haven't seen it yet
        const seenKey = `workspace_tutorial_seen_${user?.id || 'anon'}`
        if (!localStorage.getItem(seenKey)) {
          setWorkspaceVideoOpen(true)
        }
      }
    })
  }, [user?.id])

  const loadConversations = async () => {
    const { data } = await supabase
      .from('chat_conversations')
      .select('*')
      .eq('user_id', user!.id)
      .order('updated_at', { ascending: false })
      .limit(50)
    if (data) setConversations(data as any)
  }

  const loadProjects = async () => {
    const { data } = await supabase
      .from('chat_projects')
      .select('*')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false })
    if (data) setProjects(data as any)
  }

  const createNewChat = () => {
    setActiveConversationId(null)
    setMessages([
      { id: '1', content: PERSONA_GREETINGS[activePersona], role: 'assistant', timestamp: new Date() }
    ])
  }

  const loadConversation = async (conv: Conversation) => {
    setActiveConversationId(conv.id)
    setActivePersona(conv.persona as Persona)
    
    const { data } = await supabase
      .from('ai_chat_history')
      .select('*')
      .eq('conversation_id', conv.id)
      .order('created_at', { ascending: true })

    if (data && data.length > 0) {
      setMessages(data.map((m: any) => ({
        id: m.id,
        content: m.content,
        role: m.role as 'user' | 'assistant',
        timestamp: new Date(m.created_at)
      })))
    } else {
      setMessages([
        { id: '1', content: PERSONA_GREETINGS[conv.persona as Persona], role: 'assistant', timestamp: new Date() }
      ])
    }
  }

  const createProject = async () => {
    if (!newProjectName.trim() || !user?.id) return
    const { data, error } = await supabase
      .from('chat_projects')
      .insert({ user_id: user.id, name: newProjectName.trim() })
      .select()
      .single()
    if (!error && data) {
      setProjects(prev => [data as any, ...prev])
      setNewProjectName('')
      setShowNewProject(false)
      toast({ title: 'Project created' })
    }
  }

  const moveToProject = async (conversationId: string, projectId: string | null) => {
    await supabase
      .from('chat_conversations')
      .update({ project_id: projectId })
      .eq('id', conversationId)
    loadConversations()
    toast({ title: projectId ? 'Moved to project' : 'Removed from project' })
  }

  const deleteConversation = async (convId: string) => {
    await supabase.from('chat_conversations').delete().eq('id', convId)
    if (activeConversationId === convId) createNewChat()
    setConversations(prev => prev.filter(c => c.id !== convId))
  }

  const deleteProject = async (projectId: string) => {
    // Unlink conversations first
    await supabase.from('chat_conversations').update({ project_id: null }).eq('project_id', projectId)
    await supabase.from('chat_projects').delete().eq('id', projectId)
    setProjects(prev => prev.filter(p => p.id !== projectId))
    loadConversations()
    toast({ title: 'Project deleted' })
  }

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight
    }
  }, [messages])

  const switchPersona = useCallback((persona: Persona) => {
    setActivePersona(persona)
    setActiveConversationId(null)
    setMessages([
      { id: Date.now().toString(), content: PERSONA_GREETINGS[persona], role: 'assistant', timestamp: new Date() }
    ])
  }, [])

  const sendMessage = async (text?: string) => {
    const messageText = text || input.trim()
    if (!messageText || isLoading) return

    // Special "I need help" flow: user message first, then Rachel reply, no AI call
    if (messageText === '__i_need_help__') {
      setMessages([
        { id: Date.now().toString(), content: 'I need help', role: 'user', timestamp: new Date() },
        { id: (Date.now() + 1).toString(), content: 'Of course! How can I help you today? Please describe what you need assistance with and I\'ll do my best to guide you.', role: 'assistant', timestamp: new Date() }
      ])
      setInput('')
      return
    }
    
    const attachmentNames = attachedFiles.map(f => f.name)
    const userMessage: Message = { 
      id: Date.now().toString(), content: messageText, role: 'user', timestamp: new Date(),
      attachments: attachmentNames.length > 0 ? attachmentNames : undefined
    }
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setAttachedFiles([])
    setIsLoading(true)

    // Create conversation if needed
    let convId = activeConversationId
    if (!convId && user?.id) {
      const title = messageText.substring(0, 50) + (messageText.length > 50 ? '...' : '')
      const { data } = await supabase
        .from('chat_conversations')
        .insert({ user_id: user.id, title, persona: activePersona })
        .select()
        .single()
      if (data) {
        convId = (data as any).id
        setActiveConversationId(convId)
        setConversations(prev => [data as any, ...prev])
      }
    }

    try {
      const personaInstructions = personaSettings[activePersona]?.instructions || ''
      const { data, error } = await supabase.functions.invoke('ai-chat', {
        body: { message: messageText, persona: activePersona, instructions: personaInstructions }
      })
      if (error) throw error
      if (data?.error) {
        toast({ title: "Error", description: data.error, variant: "destructive" })
        return
      }
      
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        content: data.response,
        role: 'assistant',
        timestamp: new Date()
      }])

      // Save to conversation
      if (convId) {
        await supabase.from('ai_chat_history').insert([
          { user_id: user!.id, role: 'user', content: messageText, conversation_id: convId },
          { user_id: user!.id, role: 'assistant', content: data.response, conversation_id: convId }
        ])
        // Update conversation title and timestamp
        await supabase.from('chat_conversations').update({ updated_at: new Date().toISOString() }).eq('id', convId)
      }
    } catch (error) {
      console.error('Error sending message:', error)
      toast({ title: "Error", description: "Failed to send message. Please try again.", variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  const handleChatFileAttach = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setAttachedFiles(prev => [...prev, ...Array.from(e.target.files!)])
  }

  const handleSettingsFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const persona = settingsTab as Persona
      const filesToUpload = Array.from(e.target.files)
      for (const file of filesToUpload) {
        const path = `${persona}/${file.name}`
        const { error } = await supabase.storage.from('ai-persona-documents').upload(path, file, { upsert: true })
        if (error) {
          toast({ title: 'Upload failed', description: error.message, variant: 'destructive' })
          continue
        }
      }
      const newFiles = filesToUpload.map(f => ({ name: f.name, type: f.type }))
      setPersonaSettings(prev => ({
        ...prev,
        [persona]: { ...prev[persona], files: [...prev[persona].files, ...newFiles] }
      }))
      toast({ title: 'Files uploaded', description: `${filesToUpload.length} file(s) uploaded and saved` })
    }
  }

  const removeSettingsFile = async (persona: Persona, index: number) => {
    const file = personaSettings[persona].files[index]
    await supabase.storage.from('ai-persona-documents').remove([`${persona}/${file.name}`])
    setPersonaSettings(prev => ({
      ...prev,
      [persona]: { ...prev[persona], files: prev[persona].files.filter((_, i) => i !== index) }
    }))
  }

  const updatePersonaInstructions = (persona: Persona, instructions: string) => {
    setPersonaSettings(prev => ({ ...prev, [persona]: { ...prev[persona], instructions } }))
  }

  const saveAllSettings = async () => {
    setSavingSettings(true)
    try {
      for (const persona of ['rachel', 'asset_protection', 'business_structure', 'trust_writer'] as Persona[]) {
        await supabase.from('ai_persona_settings')
          .update({ instructions: personaSettings[persona].instructions, updated_by: user?.id, updated_at: new Date().toISOString() })
          .eq('persona', persona)
      }
      toast({ title: 'Settings saved' })
      setSettingsOpen(false)
    } catch (err) {
      toast({ title: 'Error saving settings', variant: 'destructive' })
    } finally {
      setSavingSettings(false)
    }
  }

  const toggleVoiceInput = () => {
    if (isRecording) {
      if (mediaRecorder) (mediaRecorder as any).stop?.()
      setIsRecording(false)
      setMediaRecorder(null)
      return
    }
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) {
      toast({ title: 'Not supported', description: 'Try Chrome.', variant: 'destructive' })
      return
    }
    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'
    let finalTranscript = ''
    recognition.onresult = (event: any) => {
      let interim = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) finalTranscript += event.results[i][0].transcript + ' '
        else interim += event.results[i][0].transcript
      }
      setInput(finalTranscript + interim)
    }
    recognition.onerror = () => setIsRecording(false)
    recognition.onend = () => { setIsRecording(false); if (finalTranscript.trim()) setInput(finalTranscript.trim()) }
    recognition.start()
    setIsRecording(true)
    setMediaRecorder({ stop: () => recognition.stop() } as any)
  }

  const currentPersona = PERSONAS.find(p => p.id === activePersona)!
  const currentModel = AI_MODELS.find(m => m.id === selectedModel)!
  const hasConversation = messages.length > 1
  const presets = PRESET_PROMPTS[activePersona]

  // Group conversations by project
  const unfiledConversations = conversations.filter(c => !c.project_id)
  const projectConversations = (projectId: string) => conversations.filter(c => c.project_id === projectId)

  const renderInputBar = () => (
    <div className="rounded-xl border bg-card p-3">
      {attachedFiles.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {attachedFiles.map((f, i) => (
            <Badge key={i} variant="secondary" className="gap-1 text-xs">
              <Paperclip className="h-3 w-3" />{f.name}
              <button onClick={() => setAttachedFiles(prev => prev.filter((_, j) => j !== i))}><X className="h-3 w-3" /></button>
            </Badge>
          ))}
        </div>
      )}
      <textarea
        ref={(el) => {
          if (el) {
            el.style.height = '0px';
            el.style.height = Math.max(36, Math.min(el.scrollHeight, 200)) + 'px';
          }
        }}
        placeholder="Message AI... (Shift+Enter for new line)"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyPress={handleKeyPress}
        disabled={isLoading}
        rows={1}
        className="w-full resize-none border-0 shadow-none focus-visible:ring-0 focus-visible:outline-none text-sm mb-3 bg-muted rounded-lg px-3 py-2 overflow-y-auto"
        style={{ minHeight: '36px', maxHeight: '200px' }}
      />
      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-1 items-center overflow-x-auto scrollbar-hide flex-1 min-w-0">
          <input ref={chatFileRef} type="file" multiple className="hidden" onChange={handleChatFileAttach} />
          <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0" onClick={() => chatFileRef.current?.click()}>
            <Paperclip className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className={`h-7 w-7 flex-shrink-0 ${isRecording ? 'text-destructive bg-destructive/10' : ''}`} onClick={toggleVoiceInput}>
            {isRecording ? <Square className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
          </Button>
          {PERSONAS.map((p) => {
            const isActive = activePersona === p.id;
            return (
              <button
                key={p.id}
                className="flex items-center gap-1.5 rounded-full transition-all duration-300 flex-shrink-0 border-2 h-7"
                style={isActive
                  ? { backgroundColor: p.activeColor, borderColor: p.activeColor, color: '#fff', padding: '0 10px' }
                  : { borderColor: (p.color || '#888') + '40', color: 'inherit', padding: '0 6px' }
                }
                onClick={() => switchPersona(p.id)}
                title={p.description}
              >
                <p.icon className="h-3.5 w-3.5 flex-shrink-0" />
                {isActive && (
                  <span className="text-[10px] sm:text-xs font-semibold whitespace-nowrap animate-in slide-in-from-left-2 fade-in duration-300">
                    {p.label}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <Button onClick={() => sendMessage()} disabled={!input.trim() || isLoading} size="icon" className="h-8 w-8 rounded-full flex-shrink-0">
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )

  const renderSidebar = () => (
    <>
      {/* Mobile overlay backdrop */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/40 z-40 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}
      <div className={`${sidebarOpen ? 'fixed inset-y-0 left-0 z-50 w-72 md:relative md:z-auto md:w-64' : 'w-0'} transition-all duration-200 overflow-hidden border-r bg-card md:bg-muted/30 flex-shrink-0 h-full`}>
      <div className="w-72 md:w-64 h-full flex flex-col">
        <div className="p-3 border-b flex items-center justify-between">
          <span className="text-sm font-semibold">Chat History</span>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowNewProject(true)} title="New Project">
              <FolderPlus className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={createNewChat} title="New Chat">
              <Plus className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSidebarOpen(false)} title="Collapse sidebar">
              <ArrowLeft className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {showNewProject && (
          <div className="p-2 border-b flex gap-1">
            <Input
              value={newProjectName}
              onChange={e => setNewProjectName(e.target.value)}
              placeholder="Project name..."
              className="h-7 text-xs"
              onKeyDown={e => e.key === 'Enter' && createProject()}
            />
            <Button size="sm" className="h-7 text-xs px-2" onClick={createProject}>Add</Button>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setShowNewProject(false)}>
              <X className="h-3 w-3" />
            </Button>
          </div>
        )}

        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {/* Projects */}
            {projects.map(proj => (
              <div key={proj.id}>
                <div className="flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-muted-foreground">
                  <FolderOpen className="h-3 w-3" />
                  <span className="flex-1 truncate">{proj.name}</span>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-5 w-5 opacity-0 group-hover:opacity-100">
                        <MoreHorizontal className="h-3 w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-32">
                      <DropdownMenuItem onClick={() => deleteProject(proj.id)} className="text-destructive text-xs">
                        <Trash2 className="h-3 w-3 mr-1" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                {projectConversations(proj.id).map(conv => (
                  <ConversationItem
                    key={conv.id}
                    conv={conv}
                    active={activeConversationId === conv.id}
                    onClick={() => loadConversation(conv)}
                    onDelete={() => deleteConversation(conv.id)}
                    onMove={(pid) => moveToProject(conv.id, pid)}
                    projects={projects}
                    className="pl-6"
                  />
                ))}
              </div>
            ))}

            {/* Unfiled conversations */}
            {unfiledConversations.length > 0 && (
              <>
                {projects.length > 0 && (
                  <p className="px-2 py-1 text-[10px] font-medium text-muted-foreground uppercase mt-2">Recent</p>
                )}
                {unfiledConversations.map(conv => (
                  <ConversationItem
                    key={conv.id}
                    conv={conv}
                    active={activeConversationId === conv.id}
                    onClick={() => loadConversation(conv)}
                    onDelete={() => deleteConversation(conv.id)}
                    onMove={(pid) => moveToProject(conv.id, pid)}
                    projects={projects}
                  />
                ))}
              </>
            )}

            {conversations.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-6">No chats yet. Start a conversation!</p>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
    </>
  )

  return (
    <div className="flex h-[calc(100vh-3.5rem)] md:h-screen">
      {/* Sidebar */}
      {renderSidebar()}

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 py-2 border-b">
          <div className="flex items-center gap-2">
            {!sidebarOpen && (
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSidebarOpen(true)} title="Open chat history">
                <PanelLeftOpen className="h-4 w-4" />
              </Button>
            )}
            <img src="/lovable-uploads/f9de210b-406b-4d7d-9a44-c0e6e5114825.png" alt="TruHeirs" className="w-6 h-6 object-contain" />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-1.5 text-sm font-medium">
                  {currentModel.label}
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                {AI_MODELS.map(model => (
                  <DropdownMenuItem key={model.id} onClick={() => setSelectedModel(model.id)} className={selectedModel === model.id ? 'bg-accent' : ''}>
                    <div>
                      <p className="text-sm font-medium">{model.label}</p>
                      <p className="text-xs text-muted-foreground">{model.description}</p>
                    </div>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="flex items-center gap-1">
            {isRecording && (
              <Badge variant="destructive" className="text-xs animate-pulse gap-1">
                <Mic className="h-3 w-3" /> Recording...
              </Badge>
            )}
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setWorkspaceVideoOpen(true)} title="Workspace Tutorial Video">
              <Video className="h-4 w-4" />
            </Button>
            {isAdminOrOwner && (
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSettingsOpen(true)}>
                <Settings2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 flex flex-col items-center justify-center overflow-hidden">
          {!hasConversation ? (
             <div className="flex flex-col items-center justify-center flex-1 w-full max-w-2xl mx-auto px-4 gap-4">
               <div className="w-full gradient-hero rounded-2xl p-6 sm:p-8 text-white relative overflow-hidden">
                <div className="absolute inset-0 bg-white/5 backdrop-blur-sm rounded-2xl" />
                <div className="relative z-10">
                   <h1 className="text-2xl sm:text-3xl font-bold leading-tight">
                     Welcome back{displayName ? `, ${displayName.split(' ')[0]}!` : '!'}
                   </h1>
                  <p className="text-white/70 mt-1 text-sm sm:text-base">
                    What would you like to create today?
                  </p>
                </div>
              </div>
              
              <div className={`w-full max-w-2xl grid ${presets.length === 1 ? 'grid-cols-1' : presets.length === 2 ? 'grid-cols-2' : 'grid-cols-1 sm:grid-cols-3'} gap-2`}>
                {presets.map((preset, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(preset.prompt)}
                    className="text-left p-3 rounded-xl border bg-card hover:bg-muted/50 transition-colors text-sm"
                    disabled={isLoading}
                  >
                    <span className="font-medium">{preset.label}</span>
                  </button>
                ))}
              </div>
              
              <div className="w-full max-w-2xl">
                {renderInputBar()}
              </div>
            </div>
          ) : (
            <>
              <ScrollArea className="flex-1 w-full" ref={scrollAreaRef}>
                <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
                  {messages.map((message) => (
                    <div key={message.id} className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      {message.role === 'assistant' && (
                        <Avatar className="h-8 w-8 mt-0.5 flex-shrink-0">
                          <AvatarFallback style={{ backgroundColor: currentPersona.color }}>
                            <currentPersona.icon className="h-4 w-4 text-white" />
                          </AvatarFallback>
                        </Avatar>
                      )}
                      <div className={`max-w-[80%] rounded-lg px-4 py-3 text-sm ${message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                        {message.attachments && (
                          <div className="flex flex-wrap gap-1 mb-2">
                            {message.attachments.map((a, i) => (
                              <span key={i} className="text-[10px] bg-background/20 rounded px-1.5 py-0.5 flex items-center gap-1">
                                <Paperclip className="h-2.5 w-2.5" />{a}
                              </span>
                            ))}
                          </div>
                        )}
                        {message.role === 'assistant' ? (
                          <div className="prose prose-sm dark:prose-invert max-w-none [&>*]:m-0 [&>*+*]:mt-2">
                            <ReactMarkdown>{message.content}</ReactMarkdown>
                          </div>
                        ) : message.content}
                      </div>
                      {message.role === 'user' && (
                        <Avatar className="h-8 w-8 mt-0.5 flex-shrink-0">
                          <AvatarFallback className="bg-secondary"><User className="h-4 w-4" /></AvatarFallback>
                        </Avatar>
                      )}
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex gap-3 justify-start">
                      <Avatar className="h-8 w-8 mt-0.5">
                        <AvatarFallback style={{ backgroundColor: currentPersona.color }}>
                          <currentPersona.icon className="h-4 w-4 text-white" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="bg-muted rounded-lg px-4 py-3"><Loader2 className="h-4 w-4 animate-spin" /></div>
                    </div>
                  )}
                </div>
              </ScrollArea>
              <div className="w-full max-w-2xl mx-auto px-4 pb-4">
                {renderInputBar()}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Settings Dialog */}
      {isAdminOrOwner && (
        <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
          <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-base">Project Settings</DialogTitle>
              <DialogDescription>Configure AI models and persona instructions.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label className="text-xs font-semibold">Model</Label>
                <div className="mt-1 space-y-0.5">
                  {AI_MODELS.map(model => (
                    <button key={model.id} onClick={() => setSelectedModel(model.id)}
                      className={`w-full text-left px-2.5 py-1.5 rounded-md text-xs transition-colors ${selectedModel === model.id ? 'bg-primary/10 border border-primary/30' : 'hover:bg-muted/50'}`}>
                      <span className="font-medium">{model.label}</span>
                      <span className="text-muted-foreground ml-1.5">{model.description}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-xs font-semibold mb-1.5 block">Persona Instructions & Files</Label>
                <Tabs value={settingsTab} onValueChange={setSettingsTab}>
                  <TabsList className="w-full flex overflow-x-auto scrollbar-hide h-8">
                    {PERSONAS.map(p => (
                      <TabsTrigger key={p.id} value={p.id} className="text-[10px] gap-1 px-2 py-1 flex-1 min-w-0" title={p.label}>
                        <p.icon className="h-3 w-3 flex-shrink-0" />
                      </TabsTrigger>
                    ))}
                  </TabsList>
                  {PERSONAS.map(p => (
                    <TabsContent key={p.id} value={p.id} className="space-y-2 mt-2">
                      <div>
                        <Label className="text-[10px] text-muted-foreground">{p.label} Instructions</Label>
                        <Textarea value={personaSettings[p.id].instructions} onChange={e => updatePersonaInstructions(p.id, e.target.value)}
                          placeholder={`Custom instructions for ${p.label}...`} rows={2} className="text-xs" />
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <Label className="text-[10px] text-muted-foreground">{p.label} Files</Label>
                          <input ref={settingsFileRef} type="file" multiple className="hidden" onChange={handleSettingsFileUpload} />
                          <Button variant="outline" size="sm" className="h-6 text-[10px] px-2" onClick={() => { setSettingsTab(p.id); settingsFileRef.current?.click() }}>Add</Button>
                        </div>
                        {personaSettings[p.id].files.length === 0 ? (
                          <div className="border border-dashed border-border rounded-md p-3 text-center">
                            <Upload className="h-4 w-4 mx-auto mb-0.5 text-muted-foreground" />
                            <p className="text-[10px] text-muted-foreground">No files uploaded</p>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            {personaSettings[p.id].files.map((f, i) => (
                              <div key={i} className="flex items-center gap-1.5 p-1.5 rounded-md bg-muted/50">
                                <FileText className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                                <span className="text-[10px] truncate flex-1">{f.name}</span>
                                <Button variant="ghost" size="icon" className="h-4 w-4" onClick={() => removeSettingsFile(p.id, i)}>
                                  <X className="h-2.5 w-2.5" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </TabsContent>
                  ))}
                </Tabs>
              </div>
              <Button className="w-full h-8 text-xs transition-colors" style={{ backgroundColor: '#ffb500', color: '#290a52' }} onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#2eb2ff'; e.currentTarget.style.color = '#290a52'; }} onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#ffb500'; e.currentTarget.style.color = '#290a52'; }} onClick={saveAllSettings} disabled={savingSettings}>{savingSettings ? 'Saving...' : 'Save Settings'}</Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Workspace Tutorial Video Dialog */}
      <Dialog open={workspaceVideoOpen} onOpenChange={(open) => {
        setWorkspaceVideoOpen(open)
        if (!open) {
          const seenKey = `workspace_tutorial_seen_${user?.id || 'anon'}`
          localStorage.setItem(seenKey, 'true')
        }
      }}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Workspace Tutorial</DialogTitle>
            <DialogDescription>Learn how to use the AI Chat and Workspace tools.</DialogDescription>
          </DialogHeader>
          {workspaceVideoUrl ? (
            <div className="aspect-video w-full">
              <iframe
                src={workspaceVideoUrl}
                className="w-full h-full rounded-lg"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : (
            <div className="aspect-video w-full bg-muted rounded-lg flex items-center justify-center">
              <p className="text-muted-foreground text-sm">No workspace tutorial video has been set yet. Admins can add one in Admin Settings → Tutorial Video.</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Conversation list item component
function ConversationItem({ conv, active, onClick, onDelete, onMove, projects, className }: {
  conv: Conversation
  active: boolean
  onClick: () => void
  onDelete: () => void
  onMove: (projectId: string | null) => void
  projects: ChatProject[]
  className?: string
}) {
  const persona = PERSONAS.find(p => p.id === conv.persona)

  return (
    <div
      className={`group flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer text-xs transition-colors ${active ? 'bg-accent/20 text-accent' : 'hover:bg-muted/60'} ${className || ''}`}
      onClick={onClick}
    >
      {persona && <persona.icon className="h-3 w-3 flex-shrink-0" style={{ color: persona.color }} />}
      <span className="flex-1 truncate">{conv.title}</span>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-5 w-5 opacity-0 group-hover:opacity-100 flex-shrink-0" onClick={e => e.stopPropagation()}>
            <MoreHorizontal className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          {projects.length > 0 && (
            <>
              {projects.map(p => (
                <DropdownMenuItem key={p.id} onClick={(e) => { e.stopPropagation(); onMove(p.id) }} className="text-xs">
                  <FolderOpen className="h-3 w-3 mr-1" /> Move to {p.name}
                </DropdownMenuItem>
              ))}
              {conv.project_id && (
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onMove(null) }} className="text-xs">
                  Remove from project
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
            </>
          )}
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDelete() }} className="text-destructive text-xs">
            <Trash2 className="h-3 w-3 mr-1" /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
