import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { BrainCircuit, MessageSquare, Send, Search, Sparkles, Users, TrendingUp, Target, Scroll, Shield, Heart, Briefcase, Landmark, Bitcoin, ArrowLeft } from 'lucide-react';
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
      {!selectedConversation ? (
        <>
          <div className="text-center space-y-3">
            <BrainCircuit className="h-16 w-16 mx-auto" color="#2eb2ff" />
            <h2 className="text-3xl font-bold">AI Experts</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Get instant expert advice from our AI specialists. Click any service to start chatting.
            </p>
            <Badge variant="default" className="text-sm px-4 py-2">
              <Sparkles className="h-4 w-4 mr-2" />
              Available 24/7
            </Badge>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 max-w-7xl mx-auto">
            {services.map((service) => {
              const Icon = service.icon;
              return (
                <Card 
                  key={service.name}
                  className="cursor-pointer hover:shadow-lg hover:border-[#ffb500] hover:scale-105 transition-all duration-300"
                  onClick={() => handleServiceClick(service)}
                >
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      <div className="p-3 rounded-lg bg-accent w-fit">
                        <Icon className="h-8 w-8 text-foreground" />
                      </div>
                      <div>
                        <h3 className="font-bold text-lg mb-2">{service.name}</h3>
                        <p className="text-sm text-muted-foreground mb-3">{service.description}</p>
                        <div className="flex items-center text-sm font-semibold text-foreground">
                          <MessageSquare className="h-4 w-4 mr-2" />
                          Chat with {service.aiName}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      ) : (
        <div className="max-w-6xl mx-auto">
          <Button 
            variant="ghost" 
            onClick={() => setSelectedConversation(null)}
            className="mb-4"
          >
            ← Back to AI Experts
          </Button>

          <Card className="h-[700px] flex flex-col">
            <div className="p-4 border-b flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold">
                  {aiExperts.find(e => e.id === selectedConversation)?.avatar}
                </div>
                <div>
                  <p className="font-semibold">{aiExperts.find(e => e.id === selectedConversation)?.name}</p>
                  <p className="text-sm text-muted-foreground">{aiExperts.find(e => e.id === selectedConversation)?.specialty}</p>
                </div>
              </div>
              <Badge variant="secondary" className="text-sm">
                <BrainCircuit className="h-4 w-4 mr-1" />
                AI Expert
              </Badge>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-muted/20">
              {(conversations[selectedConversation] || []).map((msg) => (
                <div key={msg.id} className={`flex ${msg.isCurrentUser ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[75%] p-4 rounded-2xl ${msg.isCurrentUser ? 'bg-primary text-primary-foreground' : 'bg-background border shadow-sm'}`}>
                    <p className="text-sm leading-relaxed">{msg.message}</p>
                    <p className="text-xs opacity-60 mt-2">{msg.timestamp}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-6 border-t bg-background">
              <div className="flex space-x-3">
                <Textarea
                  placeholder={`Ask ${aiExperts.find(e => e.id === selectedConversation)?.name} anything...`}
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  className="flex-1 min-h-[80px] resize-none"
                />
                <Button onClick={handleSendMessage} size="lg" className="h-[80px] w-[80px]">
                  <Send className="h-6 w-6" />
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
