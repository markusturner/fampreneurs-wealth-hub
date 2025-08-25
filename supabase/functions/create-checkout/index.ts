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
    console.log("Processing checkout request");
    
    // Get the amount from the request body
    const { amount } = await req.json();
    
    if (!amount || typeof amount !== 'number') {
      throw new Error("Valid amount is required");
    }
    
    console.log("Processing payment for amount:", amount);

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    // Determine product name based on amount
    let productName = "TruHeirs Subscription";
    if (amount === 9700) {
      productName = "TruHeirs Starter Plan";
    } else if (amount === 29700) {
      productName = "TruHeirs Professional Plan";
    } else if (amount === 49700) {
      productName = "TruHeirs Enterprise Plan";
    }

    // Create a subscription checkout session (no authentication required for guest checkout)
    const session = await stripe.checkout.sessions.create({
      customer_email: undefined, // Allow customer to enter email during checkout
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: { 
              name: productName,
              description: "Complete DIY AI family office platform"
            },
            unit_amount: amount,
            recurring: { interval: "month" },
          },
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${req.headers.get("origin")}/auth?payment=success&plan=${productName}`,
      cancel_url: `${req.headers.get("origin")}/?payment=cancelled`,
      allow_promotion_codes: true,
      billing_address_collection: 'required',
    });

    console.log("Checkout session created:", session.id);
    
    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Checkout error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});