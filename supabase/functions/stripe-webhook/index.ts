import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

serve(async (req) => {
  const signature = req.headers.get("stripe-signature");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  
  if (!signature || !webhookSecret) {
    logStep("Missing signature or webhook secret");
    return new Response("Webhook signature verification failed", { status: 400 });
  }

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  if (!stripeKey) {
    logStep("STRIPE_SECRET_KEY not set");
    return new Response("Server configuration error", { status: 500 });
  }

  const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const body = await req.text();
    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    
    logStep(`Webhook received: ${event.type}`);

    // Handle subscription events
    if (event.type.startsWith('customer.subscription.')) {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;
      
      // Get customer details
      const customer = await stripe.customers.retrieve(customerId);
      if (!customer || customer.deleted) {
        logStep("Customer not found or deleted", { customerId });
        return new Response("OK", { status: 200 });
      }

      const email = (customer as Stripe.Customer).email;
      if (!email) {
        logStep("Customer has no email", { customerId });
        return new Response("OK", { status: 200 });
      }

      // Get user_id from profiles
      const { data: profile } = await supabaseClient
        .from('profiles')
        .select('user_id')
        .eq('email', email)
        .single();

      if (!profile) {
        logStep("No profile found for email", { email });
        return new Response("OK", { status: 200 });
      }

      // Determine subscription tier and period
      let subscriptionTier: string | null = null;
      let subscriptionPeriod: string | null = null;
      let subscriptionEnd: string | null = null;
      let isActive = false;

      if (event.type === 'customer.subscription.deleted') {
        // Subscription cancelled/deleted
        isActive = false;
      } else if (subscription.status === 'active' || subscription.status === 'trialing') {
        isActive = true;
        subscriptionEnd = new Date(subscription.current_period_end * 1000).toISOString();
        
        // Get price details
        const priceId = subscription.items.data[0].price.id;
        const price = await stripe.prices.retrieve(priceId);
        const amount = price.unit_amount || 0;
        const interval = price.recurring?.interval;
        const intervalCount = price.recurring?.interval_count || 1;
        
        // Map to tier names: Starter ($97/mo), Professional ($247/qtr), Enterprise ($897/yr)
        if (amount === 9700) {
          subscriptionTier = "Starter";
          subscriptionPeriod = "monthly";
        } else if (amount === 24700) {
          subscriptionTier = "Professional";
          subscriptionPeriod = "quarterly";
        } else if (amount === 89700) {
          subscriptionTier = "Enterprise";
          subscriptionPeriod = "annual";
        } else {
          // Fallback
          subscriptionTier = amount >= 5000 ? "Enterprise" : amount >= 2000 ? "Professional" : "Starter";
          if (interval === "year") {
            subscriptionPeriod = "annual";
          } else if (interval === "month" && intervalCount === 3) {
            subscriptionPeriod = "quarterly";
          } else {
            subscriptionPeriod = "monthly";
          }
        }
      }

      // Update subscribers table
      const { error: upsertError } = await supabaseClient
        .from("subscribers")
        .upsert({
          email,
          user_id: profile.user_id,
          stripe_customer_id: customerId,
          subscribed: isActive,
          subscription_tier: subscriptionTier,
          subscription_period: subscriptionPeriod,
          subscription_end: subscriptionEnd,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'email' });

      if (upsertError) {
        logStep("Error updating subscriber", { error: upsertError.message, email });
      } else {
        logStep("Successfully updated subscriber", { 
          email, 
          tier: subscriptionTier, 
          period: subscriptionPeriod,
          active: isActive 
        });
      }
    }

    return new Response("OK", { status: 200 });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("Webhook error", { error: errorMessage });
    return new Response(`Webhook error: ${errorMessage}`, { status: 400 });
  }
});
