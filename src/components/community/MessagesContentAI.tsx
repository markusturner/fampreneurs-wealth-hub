import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { BrainCircuit, MessageSquare, Send, Search, Sparkles, Users } from 'lucide-react';
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
    const pendingAIChat = sessionStorage.getItem('pendingAIChat');
    if (pendingAIChat) {
      const { aiId, greeting } = JSON.parse(pendingAIChat);
      setSelectedConversation(aiId);
      sessionStorage.removeItem('pendingAIChat');
    }
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

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold mb-2 flex items-center gap-2">
          <BrainCircuit className="h-5 w-5 text-primary" />
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
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <BrainCircuit className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">Select an AI Expert</p>
                <p className="text-sm">Choose a specialist to start chatting</p>
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
