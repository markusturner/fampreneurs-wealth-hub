import { useState, useRef, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Send, Bot, User, Loader2, Shield, Building2, FileText, Sparkles } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/integrations/supabase/client'
import ReactMarkdown from 'react-markdown'

type Persona = 'rachel' | 'asset_protection' | 'business_structure' | 'trust_writer'

interface Message {
  id: string
  content: string
  role: 'user' | 'assistant'
  timestamp: Date
}

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

const QUICK_PROMPTS = [
  { emoji: '🎯', label: 'Help me find my niche' },
  { emoji: '📋', label: 'Review my offer' },
  { emoji: '📅', label: 'Create a content plan' },
]

export default function AIChat() {
  const [activePersona, setActivePersona] = useState<Persona>('rachel')
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', content: PERSONA_GREETINGS.rachel, role: 'assistant', timestamp: new Date() }
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
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
    const userMessage: Message = { id: Date.now().toString(), content: messageText, role: 'user', timestamp: new Date() }
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      const { data, error } = await supabase.functions.invoke('ai-chat', {
        body: { message: messageText, persona: activePersona }
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

  const currentPersona = PERSONAS.find(p => p.id === activePersona)!
  const hasConversation = messages.length > 1

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] md:h-screen">
      {/* Main content area */}
      <div className="flex-1 flex flex-col items-center justify-center overflow-hidden">
        {!hasConversation ? (
          /* Empty state - centered prompt */
          <div className="flex flex-col items-center justify-center flex-1 w-full max-w-2xl mx-auto px-4">
            {/* Logo */}
            <div className="mb-6">
              <img 
                src="/lovable-uploads/f9de210b-406b-4d7d-9a44-c0e6e5114825.png" 
                alt="TruHeirs" 
                className="w-12 h-12 object-contain"
              />
            </div>

            <h1 className="text-2xl font-bold mb-2">What would you like to create today?</h1>
            <p className="text-muted-foreground text-center mb-8 max-w-md">
              Your AI-powered assistant for building your family business. Ask me anything about content, strategy, or productivity.
            </p>

            {/* Quick prompts */}
            <div className="flex flex-wrap justify-center gap-3 mb-8">
              {QUICK_PROMPTS.map((prompt) => (
                <Button
                  key={prompt.label}
                  variant="outline"
                  className="gap-2 rounded-full"
                  onClick={() => sendMessage(prompt.label)}
                >
                  <span>{prompt.emoji}</span>
                  {prompt.label}
                </Button>
              ))}
            </div>

            {/* Input box */}
            <div className="w-full max-w-2xl">
              <div className="rounded-xl border bg-card p-3">
                <Input
                  placeholder="Message AI... (Shift+Enter for new line)"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  disabled={isLoading}
                  className="border-0 shadow-none focus-visible:ring-0 text-sm mb-3"
                />
                <div className="flex items-center justify-between">
                  <div className="flex gap-2 flex-wrap">
                    {PERSONAS.map((p) => (
                      <Button
                        key={p.id}
                        variant={activePersona === p.id ? 'default' : 'outline'}
                        size="sm"
                        className="h-7 text-xs rounded-full gap-1"
                        onClick={() => switchPersona(p.id)}
                        title={p.description}
                      >
                        <p.icon className="h-3 w-3" />
                        {p.label}
                      </Button>
                    ))}
                  </div>
                  <Button 
                    onClick={() => sendMessage()} 
                    disabled={!input.trim() || isLoading} 
                    size="icon" 
                    className="h-8 w-8 rounded-full"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Chat conversation view */
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
                    <div className={`max-w-[80%] rounded-lg px-4 py-3 text-sm ${
                      message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'
                    }`}>
                      {message.role === 'assistant' ? (
                        <div className="prose prose-sm dark:prose-invert max-w-none [&>*]:m-0 [&>*+*]:mt-2 [&_li]:text-sm [&_p]:text-sm">
                          <ReactMarkdown>{message.content}</ReactMarkdown>
                        </div>
                      ) : (
                        message.content
                      )}
                    </div>
                    {message.role === 'user' && (
                      <Avatar className="h-8 w-8 mt-0.5 flex-shrink-0">
                        <AvatarFallback className="bg-secondary">
                          <User className="h-4 w-4" />
                        </AvatarFallback>
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
                    <div className="bg-muted rounded-lg px-4 py-3">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Bottom input */}
            <div className="w-full max-w-2xl mx-auto px-4 pb-4">
              <div className="rounded-xl border bg-card p-3">
                <Input
                  placeholder="Message AI... (Shift+Enter for new line)"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  disabled={isLoading}
                  className="border-0 shadow-none focus-visible:ring-0 text-sm mb-3"
                />
                <div className="flex items-center justify-between">
                  <div className="flex gap-2 flex-wrap">
                    {PERSONAS.map((p) => (
                      <Button
                        key={p.id}
                        variant={activePersona === p.id ? 'default' : 'outline'}
                        size="sm"
                        className="h-7 text-xs rounded-full gap-1"
                        onClick={() => switchPersona(p.id)}
                        title={p.description}
                      >
                        <p.icon className="h-3 w-3" />
                        {p.label}
                      </Button>
                    ))}
                  </div>
                  <Button 
                    onClick={() => sendMessage()} 
                    disabled={!input.trim() || isLoading} 
                    size="icon" 
                    className="h-8 w-8 rounded-full"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
