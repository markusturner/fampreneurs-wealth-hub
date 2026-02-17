import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface SubscriptionStatus {
  subscribed: boolean;
  programs: string[]; // e.g. ['fbu', 'tfv', 'tfba']
  subscription_end?: string;
  loading: boolean;
}

export const useSubscription = () => {
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus>({
    subscribed: false,
    programs: [],
    loading: true,
  });

  const checkSubscription = async () => {
    try {
      setSubscriptionStatus(prev => ({ ...prev, loading: true }));

      const { data: session } = await supabase.auth.getSession();
      if (!session.session) {
        setSubscriptionStatus({ subscribed: false, programs: [], loading: false });
        return;
      }

      const { data, error } = await supabase.functions.invoke('check-subscription');

      if (error) {
        console.error('Subscription check error:', error);
        setSubscriptionStatus({ subscribed: false, programs: [], loading: false });
        return;
      }

      setSubscriptionStatus({
        subscribed: data.subscribed || false,
        programs: data.programs || [],
        subscription_end: data.subscription_end,
        loading: false,
      });
    } catch (error) {
      console.error('Error checking subscription:', error);
      setSubscriptionStatus({ subscribed: false, programs: [], loading: false });
    }
  };

  const createCheckout = async (priceId: string, mode: 'subscription' | 'payment', programName?: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { price_id: priceId, mode, program_name: programName },
      });

      if (error) throw error;
      if (data.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Error creating checkout:', error);
    }
  };

  const openCustomerPortal = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal');
      if (error) throw error;
      if (data.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Error opening customer portal:', error);
    }
  };

  useEffect(() => {
    checkSubscription();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        setTimeout(() => checkSubscription(), 0);
      } else if (event === 'SIGNED_OUT') {
        setSubscriptionStatus({ subscribed: false, programs: [], loading: false });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return {
    subscriptionStatus,
    checkSubscription,
    createCheckout,
    openCustomerPortal,
  };
};
