import { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  BrainCircuit, MessageSquare, Send, Sparkles, TrendingUp, Target, Scroll, Shield, 
  Heart, Briefcase, Landmark, Bitcoin, ArrowLeft, Settings, Upload, X, 
  PanelLeftClose, PanelLeftOpen, Plus, History, FolderOpen, BarChart3, CreditCard, DollarSign
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { useOwnerRole } from '@/hooks/useOwnerRole';
import { toast } from 'sonner';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';

interface Message {
  id: string;
  sender: string;
  message: string;
  timestamp: string;
  isCurrentUser: boolean;
}

interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: string;
}

interface ExpertProject {
  id: string;
  name: string;
  chatIds: string[];
}

const aiExperts = [
  { id: 'ai-financial-advisor', name: 'Sarah Chen', role: 'Financial Advisor', avatar: 'SC', specialty: 'Investment Strategy & Wealth Planning' },
  { id: 'ai-tax-specialist', name: 'Michael Rodriguez', role: 'Tax Specialist', avatar: 'MR', specialty: 'Tax Optimization & Planning' },
  { id: 'ai-estate-planner', name: 'Jennifer Williams', role: 'Estate Planner', avatar: 'JW', specialty: 'Estate Planning & Succession' },
  { id: 'ai-cio', name: 'David Thompson', role: 'Chief Investment Officer', avatar: 'DT', specialty: 'Portfolio Management & Asset Allocation' },
  { id: 'ai-insurance-expert', name: 'Lisa Park', role: 'Private Life Insurance Agent', avatar: 'LP', specialty: 'Private Life Insurance & Risk Protection' },
  { id: 'ai-business-consultant', name: 'Robert Johnson', role: 'Business Consultant', avatar: 'RJ', specialty: 'Business Strategy & Advisory' },
  { id: 'ai-trust-officer', name: 'Amanda Foster', role: 'Trust Officer', avatar: 'AF', specialty: 'Trust Administration' },
  { id: 'ai-crypto-advisor', name: 'Alex Kumar', role: 'Crypto Advisor', avatar: 'AK', specialty: 'Digital Assets & Crypto' },
  { id: 'ai-forex-strategist', name: 'Marcus Lee', role: 'Forex Strategist', avatar: 'ML', specialty: 'Forex Strategy & Currency Trading' },
  { id: 'ai-stock-strategist', name: 'Nicole Harris', role: 'Stock Strategist', avatar: 'NH', specialty: 'Traditional Stocks, Options & Covered Calls' },
  { id: 'ai-financial-planner', name: 'James Wilson', role: 'Financial Planning Advisor', avatar: 'JW', specialty: 'Credit Repair, Budgeting & Credit Funding' },
];

const services = [
  { name: 'Investment Management', icon: TrendingUp, aiId: 'ai-financial-advisor', aiName: 'Sarah Chen', description: 'Portfolio strategy and wealth building' },
  { name: 'Tax Planning', icon: Target, aiId: 'ai-tax-specialist', aiName: 'Michael Rodriguez', description: 'Tax optimization strategies' },
  { name: 'Estate Planning', icon: Scroll, aiId: 'ai-estate-planner', aiName: 'Jennifer Williams', description: 'Succession and legacy planning' },
  { name: 'Chief Investment Officer', icon: BarChart3, aiId: 'ai-cio', aiName: 'David Thompson', description: 'Portfolio management & asset allocation' },
  { name: 'Private Life Insurance', icon: Shield, aiId: 'ai-insurance-expert', aiName: 'Lisa Park', description: 'Private life insurance & risk protection' },
  { name: 'Business Advisory', icon: Briefcase, aiId: 'ai-business-consultant', aiName: 'Robert Johnson', description: 'Business strategy guidance' },
  { name: 'Trust Administration', icon: Landmark, aiId: 'ai-trust-officer', aiName: 'Amanda Foster', description: 'Trust management services' },
  { name: 'Crypto Strategy', icon: Bitcoin, aiId: 'ai-crypto-advisor', aiName: 'Alex Kumar', description: 'Digital asset management' },
  { name: 'Forex Strategy', icon: DollarSign, aiId: 'ai-forex-strategist', aiName: 'Marcus Lee', description: 'Forex & currency trading strategy' },
  { name: 'Stock Strategy', icon: TrendingUp, aiId: 'ai-stock-strategist', aiName: 'Nicole Harris', description: 'Stocks, options & covered calls' },
  { name: 'Financial Planning', icon: CreditCard, aiId: 'ai-financial-planner', aiName: 'James Wilson', description: 'Credit repair, budgeting & credit funding' },
  { name: 'Philanthropy Advisory', icon: Heart, aiId: 'ai-financial-advisor', aiName: 'Sarah Chen', description: 'Charitable giving strategies' },
];

