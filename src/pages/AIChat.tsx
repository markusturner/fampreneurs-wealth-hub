import { useState, useRef, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Send, Bot, User, Loader2, Shield, Building2, FileText, Paperclip, Settings2, X, ChevronDown, Upload, Mic, MicOff, Square } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/integrations/supabase/client'
import ReactMarkdown from 'react-markdown'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
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

const PERSONAS: { id: Persona; label: string; icon: React.ElementType; description: string }[] = [
  { id: 'rachel', label: 'Rachel', icon: Bot, description: 'General Family Office Director' },
  { id: 'asset_protection', label: 'Asset Protection', icon: Shield, description: 'Trust docs & asset shielding' },
  { id: 'business_structure', label: 'Biz Structure', icon: Building2, description: 'F.L.I.P. Formula™ guidance' },
  { id: 'trust_writer', label: 'Trust Writer', icon: FileText, description: 'Draft trust clauses' },
]

const PERSONA_GREETINGS: Record<Persona, string> = {
  rachel: "Hello! I'm Rachel, your Family Office AI assistant. How can I help you today?",
  asset_protection: "Welcome! I specialize in asset protection strategies and trust document guidance. What assets would you like to protect?",
  business_structure: "Hi! I'm your Business Structure Builder, powered by The F.L.I.P. Formula™. Let's optimize your business entities for maximum tax savings. What's your current setup?",
  trust_writer: "Hello! I help draft trust clauses and provisions for irrevocable trusts. What type of trust provision would you like to work on?",
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

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight
    }
  }, [messages])

  const switchPersona = useCallback((persona: Persona) => {
    setActivePersona(persona)
    setMessages([
      { id: Date.now().toString(), content: PERSONA_GREETINGS[persona], role: 'assistant', timestamp: new Date() }
    ])
  }, [])

  const sendMessage = async (text?: string) => {
    const messageText = text || input.trim()
    if (!messageText || isLoading) return
    
    const attachmentNames = attachedFiles.map(f => f.name)
    const userMessage: Message = { 
      id: Date.now().toString(), 
      content: messageText, 
      role: 'user', 
      timestamp: new Date(),
      attachments: attachmentNames.length > 0 ? attachmentNames : undefined
    }
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setAttachedFiles([])
    setIsLoading(true)

    try {
      const personaInstructions = personaSettings[activePersona]?.instructions || ''
      const { data, error } = await supabase.functions.invoke('ai-chat', {
        body: { message: messageText, persona: activePersona, model: selectedModel, instructions: personaInstructions }
      })
      if (error) throw error
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        content: data.response,
        role: 'assistant',
        timestamp: new Date()
      }])
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
    const files = e.target.files
    if (files) {
      setAttachedFiles(prev => [...prev, ...Array.from(files)])
    }
  }

  const handleSettingsFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files) {
      const newFiles = Array.from(files).map(f => ({ name: f.name, type: f.type }))
      setPersonaSettings(prev => ({
        ...prev,
        [settingsTab]: {
          ...prev[settingsTab as Persona],
          files: [...prev[settingsTab as Persona].files, ...newFiles]
        }
      }))
      toast({ title: 'Files added', description: `${files.length} file(s) added to ${PERSONAS.find(p => p.id === settingsTab)?.label}` })
    }
  }

  const removeSettingsFile = (persona: Persona, index: number) => {
    setPersonaSettings(prev => ({
      ...prev,
      [persona]: {
        ...prev[persona],
        files: prev[persona].files.filter((_, i) => i !== index)
      }
    }))
  }

  const updatePersonaInstructions = (persona: Persona, instructions: string) => {
    setPersonaSettings(prev => ({
      ...prev,
      [persona]: { ...prev[persona], instructions }
    }))
  }

  // Audio recording and transcription
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })
      const chunks: BlobPart[] = []

      recorder.ondataavailable = (e) => chunks.push(e.data)
      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop())
        const blob = new Blob(chunks, { type: 'audio/webm' })
        await transcribeAudio(blob)
      }

      recorder.start()
      setMediaRecorder(recorder)
      setIsRecording(true)
    } catch (err) {
      console.error('Microphone access denied:', err)
      toast({ title: 'Microphone Error', description: 'Please allow microphone access to use voice input.', variant: 'destructive' })
    }
  }

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop()
      setIsRecording(false)
      setMediaRecorder(null)
    }
  }

  const transcribeAudio = async (blob: Blob) => {
    try {
      // Use browser's Web Speech API for transcription
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      if (!SpeechRecognition) {
        // Fallback: just add audio as attachment note
        toast({ title: 'Speech recognition not supported', description: 'Your browser does not support speech recognition. Try Chrome.', variant: 'destructive' })
        return
      }
      toast({ title: 'Processing audio...', description: 'Transcribing your voice input.' })
      // Actually use a simpler approach: create an audio element and use recognition
      // For real-time, we'll use the SpeechRecognition API directly instead
    } catch (error) {
      console.error('Transcription error:', error)
    }
  }

  // Use Web Speech API for real-time voice input
  const toggleVoiceInput = () => {
    if (isRecording) {
      stopRecording()
      return
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) {
      toast({ title: 'Not supported', description: 'Speech recognition is not supported in this browser. Try Chrome.', variant: 'destructive' })
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
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript + ' '
        } else {
          interim += event.results[i][0].transcript
        }
      }
      setInput(finalTranscript + interim)
    }

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error)
      setIsRecording(false)
    }

    recognition.onend = () => {
      setIsRecording(false)
      if (finalTranscript.trim()) {
        setInput(finalTranscript.trim())
      }
    }

    recognition.start()
    setIsRecording(true)

    // Store reference to stop later
    setMediaRecorder({ stop: () => recognition.stop() } as any)
  }

  const currentPersona = PERSONAS.find(p => p.id === activePersona)!
  const currentModel = AI_MODELS.find(m => m.id === selectedModel)!
  const hasConversation = messages.length > 1

  const renderInputBar = () => (
    <div className="rounded-xl border border-white/20 dark:border-white/10 bg-white/10 dark:bg-[#2f2f2f] p-3">
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
      <Input
        placeholder="Message AI... (Shift+Enter for new line)"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyPress={handleKeyPress}
        disabled={isLoading}
        className="border-0 shadow-none focus-visible:ring-0 text-sm mb-3"
      />
      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-1 sm:gap-2 flex-wrap items-center">
          <input ref={chatFileRef} type="file" multiple className="hidden" onChange={handleChatFileAttach} />
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => chatFileRef.current?.click()}>
            <Paperclip className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={`h-7 w-7 ${isRecording ? 'text-destructive bg-destructive/10' : ''}`}
            onClick={toggleVoiceInput}
          >
            {isRecording ? <Square className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
          </Button>
          {PERSONAS.map((p) => (
            <Button key={p.id} variant={activePersona === p.id ? 'default' : 'outline'} size="sm" className="h-7 text-[10px] sm:text-xs rounded-full gap-1" onClick={() => switchPersona(p.id)} title={p.description}>
              <p.icon className="h-3 w-3" />
              <span className="hidden sm:inline">{p.label}</span>
            </Button>
          ))}
        </div>
        <Button onClick={() => sendMessage()} disabled={!input.trim() || isLoading} size="icon" className="h-8 w-8 rounded-full flex-shrink-0">
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] md:h-screen bg-[#290a52] text-white dark:bg-[#212121] dark:text-gray-100">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/10 dark:border-white/10">
        <div className="flex items-center gap-2">
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
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSettingsOpen(true)}>
            <Settings2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center overflow-hidden">
        {!hasConversation ? (
          <div className="flex flex-col items-center justify-center flex-1 w-full max-w-2xl mx-auto px-4">
            <div className="mb-6">
              <img src="/lovable-uploads/f9de210b-406b-4d7d-9a44-c0e6e5114825.png" alt="TruHeirs" className="w-12 h-12 object-contain" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold mb-2 text-center">What would you like to create today?</h1>
            <p className="text-white/60 dark:text-gray-400 text-center mb-8 max-w-md text-sm">
              Your AI-powered assistant for building your family business.
            </p>
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
                        <AvatarFallback style={{ backgroundColor: '#ffb500' }}>
                          <currentPersona.icon className="h-4 w-4" style={{ color: '#290a52' }} />
                        </AvatarFallback>
                      </Avatar>
                    )}
                    <div className={`max-w-[80%] rounded-lg px-4 py-3 text-sm ${message.role === 'user' ? 'bg-[#ffb500] text-[#290a52] dark:bg-primary dark:text-primary-foreground' : 'bg-white/10 dark:bg-[#2f2f2f]'}`}>
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
                      <AvatarFallback style={{ backgroundColor: '#ffb500' }}>
                        <Bot className="h-4 w-4" style={{ color: '#290a52' }} />
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

      {/* Settings Dialog - Per Persona */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Project Settings</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-semibold">Model</Label>
              <div className="space-y-1 mt-1">
                {AI_MODELS.map(model => (
                  <button
                    key={model.id}
                    onClick={() => setSelectedModel(model.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                      selectedModel === model.id ? 'bg-primary/10 border border-primary/30' : 'hover:bg-muted/50'
                    }`}
                  >
                    <span className="font-medium">{model.label}</span>
                    <span className="text-xs text-muted-foreground ml-2">{model.description}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-sm font-semibold mb-2 block">Persona Instructions & Files</Label>
              <Tabs value={settingsTab} onValueChange={setSettingsTab}>
                <TabsList className="w-full grid grid-cols-4">
                  {PERSONAS.map(p => (
                    <TabsTrigger key={p.id} value={p.id} className="text-xs gap-1">
                      <p.icon className="h-3 w-3" />
                      <span className="hidden sm:inline">{p.label}</span>
                    </TabsTrigger>
                  ))}
                </TabsList>
                {PERSONAS.map(p => (
                  <TabsContent key={p.id} value={p.id} className="space-y-3 mt-3">
                    <div>
                      <Label className="text-xs text-muted-foreground">{p.label} Instructions</Label>
                      <p className="text-xs text-muted-foreground mb-1">Customize how this persona responds.</p>
                      <Textarea
                        value={personaSettings[p.id].instructions}
                        onChange={e => updatePersonaInstructions(p.id, e.target.value)}
                        placeholder={`Custom instructions for ${p.label}...`}
                        rows={3}
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label className="text-xs text-muted-foreground">{p.label} Files</Label>
                        <input ref={settingsFileRef} type="file" multiple className="hidden" onChange={handleSettingsFileUpload} />
                        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => { setSettingsTab(p.id); settingsFileRef.current?.click() }}>Add</Button>
                      </div>
                      {personaSettings[p.id].files.length === 0 ? (
                        <div className="border-2 border-dashed border-border rounded-lg p-4 text-center">
                          <Upload className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                          <p className="text-xs text-muted-foreground">No files uploaded</p>
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          {personaSettings[p.id].files.map((f, i) => (
                            <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                              <FileText className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                              <span className="text-xs truncate flex-1">{f.name}</span>
                              <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => removeSettingsFile(p.id, i)}>
                                <X className="h-3 w-3" />
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

            <Button className="w-full" onClick={() => { setSettingsOpen(false); toast({ title: 'Settings saved' }) }}>Save Settings</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
