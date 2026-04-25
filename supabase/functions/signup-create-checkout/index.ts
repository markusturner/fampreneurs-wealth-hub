import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      price_id,
      mode,
      email,
      firstName,
      lastName,
      zipCode,
      programName,
      programId,
    } = await req.json();

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
