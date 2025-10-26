import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[ADMIN-SYNC-STRIPE] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Admin sync started");

    // Verify admin access
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");
    
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !userData.user) throw new Error("Authentication failed");
    
    // Check if user is admin
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('is_admin')
      .eq('user_id', userData.user.id)
      .single();
    
    if (!profile?.is_admin) {
      throw new Error("Unauthorized: Admin access required");
    }
    
    logStep("Admin verified");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not set");

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // Get all trustee profiles
    const { data: trustees, error: trusteesError } = await supabaseClient
      .from('profiles')
      .select('user_id, email, membership_type')
      .eq('membership_type', 'trustee');

    if (trusteesError) throw trusteesError;
    
    logStep(`Found ${trustees?.length || 0} trustees`);

    let syncedCount = 0;
    let errorCount = 0;

    for (const trustee of trustees || []) {
      try {
        if (!trustee.email) continue;

        // Find Stripe customer
        const customers = await stripe.customers.list({ 
          email: trustee.email, 
          limit: 1 
        });

        if (customers.data.length === 0) {
          // No Stripe customer, mark as unsubscribed
          await supabaseClient.from("subscribers").upsert({
            email: trustee.email,
            user_id: trustee.user_id,
            stripe_customer_id: null,
            subscribed: false,
            subscription_tier: null,
            subscription_period: null,
            subscription_end: null,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'email' });
          continue;
        }

        const customerId = customers.data[0].id;

        // Get active subscriptions
        const subscriptions = await stripe.subscriptions.list({
          customer: customerId,
          status: "active",
          limit: 1,
        });

        const hasActiveSub = subscriptions.data.length > 0;
        let subscriptionTier = null;
        let subscriptionPeriod = null;
        let subscriptionEnd = null;

        if (hasActiveSub) {
          const subscription = subscriptions.data[0];
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

        // Update database
        await supabaseClient.from("subscribers").upsert({
          email: trustee.email,
          user_id: trustee.user_id,
          stripe_customer_id: customerId,
          subscribed: hasActiveSub,
          subscription_tier: subscriptionTier,
          subscription_period: subscriptionPeriod,
          subscription_end: subscriptionEnd,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'email' });

        syncedCount++;
        logStep(`Synced ${trustee.email}`, { tier: subscriptionTier, period: subscriptionPeriod });
      } catch (error) {
        errorCount++;
        logStep(`Error syncing ${trustee.email}`, { error: error.message });
      }
    }

    logStep("Sync complete", { synced: syncedCount, errors: errorCount });

    return new Response(JSON.stringify({ 
      success: true, 
      synced: syncedCount, 
      errors: errorCount 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
