import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { ghlUpsertContact, ghlAddNote } from "../_shared/ghl.ts";

// Markus AI plans (amounts in cents)
const MARKUS_PLANS: Record<string, { amount: number; interval: "month" | "year"; label: string }> = {
  monthly: { amount: 100000, interval: "month", label: "Markus AI Monthly ($1,000/mo)" },
  annual: { amount: 899700, interval: "year", label: "Markus AI Annual ($8,997/yr)" },
};
const clean = (v: unknown, max = 200) => (typeof v === "string" ? v.trim().slice(0, max) : "");

async function markusCheckout(body: any, origin: string) {
  const plan = MARKUS_PLANS[clean(body.plan, 20)];
  const firstName = clean(body.firstName, 80);
  const lastName = clean(body.lastName, 80);
  const email = clean(body.email, 200).toLowerCase();
  const phone = clean(body.phone, 40);
  const assetRange = clean(body.assetRange, 80);
  const concern = clean(body.biggestConcern, 1000);
  if (!plan) throw new Error("Pick a plan");
  if (!firstName || !lastName) throw new Error("Name is required");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("A valid email is required");
  if (phone.replace(/\D/g, "").length < 7) throw new Error("A valid phone number is required");

  const admin = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "", { auth: { persistSession: false } });
  const ghl = await ghlUpsertContact({ firstName, lastName, email, phone, tags: ["markusai"] });
  if (ghl.error) console.error("GHL upsert failed", ghl.error);
  if (ghl.id) await ghlAddNote(ghl.id, `Markus AI lead\nPlan: ${plan.label}\nAsset range: ${assetRange || "-"}\nBiggest concern: ${concern || "-"}`);
  const { data: lead } = await admin.from("markus_leads").insert({
    first_name: firstName, last_name: lastName, email, phone, plan: clean(body.plan, 20),
    asset_range: assetRange || null, biggest_concern: concern || null, ghl_contact_id: ghl.id ?? null, ghl_error: ghl.error ?? null,
  }).select("id").single();

  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", { apiVersion: "2025-08-27.basil" });
  const session = await stripe.checkout.sessions.create({
    customer_email: email,
    mode: "subscription",
    line_items: [{ quantity: 1, price_data: { currency: "usd", unit_amount: plan.amount, recurring: { interval: plan.interval }, product_data: { name: plan.label } } }],
    success_url: `${origin}/markusturnerai/thank-you`,
    cancel_url: `${origin}/markusturnerai?payment=cancelled`,
    allow_promotion_codes: true,
    metadata: { markus_flow: "true", lead_id: lead?.id ?? "", ghl_contact_id: ghl.id ?? "", first_name: firstName, last_name: lastName, email, phone, plan: clean(body.plan, 20) },
    subscription_data: { metadata: { markus_flow: "true", email } },
  });
  if (lead?.id) await admin.from("markus_leads").update({ stripe_session_id: session.id }).eq("id", lead.id);
  return session.url;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    if (body?.flow === "markus") {
      const url = await markusCheckout(body, req.headers.get("origin") || "https://truheirs.app");
      return new Response(JSON.stringify({ url }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 });
    }
    const {
      price_id,
      mode,
      email,
      firstName,
      lastName,
      zipCode,
      programName,
      programId,
    } = body;

    if (!price_id) throw new Error("price_id is required");
    if (!mode || !["subscription", "payment"].includes(mode)) throw new Error("Valid mode is required");
    if (!email) throw new Error("email is required");
    if (!firstName || !lastName) throw new Error("firstName and lastName are required");

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const origin = req.headers.get("origin") || "https://truheirs.app";

    const session = await stripe.checkout.sessions.create({
      customer_email: email,
      line_items: [{ price: price_id, quantity: 1 }],
      mode: mode as "subscription" | "payment",
      success_url: `${origin}/auth?signup=success&program=${encodeURIComponent(programName || "")}`,
      cancel_url: `${origin}/signup?payment=cancelled`,
      allow_promotion_codes: true,
      metadata: {
        signup_flow: "true",
        first_name: firstName,
        last_name: lastName,
        email: email,
        zip_code: zipCode || "",
        program_name: programName || "",
        program_id: programId || "",
      },
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("signup-create-checkout error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
