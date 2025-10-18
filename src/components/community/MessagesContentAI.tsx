import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { BrainCircuit, MessageSquare, Send, Search, Sparkles, Users, TrendingUp, Target, Scroll, Shield, Heart, Briefcase, Landmark, Bitcoin } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Message {
  id: string;
  sender: string;
  message: string;
  timestamp: string;
  isCurrentUser: boolean;
  isRead?: boolean;
}

const aiExperts = [
  { id: 'ai-financial-advisor', name: 'Sarah Chen', role: 'Financial Advisor', avatar: 'SC', specialty: 'Investment Strategy & Wealth Planning' },
  { id: 'ai-tax-specialist', name: 'Michael Rodriguez', role: 'Tax Specialist', avatar: 'MR', specialty: 'Tax Optimization & Planning' },
  { id: 'ai-estate-planner', name: 'Jennifer Williams', role: 'Estate Planner', avatar: 'JW', specialty: 'Estate Planning & Succession' },
  { id: 'ai-investment-manager', name: 'David Thompson', role: 'Investment Manager', avatar: 'DT', specialty: 'Portfolio Management' },
  { id: 'ai-insurance-expert', name: 'Lisa Park', role: 'Insurance Expert', avatar: 'LP', specialty: 'Risk & Insurance Planning' },
  { id: 'ai-business-consultant', name: 'Robert Johnson', role: 'Business Consultant', avatar: 'RJ', specialty: 'Business Strategy & Advisory' },
  { id: 'ai-trust-officer', name: 'Amanda Foster', role: 'Trust Officer', avatar: 'AF', specialty: 'Trust Administration' },
  { id: 'ai-crypto-advisor', name: 'Alex Kumar', role: 'Crypto Advisor', avatar: 'AK', specialty: 'Digital Assets & Crypto' }
];

const services = [
  { name: 'Investment Management', icon: TrendingUp, aiId: 'ai-financial-advisor', aiName: 'Sarah Chen', description: 'Portfolio strategy and wealth building' },
  { name: 'Tax Planning', icon: Target, aiId: 'ai-tax-specialist', aiName: 'Michael Rodriguez', description: 'Tax optimization strategies' },
  { name: 'Estate Planning', icon: Scroll, aiId: 'ai-estate-planner', aiName: 'Jennifer Williams', description: 'Succession and legacy planning' },
  { name: 'Risk Management', icon: Shield, aiId: 'ai-insurance-expert', aiName: 'Lisa Park', description: 'Insurance and risk protection' },
  { name: 'Philanthropy Advisory', icon: Heart, aiId: 'ai-financial-advisor', aiName: 'Sarah Chen', description: 'Charitable giving strategies' },
  { name: 'Business Advisory', icon: Briefcase, aiId: 'ai-business-consultant', aiName: 'Robert Johnson', description: 'Business strategy guidance' },
  { name: 'Trust Administration', icon: Landmark, aiId: 'ai-trust-officer', aiName: 'Amanda Foster', description: 'Trust management services' },
  { name: 'Crypto Strategy', icon: Bitcoin, aiId: 'ai-crypto-advisor', aiName: 'Alex Kumar', description: 'Digital asset management' },
];

