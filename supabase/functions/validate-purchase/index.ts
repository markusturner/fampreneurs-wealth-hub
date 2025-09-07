import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { sessionId } = await req.json();
    
    if (!sessionId) {
      throw new Error("Session ID is required");
    }

    console.log("Validating purchase session:", sessionId);

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    // Retrieve the checkout session
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (!session) {
      throw new Error("Invalid session ID");
    }

    // Check if the session was completed successfully
    if (session.payment_status !== "paid") {
      return new Response(JSON.stringify({ 
        valid: false, 
        error: "Payment not completed" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Extract plan information from the session
    const planName = session.line_items?.data?.[0]?.price?.product?.name || "Unknown Plan";
    const amount = session.amount_total || 0;
    const customerEmail = session.customer_email || session.customer_details?.email;

    console.log("Purchase validated successfully:", {
      sessionId,
      planName,
      amount,
      customerEmail
    });

    return new Response(JSON.stringify({
      valid: true,
      planName,
      amount,
      customerEmail,
      sessionId
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("Purchase validation error:", error);
    return new Response(JSON.stringify({ 
      valid: false, 
      error: error.message 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});