export function MessagesContentAI() {
  const { user } = useAuth();
  const { isAdmin } = useUserRole();
  const { isOwner } = useOwnerRole(user?.id ?? null);
  const isAdminOrOwner = isAdmin || isOwner;

  // All chat sessions per expert
  const [expertSessions, setExpertSessions] = useState<Record<string, ChatSession[]>>({});
  const [selectedExpertId, setSelectedExpertId] = useState<string | null>(null);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Project settings (admin only)
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsExpertId, setSettingsExpertId] = useState<string | null>(null);
  const [expertInstructions, setExpertInstructions] = useState<Record<string, string>>({});
  const [expertFiles, setExpertFiles] = useState<Record<string, {name: string; content: string}[]>>({});

  // Projects per expert
  const [expertProjects, setExpertProjects] = useState<Record<string, ExpertProject[]>>({});

  // Load from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('aiExpertSessions');
    if (saved) setExpertSessions(JSON.parse(saved));
    const savedInstructions = localStorage.getItem('aiExpertInstructions');
    if (savedInstructions) setExpertInstructions(JSON.parse(savedInstructions));
    const savedFiles = localStorage.getItem('aiExpertFiles');
    if (savedFiles) setExpertFiles(JSON.parse(savedFiles));
    const savedProjects = localStorage.getItem('aiExpertProjects');
    if (savedProjects) setExpertProjects(JSON.parse(savedProjects));
  }, []);

  useEffect(() => {
    if (Object.keys(expertSessions).length > 0)
      localStorage.setItem('aiExpertSessions', JSON.stringify(expertSessions));
  }, [expertSessions]);

  useEffect(() => {
    localStorage.setItem('aiExpertInstructions', JSON.stringify(expertInstructions));
  }, [expertInstructions]);

  useEffect(() => {
    localStorage.setItem('aiExpertFiles', JSON.stringify(expertFiles));
  }, [expertFiles]);

  useEffect(() => {
    localStorage.setItem('aiExpertProjects', JSON.stringify(expertProjects));
  }, [expertProjects]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeChatId, expertSessions]);

  const selectedExpert = aiExperts.find(e => e.id === selectedExpertId);
  const sessions = selectedExpertId ? (expertSessions[selectedExpertId] || []) : [];
  const activeSession = sessions.find(s => s.id === activeChatId);

  const startNewChat = () => {
    if (!selectedExpertId || !selectedExpert) return;
    const newSession: ChatSession = {
      id: `chat_${Date.now()}`,
      title: 'New Chat',
      messages: [{
        id: `greeting_${Date.now()}`,
        sender: selectedExpert.name,
        message: `Hey! I'm ${selectedExpert.name}, your ${selectedExpert.role}. I specialize in ${selectedExpert.specialty.toLowerCase()}. How can I help you today?`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isCurrentUser: false,
      }],
      createdAt: new Date().toISOString(),
    };
    setExpertSessions(prev => ({
      ...prev,
      [selectedExpertId]: [...(prev[selectedExpertId] || []), newSession],
    }));
    setActiveChatId(newSession.id);
  };

  const selectExpert = (expertId: string) => {
    setSelectedExpertId(expertId);
    const existing = expertSessions[expertId];
    if (existing && existing.length > 0) {
      setActiveChatId(existing[existing.length - 1].id);
    } else {
      // Auto-create first chat
      const expert = aiExperts.find(e => e.id === expertId)!;
      const newSession: ChatSession = {
        id: `chat_${Date.now()}`,
        title: 'New Chat',
        messages: [{
          id: `greeting_${Date.now()}`,
          sender: expert.name,
          message: `Hey! I'm ${expert.name}, your ${expert.role}. I specialize in ${expert.specialty.toLowerCase()}. How can I help you today?`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isCurrentUser: false,
        }],
        createdAt: new Date().toISOString(),
      };
      setExpertSessions(prev => ({
        ...prev,
        [expertId]: [newSession],
      }));
      setActiveChatId(newSession.id);
    }
  };

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !selectedExpertId || !activeChatId || !selectedExpert) return;

    const userMsg: Message = {
      id: `${Date.now()}`,
      sender: 'You',
      message: messageInput,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isCurrentUser: true,
    };

    // Update session title from first user message
    setExpertSessions(prev => {
      const sessions = [...(prev[selectedExpertId] || [])];
      const idx = sessions.findIndex(s => s.id === activeChatId);
      if (idx >= 0) {
        const session = { ...sessions[idx] };
        session.messages = [...session.messages, userMsg];
        if (session.title === 'New Chat') {
          session.title = messageInput.slice(0, 40) + (messageInput.length > 40 ? '...' : '');
        }
        sessions[idx] = session;
      }
      return { ...prev, [selectedExpertId]: sessions };
    });

    const msgText = messageInput;
    setMessageInput('');

    // Build system prompt with instructions and files
    const instructions = expertInstructions[selectedExpertId] || '';
    const files = expertFiles[selectedExpertId] || [];
    const fileContext = files.map(f => `[File: ${f.name}]\n${f.content}`).join('\n\n');
    const systemCtx = `[Speaking as ${selectedExpert.name}, ${selectedExpert.role}. Specialty: ${selectedExpert.specialty}]${instructions ? `\n\nCustom Instructions:\n${instructions}` : ''}${fileContext ? `\n\nReference Files:\n${fileContext}` : ''}`;

    try {
      const { data } = await supabase.functions.invoke('ai-chat', {
        body: { message: `${systemCtx}\n\nUser: ${msgText}` },
      });

      const aiMsg: Message = {
        id: `${Date.now()}_ai`,
        sender: selectedExpert.name,
        message: data.response,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isCurrentUser: false,
      };

      setExpertSessions(prev => {
        const sessions = [...(prev[selectedExpertId] || [])];
        const idx = sessions.findIndex(s => s.id === activeChatId);
        if (idx >= 0) {
          sessions[idx] = { ...sessions[idx], messages: [...sessions[idx].messages, aiMsg] };
        }
        return { ...prev, [selectedExpertId]: sessions };
      });
    } catch {
      toast.error('Failed to get AI response');
    }
  };

  const handleFileUpload = (expertId: string) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.txt,.md,.pdf,.doc,.docx,.csv';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const text = await file.text();
        setExpertFiles(prev => ({
          ...prev,
          [expertId]: [...(prev[expertId] || []), { name: file.name, content: text.slice(0, 10000) }],
        }));
        toast.success(`File "${file.name}" uploaded`);
      }
    };
    input.click();
  };

  const handleServiceClick = (service: typeof services[0]) => {
    selectExpert(service.aiId);
  };

  // Not viewing an expert - show service cards
  if (!selectedExpertId) {
    return (
      <div className="space-y-6">
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
                className="cursor-pointer hover:shadow-lg hover:border-[#ffb500] hover:scale-105 transition-all duration-300 relative"
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
                {isAdminOrOwner && (
                  <button
                    className="absolute top-2 right-2 p-1.5 rounded-lg hover:bg-muted transition-colors"
                    onClick={(e) => { e.stopPropagation(); setSettingsExpertId(service.aiId); setSettingsOpen(true); }}
                    title="Project Settings"
                  >
                    <Settings className="h-4 w-4 text-muted-foreground" />
                  </button>
                )}
              </Card>
            );
          })}
        </div>

        {/* Settings Dialog */}
        <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                <Settings className="h-5 w-5 inline mr-2" />
                Project Settings - {aiExperts.find(e => e.id === settingsExpertId)?.name}
              </DialogTitle>
            </DialogHeader>
            {settingsExpertId && (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">Custom Instructions</label>
                  <Textarea
                    placeholder="Add custom instructions for this AI expert... (e.g., Always respond with references to family trust law)"
                    value={expertInstructions[settingsExpertId] || ''}
                    onChange={(e) => setExpertInstructions(prev => ({ ...prev, [settingsExpertId!]: e.target.value }))}
                    rows={4}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Uploaded Files</label>
                  <div className="space-y-2">
                    {(expertFiles[settingsExpertId] || []).map((f, i) => (
                      <div key={i} className="flex items-center justify-between bg-muted/50 rounded-lg px-3 py-2">
                        <span className="text-sm truncate">{f.name}</span>
                        <button onClick={() => {
                          setExpertFiles(prev => {
                            const files = [...(prev[settingsExpertId!] || [])];
                            files.splice(i, 1);
                            return { ...prev, [settingsExpertId!]: files };
                          });
                        }}>
                          <X className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <Button variant="outline" size="sm" className="mt-2 gap-2" onClick={() => handleFileUpload(settingsExpertId!)}>
                    <Upload className="h-3.5 w-3.5" /> Upload File
                  </Button>
                </div>
                <Button className="w-full" onClick={() => { setSettingsOpen(false); toast.success('Settings saved'); }}>
                  Save Settings
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Viewing an expert with chat
  return (
    <div className="max-w-6xl mx-auto">
      <Button variant="ghost" onClick={() => { setSelectedExpertId(null); setActiveChatId(null); }} className="mb-4">
        <ArrowLeft className="h-4 w-4 mr-2" /> Back to AI Experts
      </Button>

      <div className="flex gap-0 border rounded-xl overflow-hidden h-[600px]">
        {/* Sidebar */}
        {sidebarOpen && (
          <div className="w-64 border-r flex flex-col bg-muted/30">
            <div className="p-3 border-b flex items-center justify-between">
              <h4 className="text-sm font-semibold truncate">{selectedExpert?.name}</h4>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={startNewChat} title="New Chat">
                  <Plus className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSidebarOpen(false)}>
                  <PanelLeftClose className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-2 space-y-0.5">
                <p className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase">Chats</p>
                {sessions.map(session => (
                  <button
                    key={session.id}
                    onClick={() => setActiveChatId(session.id)}
                    className={`w-full text-left px-2.5 py-2 rounded-lg text-sm transition-colors truncate ${
                      activeChatId === session.id ? 'bg-accent/20 font-medium' : 'hover:bg-muted/50 text-muted-foreground'
                    }`}
                  >
                    <History className="h-3 w-3 inline mr-1.5" />
                    {session.title}
                  </button>
                ))}
              </div>
            </ScrollArea>
            {isAdminOrOwner && (
              <div className="p-2 border-t">
                <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-xs" onClick={() => { setSettingsExpertId(selectedExpertId); setSettingsOpen(true); }}>
                  <Settings className="h-3.5 w-3.5" /> Project Settings
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
          <div className="p-3 border-b flex items-center justify-between">
            <div className="flex items-center gap-3">
              {!sidebarOpen && (
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSidebarOpen(true)}>
                  <PanelLeftOpen className="h-3.5 w-3.5" />
                </Button>
              )}
              <div className="w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold">
                {selectedExpert?.avatar}
              </div>
              <div>
                <p className="font-semibold text-sm">{selectedExpert?.name}</p>
                <p className="text-xs text-muted-foreground">{selectedExpert?.specialty}</p>
              </div>
            </div>
            <Badge variant="secondary" className="text-xs">
              <BrainCircuit className="h-3 w-3 mr-1" /> AI Expert
            </Badge>
          </div>

          <ScrollArea className="flex-1 p-4">
            <div className="space-y-3">
              {activeSession?.messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.isCurrentUser ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[75%] p-3 rounded-2xl text-sm ${
                    msg.isCurrentUser 
                      ? 'bg-[hsl(43,100%,50%)] text-[hsl(270,80%,15%)]' 
                      : 'bg-muted border'
                  }`}>
                    <p className="leading-relaxed whitespace-pre-wrap">{msg.message}</p>
                    <p className="text-[10px] opacity-60 mt-1.5">{msg.timestamp}</p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          <div className="p-3 border-t">
            <div className="flex gap-2">
              <Input
                placeholder={`Ask ${selectedExpert?.name} anything...`}
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSendMessage(); }}
              />
              <Button onClick={handleSendMessage} disabled={!messageInput.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Settings Dialog (reused) */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              <Settings className="h-5 w-5 inline mr-2" />
              Project Settings - {aiExperts.find(e => e.id === settingsExpertId)?.name}
            </DialogTitle>
          </DialogHeader>
          {settingsExpertId && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Custom Instructions</label>
                <Textarea
                  placeholder="Add custom instructions for this AI expert..."
                  value={expertInstructions[settingsExpertId] || ''}
                  onChange={(e) => setExpertInstructions(prev => ({ ...prev, [settingsExpertId!]: e.target.value }))}
                  rows={4}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Uploaded Files</label>
                <div className="space-y-2">
                  {(expertFiles[settingsExpertId] || []).map((f, i) => (
                    <div key={i} className="flex items-center justify-between bg-muted/50 rounded-lg px-3 py-2">
                      <span className="text-sm truncate">{f.name}</span>
                      <button onClick={() => {
                        setExpertFiles(prev => {
                          const files = [...(prev[settingsExpertId!] || [])];
                          files.splice(i, 1);
                          return { ...prev, [settingsExpertId!]: files };
                        });
                      }}>
                        <X className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                      </button>
                    </div>
                  ))}
                </div>
                <Button variant="outline" size="sm" className="mt-2 gap-2" onClick={() => handleFileUpload(settingsExpertId!)}>
                  <Upload className="h-3.5 w-3.5" /> Upload File
                </Button>
              </div>
              <Button className="w-full" onClick={() => { setSettingsOpen(false); toast.success('Settings saved'); }}>
                Save Settings
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