export function MessagesContentAI() {
  const [conversations, setConversations] = useState<{[key: string]: Message[]}>({});
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('aiConversations');
    if (saved) {
      setConversations(JSON.parse(saved));
    } else {
      // Initialize with greetings
      const initial: {[key: string]: Message[]} = {};
      aiExperts.forEach(expert => {
        initial[expert.id] = [{
          id: `greeting_${expert.id}`,
          sender: expert.name,
          message: `Hey! How are you? I'm ${expert.name}, your ${expert.role}. I specialize in ${expert.specialty.toLowerCase()}. How can I help you today?`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isCurrentUser: false,
          isRead: false
        }];
      });
      setConversations(initial);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('aiConversations', JSON.stringify(conversations));
  }, [conversations]);

  // Handle service-triggered AI chat
  useEffect(() => {
    const handleOpenAIChat = (event: CustomEvent) => {
      const { aiId, aiName, serviceName, greeting } = event.detail;
      
      // Set the selected conversation
      setSelectedConversation(aiId);
      
      // Initialize conversation with AI greeting if no messages exist
      setConversations(prev => {
        const existing = prev[aiId] || [];
        if (existing.length === 0) {
          const greetingMessage = {
            id: `greeting_${Date.now()}`,
            sender: aiName,
            message: greeting,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            isCurrentUser: false,
            isRead: false
          };
          return {
            ...prev,
            [aiId]: [greetingMessage]
          };
        }
        return prev;
      });
      
      sessionStorage.removeItem('pendingAIChat');
    };

    // Listen for custom event from services
    window.addEventListener('openAIChat' as any, handleOpenAIChat);
    
    // Also check sessionStorage on mount
    const pendingAIChat = sessionStorage.getItem('pendingAIChat');
    if (pendingAIChat) {
      const { aiId, aiName, greeting } = JSON.parse(pendingAIChat);
      setSelectedConversation(aiId);
      
      setConversations(prev => {
        const existing = prev[aiId] || [];
        if (existing.length === 0) {
          const greetingMessage = {
            id: `greeting_${Date.now()}`,
            sender: aiName,
            message: greeting,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            isCurrentUser: false,
            isRead: false
          };
          return {
            ...prev,
            [aiId]: [greetingMessage]
          };
        }
        return prev;
      });
      
      sessionStorage.removeItem('pendingAIChat');
    }
    
    return () => {
      window.removeEventListener('openAIChat' as any, handleOpenAIChat);
    };
  }, []);

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !selectedConversation) return;

    const expert = aiExperts.find(e => e.id === selectedConversation);
    if (!expert) return;

    const userMsg: Message = {
      id: `${Date.now()}`,
      sender: 'You',
      message: messageInput,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isCurrentUser: true
    };

    setConversations(prev => ({
      ...prev,
      [selectedConversation]: [...(prev[selectedConversation] || []), userMsg]
    }));
    setMessageInput('');

    try {
      const { data } = await supabase.functions.invoke('ai-chat', {
        body: { message: `[Speaking as ${expert.name}, ${expert.role}. Specialty: ${expert.specialty}]\n\nUser: ${userMsg.message}` }
      });

      const aiMsg: Message = {
        id: `${Date.now()}_ai`,
        sender: expert.name,
        message: data.response,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isCurrentUser: false,
        isRead: false
      };

      setConversations(prev => ({
        ...prev,
        [selectedConversation]: [...(prev[selectedConversation] || []), aiMsg]
      }));
    } catch (error) {
      toast.error('Failed to get AI response');
    }
  };

  const filteredExperts = aiExperts.filter(e => 
    e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleServiceClick = (service: typeof services[0]) => {
    const greeting = `Hey! How are you? I'm ${service.aiName}, your ${service.name} specialist. I saw you're interested in ${service.name}. I'm here to help!`;
    
    setSelectedConversation(service.aiId);
    
    setConversations(prev => {
      const existing = prev[service.aiId] || [];
      if (existing.length === 0) {
        const greetingMessage = {
          id: `greeting_${Date.now()}`,
          sender: service.aiName,
          message: greeting,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isCurrentUser: false,
          isRead: false
        };
        return {
          ...prev,
          [service.aiId]: [greetingMessage]
        };
      }
      return prev;
    });
    
    toast.success(`${service.aiName} is ready to help with ${service.name}`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold mb-2 flex items-center gap-2">
          <BrainCircuit className="h-5 w-5 text-foreground" />
          AI Family Office Experts
        </h3>
        <p className="text-muted-foreground text-sm mb-6">
          Chat with your AI wealth management specialists available 24/7
        </p>
        
        <div className="flex items-center gap-4 mb-6 p-4 bg-accent rounded-lg border-2">
          <Sparkles className="h-5 w-5 text-foreground" />
          <span className="text-sm font-semibold text-foreground">All conversations are AI-powered</span>
          <Badge variant="default" className="text-xs ml-auto">Available 24/7</Badge>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6 h-[600px]">
        <div className="md:col-span-1 border rounded-lg">
          <div className="p-4 border-b">
            <div className="relative">
              <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search experts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          
          <div className="overflow-y-auto max-h-[520px]">
            {filteredExperts.map((expert) => {
              const msgs = conversations[expert.id] || [];
              const lastMsg = msgs[msgs.length - 1];
              const unread = msgs.filter(m => !m.isCurrentUser && !m.isRead).length;
              
              return (
                <div
                  key={expert.id}
                  className={`p-4 border-b cursor-pointer transition-colors hover:bg-accent/50 ${
                    selectedConversation === expert.id ? 'bg-accent' : ''
                  }`}
                  onClick={() => setSelectedConversation(expert.id)}
                >
                  <div className="flex items-center space-x-3">
                    <div className="relative">
                      <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-medium">
                        {expert.avatar}
                      </div>
                      <div className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-background bg-green-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-medium truncate">{expert.name}</p>
                        {unread > 0 && <Badge variant="secondary" className="text-xs">{unread}</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{expert.role}</p>
                      <p className="text-xs truncate">{lastMsg?.message || 'Start chatting'}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="md:col-span-2 border rounded-lg flex flex-col">
          {selectedConversation ? (
            <>
              <div className="p-4 border-b flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm">
                    {aiExperts.find(e => e.id === selectedConversation)?.avatar}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{aiExperts.find(e => e.id === selectedConversation)?.name}</p>
                    <p className="text-xs text-muted-foreground">{aiExperts.find(e => e.id === selectedConversation)?.specialty}</p>
                  </div>
                </div>
                <Badge variant="secondary" className="text-xs"><BrainCircuit className="h-3 w-3 mr-1" />AI Expert</Badge>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {(conversations[selectedConversation] || []).map((msg) => (
                  <div key={msg.id} className={`flex ${msg.isCurrentUser ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[70%] p-3 rounded-lg ${msg.isCurrentUser ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                      <p className="text-sm">{msg.message}</p>
                      <p className="text-xs opacity-70 mt-1">{msg.timestamp}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-4 border-t">
                <div className="flex space-x-2">
                  <Textarea
                    placeholder={`Ask ${aiExperts.find(e => e.id === selectedConversation)?.name}...`}
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    className="flex-1 min-h-[60px]"
                  />
                  <Button onClick={handleSendMessage} size="icon" className="h-[60px] w-[60px]">
                    <Send className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 overflow-y-auto p-6">
              <div className="max-w-4xl mx-auto space-y-6">
                <div className="text-center mb-8">
                  <BrainCircuit className="h-16 w-16 mx-auto mb-4 text-primary" />
                  <h2 className="text-2xl font-bold mb-2">Choose Your AI Expert</h2>
                  <p className="text-muted-foreground">Select a service below to start chatting with a specialized AI advisor</p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {services.map((service) => {
                    const Icon = service.icon;
                    return (
                      <Card 
                        key={service.name}
                        className="cursor-pointer hover:shadow-lg hover:border-[#ffb500] hover:scale-105 transition-all duration-300"
                        onClick={() => handleServiceClick(service)}
                      >
                        <div className="p-5">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 rounded-lg bg-accent">
                              <Icon className="h-5 w-5 text-foreground" />
                            </div>
                            <h3 className="font-semibold text-base">{service.name}</h3>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">{service.description}</p>
                          <p className="text-xs text-foreground font-semibold">Chat with {service.aiName}</p>
                        </div>
                      </Card>
                    );
                  })}
                </div>

                <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20 mt-8">
                  <CardContent className="p-6">
                    <div className="flex items-start space-x-3">
                      <Sparkles className="h-5 w-5 text-primary flex-shrink-0 mt-1" />
                      <div>
                        <h4 className="font-semibold mb-2">Available 24/7</h4>
                        <p className="text-sm text-muted-foreground">
                          Our AI specialists are always ready to assist with your wealth management needs. Click any service above to start an instant conversation.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </div>
      </div>

      <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
        <CardContent className="p-4">
          <div className="flex items-start space-x-3">
            <Sparkles className="h-5 w-5 text-primary" />
            <div>
              <h4 className="font-medium mb-1">AI-Powered Conversations</h4>
              <p className="text-sm text-muted-foreground">
                All conversations powered by advanced AI. Available 24/7 with instant responses.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
