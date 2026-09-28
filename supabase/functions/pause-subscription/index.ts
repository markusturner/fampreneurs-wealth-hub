import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const ACTIVE_PRICE = "price_1UK7XfKKuJwlPZFrPydOa934"; // $247/qtr
const PAUSED_PRICE = "price_1UKTmUKKuJwlPZFr7H7MN1Bw"; // $29/mo

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
    const token = (req.headers.get("Authorization") || "").replace("Bearer ", "");
    const { data: u } = await admin.auth.getUser(token);
    const user = u.user;
    if (!user?.email) return json({ error: "Please sign in again." }, 401);

    const body = await req.json().catch(() => ({}));
    const action = body?.action;
    if (action !== "pause" && action !== "resume") return json({ error: "Invalid action" }, 400);

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2023-10-16" });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    if (!customers.data.length) return json({ error: "No TruHeirs subscription found." }, 404);
    const subs = await stripe.subscriptions.list({ customer: customers.data[0].id, status: "all", limit: 20 });
    const from = action === "pause" ? ACTIVE_PRICE : PAUSED_PRICE;
    const to = action === "pause" ? PAUSED_PRICE : ACTIVE_PRICE;
    const sub = subs.data.find((s) => ["active", "trialing", "past_due"].includes(s.status) && s.items.data.some((i) => i.price.id === from));
    if (!sub) return json({ error: action === "pause" ? "No active TruHeirs subscription to pause." : "No paused subscription found." }, 404);
    const item = sub.items.data.find((i) => i.price.id === from)!;

    await stripe.subscriptions.update(sub.id, {
      items: [{ id: item.id, price: to }],
      proration_behavior: "none",
      billing_cycle_anchor: "now",
      metadata: { ...sub.metadata, truheirs_paused: action === "pause" ? "true" : "false" },
    });

    await admin.from("profiles").update(
      action === "pause"
        ? { subscription_paused: true, paused_at: new Date().toISOString(), truheirs_access: false }
        : { subscription_paused: false, paused_at: null, truheirs_access: true },
    ).eq("user_id", user.id);

    return json({ ok: true, status: action === "pause" ? "paused" : "active" });
  } catch (e) {
    console.error("[PAUSE-SUBSCRIPTION]", e);
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
