import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Crown, Star, CheckCircle } from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";

interface SubscriptionBannerProps {
  isPremiumGroup?: boolean;
  onUpgrade?: () => void;
}

export function SubscriptionBanner({ isPremiumGroup = false, onUpgrade }: SubscriptionBannerProps) {
  const { subscriptionStatus, createCheckout, openCustomerPortal } = useSubscription();

  if (subscriptionStatus.loading) {
    return null;
  }

  // Show premium group access banner for non-subscribers
  if (isPremiumGroup && !subscriptionStatus.subscribed) {
    return (
      <Card className="border-2 border-secondary/20 bg-gradient-to-r from-secondary/5 to-primary/5 mb-6">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-2">
            <Crown className="h-8 w-8 text-secondary" />
          </div>
          <CardTitle className="text-xl">Premium Group</CardTitle>
          <CardDescription>
            This is a premium group. Subscribe to get access to exclusive content and discussions.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <Button 
            onClick={onUpgrade || createCheckout}
            variant="premium"
            className="px-8"
          >
            <Crown className="h-4 w-4 mr-2" />
            Upgrade to Premium - $9.99/month
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Show subscription status for subscribers
  if (subscriptionStatus.subscribed) {
    return (
      <Card className="border-2 border-accent/20 bg-gradient-to-r from-accent/5 to-secondary/5 mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-accent" />
              <CardTitle className="text-lg">Premium Active</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 text-secondary" />
              <span className="text-sm font-medium text-secondary">
                {subscriptionStatus.subscription_tier || 'Premium'}
              </span>
            </div>
          </div>
          <CardDescription>
            You have full access to all premium groups and features.
            {subscriptionStatus.subscription_end && (
              <span className="block mt-1">
                Next billing: {new Date(subscriptionStatus.subscription_end).toLocaleDateString()}
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={openCustomerPortal}
            variant="outline"
            size="sm"
          >
            Manage Subscription
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Show upgrade banner for non-subscribers
  return (
    <Card className="border-2 border-secondary/20 bg-gradient-to-r from-secondary/5 to-primary/5 mb-6">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-2">
          <Crown className="h-6 w-6 text-secondary" />
        </div>
        <CardTitle className="text-lg">Unlock Premium Groups</CardTitle>
        <CardDescription>
          Get access to exclusive premium groups with advanced discussions and expert insights.
        </CardDescription>
      </CardHeader>
      <CardContent className="text-center">
        <Button 
          onClick={onUpgrade || createCheckout}
          variant="secondary"
          className="px-6"
        >
          <Crown className="h-4 w-4 mr-2" />
          Subscribe - $9.99/month
        </Button>
      </CardContent>
    </Card>
  );
}