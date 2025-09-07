import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, CreditCard, ArrowRight } from 'lucide-react';
import { navigateToRoute } from '@/utils/navigation';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface FlowSelectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const FlowSelectionModal = ({ open, onOpenChange }: FlowSelectionModalProps) => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleFampreneurFlow = () => {
    navigateToRoute('/auth?flow=fampreneur');
    onOpenChange(false);
  };

  const handleNewUserFlow = async () => {
    setLoading(true);
    try {
      // Start with starter plan for new users ($97/month)
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { amount: 9700 }
      });
      
      if (error) {
        toast({
          title: "Error",
          description: "Failed to create checkout session",
          variant: "destructive",
        });
        return;
      }

      if (data.url) {
        window.open(data.url, '_blank');
        onOpenChange(false);
      }
    } catch (error) {
      console.error('Error creating checkout:', error);
      toast({
        title: "Error", 
        description: "Failed to create checkout session",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center mb-4">
            Choose Your Path to Build Generational Wealth
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Fampreneur Member Path */}
          <Card className="border-2 border-secondary hover:border-secondary/80 transition-colors cursor-pointer group" onClick={handleFampreneurFlow}>
            <CardHeader className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-secondary/10 flex items-center justify-center group-hover:bg-secondary/20 transition-colors">
                <Users className="w-8 h-8 text-secondary" />
              </div>
              <CardTitle className="text-xl">I'm a Fampreneur Member</CardTitle>
              <CardDescription>
                Already part of the Fampreneur community? Get your exclusive trial access.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <ul className="text-sm text-muted-foreground mb-6 space-y-2">
                <li>✅ Automatic program detection</li>
                <li>✅ Extended trial periods</li>
                <li>✅ Special member pricing</li>
                <li>✅ Instant access</li>
              </ul>
              <Button className="w-full" variant="outline">
                Continue as Fampreneur Member
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>

          {/* New User Path */}
          <Card className="border-2 border-primary hover:border-primary/80 transition-colors cursor-pointer group" onClick={handleNewUserFlow}>
            <CardHeader className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <CreditCard className="w-8 h-8 text-primary" />
              </div>
              <CardTitle className="text-xl">I'm New to TruHeirs</CardTitle>
              <CardDescription>
                Start your wealth-building journey with full access to our platform.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <div className="text-2xl font-bold text-primary mb-2">$97/month</div>
              <ul className="text-sm text-muted-foreground mb-6 space-y-2">
                <li>✅ Complete DIY family office</li>
                <li>✅ AI-powered wealth management</li>
                <li>✅ Investment tracking</li>
                <li>✅ Family governance tools</li>
              </ul>
              <Button 
                className="w-full" 
                onClick={handleNewUserFlow}
                disabled={loading}
              >
                {loading ? 'Processing...' : 'Start Building Legacy'}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="text-center text-sm text-muted-foreground mt-4">
          <p>All plans include a 30-day money-back guarantee</p>
        </div>
      </DialogContent>
    </Dialog>
  );
};