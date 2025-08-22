import { useState, useRef, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Send, Bot, User, Loader2, MessageCircle, X, Minimize2, Building2, TrendingUp, FileText, Users } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useIsMobile } from '@/hooks/use-mobile'
import { supabase } from '@/integrations/supabase/client'

interface Message {
  id: string
  content: string
  role: 'user' | 'assistant'
  timestamp: Date
  showOptions?: boolean
}

export function AIChat() {
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const isMobile = useIsMobile()
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: "Hello! I'm Rachel, your Family Office AI assistant. What would you like help with today?",
      role: 'assistant',
      timestamp: new Date(),
      showOptions: true
    }
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

  // Expose programmatic controls and event listeners for opening the chat
  useEffect(() => {
    const open = () => setIsOpen(true)
    const close = () => setIsOpen(false)
    const toggle = () => setIsOpen(prev => !prev)

    ;(window as any).openAIChat = open
    ;(window as any).closeAIChat = close
    ;(window as any).toggleAIChat = toggle

    const openHandler = () => open()
    const closeHandler = () => close()
    const toggleHandler = () => toggle()

    window.addEventListener('ai-chat:open', openHandler as EventListener)
    window.addEventListener('ai-chat:close', closeHandler as EventListener)
    window.addEventListener('ai-chat:toggle', toggleHandler as EventListener)

    return () => {
      window.removeEventListener('ai-chat:open', openHandler as EventListener)
      window.removeEventListener('ai-chat:close', closeHandler as EventListener)
      window.removeEventListener('ai-chat:toggle', toggleHandler as EventListener)
      delete (window as any).openAIChat
      delete (window as any).closeAIChat
      delete (window as any).toggleAIChat
    }
  }, [])

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      content: input.trim(),
      role: 'user',
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      const { data, error } = await supabase.functions.invoke('ai-chat', {
        body: { 
          message: input.trim(),
          context: 'family_office_business_structure'
        }
      })

      if (error) throw error

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: data.response,
        role: 'assistant',
        timestamp: new Date()
      }

      setMessages(prev => [...prev, assistantMessage])
    } catch (error) {
      console.error('Error sending message:', error)
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const handleOptionClick = (option: string) => {
    // Remove options from the initial message
    setMessages(prev => prev.map(msg => 
      msg.id === '1' ? { ...msg, showOptions: false } : msg
    ))

    // Add user selection
    const userMessage: Message = {
      id: Date.now().toString(),
      content: option,
      role: 'user',
      timestamp: new Date()
    }

    let assistantResponse = ""
    
    switch (option) {
      case 'Business Structure':
        assistantResponse = "Great choice! I'll help you optimize your business structure using The F.L.I.P. Formula™. This comprehensive analysis will help you identify tax savings opportunities, optimize family employment, and protect your assets.\n\nTo get started, could you tell me:\n1. How many LLCs do you currently have?\n2. What industries are your businesses in?\n3. Are any family members involved in your businesses?\n\nOr feel free to ask me any specific questions about business structure optimization!"
        break
      case 'Investment Strategy':
        assistantResponse = "I'd be happy to help with your investment strategy! I can assist with asset allocation, portfolio diversification, family office investment approaches, and long-term wealth preservation strategies.\n\nWhat specific area of investment planning would you like to focus on?"
        break
      case 'Estate Planning':
        assistantResponse = "Estate planning is crucial for family wealth preservation. I can help you understand trust structures, succession planning, tax-efficient wealth transfer strategies, and multi-generational planning.\n\nWhat aspect of estate planning are you most interested in discussing?"
        break
      case 'Family Governance':
        assistantResponse = "Family governance helps ensure smooth operations and clear communication across generations. I can help with family employment policies, decision-making structures, conflict resolution, and establishing family values and mission.\n\nWhat family governance topic would you like to explore?"
        break
      default:
        assistantResponse = "I'm here to help with all aspects of family office management. Feel free to ask me anything!"
    }

    const assistantMessage: Message = {
      id: (Date.now() + 1).toString(),
      content: assistantResponse,
      role: 'assistant',
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage, assistantMessage])
  }

  const chatOptions = [
    { label: 'Business Structure', icon: Building2 },
    { label: 'Investment Strategy', icon: TrendingUp },
    { label: 'Estate Planning', icon: FileText },
    { label: 'Family Governance', icon: Users }
  ]

  return (
    <div className={`fixed right-4 z-50 ${isMobile ? 'bottom-16' : 'bottom-4'}`}>
      {/* Chat Widget Button */}
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

      {/* Chat Widget */}
      {isOpen && (
        <Card className={`w-80 shadow-2xl transition-all duration-200 ${
          isMinimized ? 'h-14' : 'h-96'
        }`}>
          <CardHeader className="pb-2 px-4 py-3 border-b">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Bot className="h-4 w-4" style={{ color: '#ffb500' }} />
                Rachel AI Assistant
              </CardTitle>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsMinimized(!isMinimized)}
                  className="h-6 w-6 p-0"
                >
                  <Minimize2 className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                  className="h-6 w-6 p-0"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </CardHeader>
          
          {!isMinimized && (
            <CardContent className="flex flex-col h-80 p-0">
              <ScrollArea className="flex-1 px-4 py-2" ref={scrollAreaRef}>
                <div className="space-y-3">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex gap-2 ${
                        message.role === 'user' ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      {message.role === 'assistant' && (
                        <Avatar className="h-6 w-6 mt-0.5">
                          <AvatarFallback style={{ backgroundColor: '#ffb500' }}>
                            <Bot className="h-3 w-3 text-primary" />
                          </AvatarFallback>
                        </Avatar>
                      )}
                      <div
                        className={`max-w-[75%] rounded-lg px-3 py-2 text-xs ${
                          message.role === 'user'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        }`}
                      >
                        {message.content}
                        {message.showOptions && (
                          <div className="mt-3 space-y-1.5">
                            {chatOptions.map((option) => (
                              <Button
                                key={option.label}
                                variant="outline"
                                size="sm"
                                className="w-full justify-start text-xs h-7 px-2"
                                onClick={() => handleOptionClick(option.label)}
                              >
                                <option.icon className="h-3 w-3 mr-1.5 flex-shrink-0" />
                                <span className="truncate">{option.label}</span>
                              </Button>
                            ))}
                          </div>
                        )}
                      </div>
                      {message.role === 'user' && (
                        <Avatar className="h-6 w-6 mt-0.5">
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
              
              <div className="flex gap-2 p-3 border-t">
                <Input
                  placeholder="Ask me anything..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  disabled={isLoading}
                  className="flex-1 h-8 text-xs"
                />
                <Button
                  onClick={sendMessage}
                  disabled={!input.trim() || isLoading}
                  size="sm"
                  className="h-8 w-8 p-0"
                >
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