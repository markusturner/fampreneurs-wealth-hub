import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

// Map price IDs to programs
const PRICE_TO_PROGRAM: Record<string, string> = {
  // FBU
  "price_1T1djeKKuJwlPZFrDTlV3lxH": "fbu",
  "price_1T1djuKKuJwlPZFrlK2XGRS0": "fbu",
  "price_1T1dk5KKuJwlPZFrFxNE9FD7": "fbu",
  // TFV
  "price_1T1dkMKKuJwlPZFrHGawpC2Y": "tfv",
  "price_1T1dkaKKuJwlPZFrDi8rFpMT": "tfv",
  "price_1T1dknKKuJwlPZFrn92aAO2L": "tfv",
  // TFBA
  "price_1T1dl0KKuJwlPZFrnPpruCYU": "tfba",
  "price_1T1dlOKKuJwlPZFrx1Ppbyz4": "tfba",
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
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });

    if (customers.data.length === 0) {
      logStep("No customer found");
      return new Response(JSON.stringify({ subscribed: false, programs: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    // Check active subscriptions
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 10,
    });

    // Check completed one-time payments (for PIF plans)
    const sessions = await stripe.checkout.sessions.list({
      customer: customerId,
      status: "complete",
      limit: 50,
    });

    const activePrograms: string[] = [];

    // From subscriptions
    for (const sub of subscriptions.data) {
      const priceId = sub.items.data[0]?.price?.id;
      if (priceId && PRICE_TO_PROGRAM[priceId]) {
        const prog = PRICE_TO_PROGRAM[priceId];
        if (!activePrograms.includes(prog)) activePrograms.push(prog);
      }
    }

    // From one-time payments (PIF)
    for (const session of sessions.data) {
      if (session.payment_status === "paid" && session.mode === "payment") {
        // Check line items
        const lineItems = await stripe.checkout.sessions.listLineItems(session.id, { limit: 5 });
        for (const item of lineItems.data) {
          const priceId = item.price?.id;
          if (priceId && PRICE_TO_PROGRAM[priceId]) {
            const prog = PRICE_TO_PROGRAM[priceId];
            if (!activePrograms.includes(prog)) activePrograms.push(prog);
          }
        }
      }
    }

    logStep("Active programs", { activePrograms });

    const subscribed = activePrograms.length > 0;
    const subscriptionEnd = subscriptions.data.length > 0
      ? new Date(subscriptions.data[0].current_period_end * 1000).toISOString()
      : null;

    return new Response(JSON.stringify({
      subscribed,
      programs: activePrograms,
      subscription_end: subscriptionEnd,
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
