import { useState, useRef, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Send, Bot, User, Loader2, MessageCircle, X, Minimize2, Shield, Building2, FileText } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useIsMobile } from '@/hooks/use-mobile'
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

export function AIChat() {
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [activePersona, setActivePersona] = useState<Persona>('rachel')
  const isMobile = useIsMobile()
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', content: PERSONA_GREETINGS.rachel, role: 'assistant', timestamp: new Date() }
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setIsAuthenticated(!!session)
    }
    checkAuth()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setIsAuthenticated(!!session)
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight
    }
  }, [messages])

  useEffect(() => {
    const open = () => setIsOpen(true)
    const close = () => setIsOpen(false)
    const toggle = () => setIsOpen(prev => !prev)
    ;(window as any).openAIChat = open
    ;(window as any).closeAIChat = close
    ;(window as any).toggleAIChat = toggle
    window.addEventListener('ai-chat:open', open)
    window.addEventListener('ai-chat:close', close)
    window.addEventListener('ai-chat:toggle', toggle)
    return () => {
      window.removeEventListener('ai-chat:open', open)
      window.removeEventListener('ai-chat:close', close)
      window.removeEventListener('ai-chat:toggle', toggle)
      delete (window as any).openAIChat
      delete (window as any).closeAIChat
      delete (window as any).toggleAIChat
    }
  }, [])

  const switchPersona = useCallback((persona: Persona) => {
    setActivePersona(persona)
    setMessages([
      { id: Date.now().toString(), content: PERSONA_GREETINGS[persona], role: 'assistant', timestamp: new Date() }
    ])
  }, [])

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return
    const userMessage: Message = { id: Date.now().toString(), content: input.trim(), role: 'user', timestamp: new Date() }
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      const { data, error } = await supabase.functions.invoke('ai-chat', {
        body: { message: input.trim(), persona: activePersona }
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

  if (!isAuthenticated) return null

  const currentPersona = PERSONAS.find(p => p.id === activePersona)!

  return (
    <div className={`fixed right-4 z-50 ${isMobile ? 'bottom-24' : 'bottom-8'}`}>
      {!isOpen && (
        <Button
          onClick={() => setIsOpen(true)}
          size="lg"
          className="h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-200"
          style={{ backgroundColor: '#ffb500', color: 'white' }}
        >
          <MessageCircle className="h-6 w-6" style={{ color: '#290a52' }} />
        </Button>
      )}

      {isOpen && (
        <Card className={`shadow-2xl transition-all duration-200 ${isMobile ? 'w-[calc(100vw-2rem)]' : 'w-96'} ${isMinimized ? 'h-14' : isMobile ? 'h-[70vh]' : 'h-[480px]'}`}>
          <CardHeader className="pb-2 px-4 py-3 border-b">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-sm">
                <currentPersona.icon className="h-4 w-4" style={{ color: '#ffb500' }} />
                {currentPersona.label}
              </CardTitle>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" onClick={() => setIsMinimized(!isMinimized)} className="h-6 w-6 p-0">
                  <Minimize2 className="h-3 w-3" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)} className="h-6 w-6 p-0">
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </CardHeader>
          
          {!isMinimized && (
            <CardContent className="flex flex-col flex-1 p-0" style={{ height: 'calc(100% - 3.5rem)' }}>
              {/* Persona Tabs */}
              <div className="flex gap-1 px-3 py-2 border-b overflow-x-auto">
                {PERSONAS.map((p) => (
                  <Button
                    key={p.id}
                    variant={activePersona === p.id ? 'default' : 'ghost'}
                    size="sm"
                    className="h-7 text-[10px] px-2 whitespace-nowrap flex-shrink-0"
                    onClick={() => switchPersona(p.id)}
                    title={p.description}
                  >
                    <p.icon className="h-3 w-3 mr-1" />
                    {p.label}
                  </Button>
                ))}
              </div>

              {/* Messages */}
              <ScrollArea className="flex-1 px-4 py-2" ref={scrollAreaRef}>
                <div className="space-y-3">
                  {messages.map((message) => (
                    <div key={message.id} className={`flex gap-2 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      {message.role === 'assistant' && (
                        <Avatar className="h-6 w-6 mt-0.5 flex-shrink-0">
                          <AvatarFallback style={{ backgroundColor: '#ffb500' }}>
                            <currentPersona.icon className="h-3 w-3 text-primary" />
                          </AvatarFallback>
                        </Avatar>
                      )}
                      <div className={`max-w-[80%] rounded-lg px-3 py-2 text-xs ${
                        message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'
                      }`}>
                        {message.role === 'assistant' ? (
                          <div className="prose prose-xs dark:prose-invert max-w-none [&>*]:m-0 [&>*+*]:mt-1.5 [&_li]:text-xs [&_p]:text-xs [&_strong]:text-xs">
                            <ReactMarkdown>{message.content}</ReactMarkdown>
                          </div>
                        ) : (
                          message.content
                        )}
                      </div>
                      {message.role === 'user' && (
                        <Avatar className="h-6 w-6 mt-0.5 flex-shrink-0">
                          <AvatarFallback className="bg-secondary">
                            <User className="h-3 w-3" />
                          </AvatarFallback>
                        </Avatar>
                      )}
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex gap-2 justify-start">
                      <Avatar className="h-6 w-6 mt-0.5">
                        <AvatarFallback className="bg-primary/10">
                          <Bot className="h-3 w-3 text-primary" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="bg-muted rounded-lg px-3 py-2 text-xs">
                        <Loader2 className="h-3 w-3 animate-spin" />
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
              
              {/* Input */}
              <div className="flex gap-2 p-3 border-t">
                <Input
                  placeholder="Ask me anything..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  disabled={isLoading}
                  className="flex-1 h-8 text-xs"
                />
                <Button onClick={sendMessage} disabled={!input.trim() || isLoading} size="sm" className="h-8 w-8 p-0">
                  <Send className="h-3 w-3" />
                </Button>
              </div>
            </CardContent>
          )}
        </Card>
      )}
    </div>
  )
}
