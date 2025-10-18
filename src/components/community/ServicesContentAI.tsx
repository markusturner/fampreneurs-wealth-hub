import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, Target, Scroll, Shield, Heart, Briefcase, Landmark, Bitcoin } from 'lucide-react';
import { toast } from 'sonner';

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

export function ServicesContentAI() {
  const handleServiceClick = (service: typeof services[0]) => {
    const greeting = `Hey! How are you? I'm ${service.aiName}, your ${service.name} specialist. I saw you're interested in ${service.name}. I'm here to help!`;
    
    sessionStorage.setItem('pendingAIChat', JSON.stringify({
      aiId: service.aiId,
      aiName: service.aiName,
      serviceName: service.name,
      greeting: greeting
    }));
    
    const tabElement = document.querySelector('[data-value="messages"]') as HTMLElement;
    if (tabElement) tabElement.click();
    
    toast.success(`${service.aiName} is ready to help with ${service.name}`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-2xl font-bold mb-3">AI Family Office Services</h3>
        <p className="text-muted-foreground">
          Click any service to chat with the specialized AI expert
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {services.map((service) => {
          const Icon = service.icon;
          return (
            <Card 
              key={service.name}
              className="cursor-pointer hover:shadow-lg hover:border-primary/50 transition-all"
              onClick={() => handleServiceClick(service)}
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-base">
                  <div className="p-2 rounded-lg bg-accent">
                    <Icon className="h-5 w-5 text-foreground" />
                  </div>
                  <span>{service.name}</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-2">{service.description}</p>
                <p className="text-xs text-foreground font-semibold">Chat with {service.aiName}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
