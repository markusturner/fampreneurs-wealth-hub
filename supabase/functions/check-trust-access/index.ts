import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Trust unlock order
const TRUST_ORDER = ['business', 'ministry', 'family'] as const;

// Price IDs mapped to programs
const TFV_PRICE_IDS = [
  "price_1T1dkMKKuJwlPZFrHGawpC2Y", // PIF $2,500
  "price_1T1dkaKKuJwlPZFrDi8rFpMT", // $1,000/mo
  "price_1T1dknKKuJwlPZFrn92aAO2L", // $500/mo
];
const TFV_PIF_PRICE = "price_1T1dkMKKuJwlPZFrHGawpC2Y";

const TFBA_PRICE_IDS = [
  "price_1T1dl0KKuJwlPZFrnPpruCYU", // PIF $7,500
  "price_1T1dlOKKuJwlPZFrx1Ppbyz4", // $3,000/mo
];
const TFBA_PIF_PRICE = "price_1T1dl0KKuJwlPZFrnPpruCYU";

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
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Auth error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("Not authenticated");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });

    if (customers.data.length === 0) {
      return new Response(JSON.stringify({ has_access: false, unlocked_trusts: [], program: null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const customerId = customers.data[0].id;
    let tfvAccess = false;
    let tfbaAccess = false;
    let tfvPIF = false;
    let tfbaPIF = false;
    let tfvTotalPaid = 0;
    let tfbaTotalPaid = 0;

    // Check active subscriptions
    const subscriptions = await stripe.subscriptions.list({ customer: customerId, status: "active", limit: 20 });
    for (const sub of subscriptions.data) {
      const priceId = sub.items.data[0]?.price?.id;
      if (priceId && TFV_PRICE_IDS.includes(priceId)) tfvAccess = true;
      if (priceId && TFBA_PRICE_IDS.includes(priceId)) tfbaAccess = true;
    }

    // Check completed one-time payments (PIF)
    const sessions = await stripe.checkout.sessions.list({ customer: customerId, status: "complete", limit: 50 });
    for (const session of sessions.data) {
      if (session.payment_status === "paid" && session.mode === "payment") {
        const lineItems = await stripe.checkout.sessions.listLineItems(session.id, { limit: 5 });
        for (const item of lineItems.data) {
          const priceId = item.price?.id;
          if (priceId === TFV_PIF_PRICE) { tfvPIF = true; tfvAccess = true; }
          if (priceId === TFBA_PIF_PRICE) { tfbaPIF = true; tfbaAccess = true; }
        }
      }
    }

    // For payment plans, check invoices to determine total paid
    if (tfvAccess && !tfvPIF) {
      const invoices = await stripe.invoices.list({ customer: customerId, status: "paid", limit: 100 });
      for (const inv of invoices.data) {
        for (const line of inv.lines.data) {
          if (line.price?.id && TFV_PRICE_IDS.includes(line.price.id)) {
            tfvTotalPaid += (line.amount || 0) / 100; // Convert cents to dollars
          }
        }
      }
    }

    if (tfbaAccess && !tfbaPIF) {
      const invoices = await stripe.invoices.list({ customer: customerId, status: "paid", limit: 100 });
      for (const inv of invoices.data) {
        for (const line of inv.lines.data) {
          if (line.price?.id && TFBA_PRICE_IDS.includes(line.price.id)) {
            tfbaTotalPaid += (line.amount || 0) / 100;
          }
        }
      }
    }

    // Calculate unlocked trusts
    const unlockedTrusts: string[] = [];
    let program: string | null = null;

    if (tfvAccess || tfbaAccess) {
      if (tfvPIF || tfbaPIF) {
        // PIF = all trusts
        unlockedTrusts.push(...TRUST_ORDER);
        program = tfbaPIF ? 'tfba' : 'tfv';
      } else {
        // Payment plan: calculate how many trusts unlocked
        let trustsUnlocked = 0;

        if (tfbaAccess) {
          program = 'tfba';
          trustsUnlocked = Math.floor(tfbaTotalPaid / 3000);
        }
        if (tfvAccess) {
          program = program || 'tfv';
          const tfvUnlocked = Math.floor(tfvTotalPaid / 1000);
          trustsUnlocked = Math.max(trustsUnlocked, tfvUnlocked);
        }

        // Cap at 3
        trustsUnlocked = Math.min(trustsUnlocked, 3);

        for (let i = 0; i < trustsUnlocked; i++) {
          unlockedTrusts.push(TRUST_ORDER[i]);
        }
      }
    }

    return new Response(JSON.stringify({
      has_access: tfvAccess || tfbaAccess,
      unlocked_trusts: [...new Set(unlockedTrusts)],
      program,
      tfv_total_paid: tfvTotalPaid,
      tfba_total_paid: tfbaTotalPaid,
      is_pif: tfvPIF || tfbaPIF,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[CHECK-TRUST-ACCESS] ERROR:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
