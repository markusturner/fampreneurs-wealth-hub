import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { Resend } from "npm:resend@2.0.0";

const generateSecurePassword = (): string => {
  const length = 14;
  const lower = "abcdefghjkmnpqrstuvwxyz";
  const upper = "ABCDEFGHJKMNPQRSTUVWXYZ";
  const digits = "23456789";
  const charset = lower + upper + digits;
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  let password =
    lower[array[0] % lower.length] +
    upper[array[1] % upper.length] +
    digits[array[2] % digits.length];
  for (let i = 3; i < length; i++) password += charset[array[i] % charset.length];
  const shuffled = password.split("");
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = array[i] % (i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.join("");
};

const buildCredentialsEmail = (firstName: string, email: string, tempPassword: string, programName: string) => `
<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1.0"><style>
body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
.container { max-width: 600px; margin: 0 auto; padding: 20px; }
.header { background-color: #290a52; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
.content { background-color: #f5f5f5; padding: 30px; border-radius: 0 0 8px 8px; }
.credentials { background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
.credential-item { margin: 15px 0; }
.label { font-weight: bold; color: #6B7280; }
.value { font-family: monospace; background-color: #F3F4F6; padding: 10px 15px; border-radius: 4px; display: block; margin-top: 5px; word-break: break-all; }
.button-container { text-align: center; margin: 30px 0; }
.button { display: inline-block; background-color: #ffb500; color: #290a52; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 18px; }
.footer { text-align: center; color: #6B7280; font-size: 12px; margin-top: 30px; }
</style></head><body><div class="container">
<div class="header"><h1 style="margin:0;font-size:28px;">Welcome to TruHeirs!</h1><p style="margin:10px 0 0;opacity:0.9;">Your account is ready</p></div>
<div class="content">
<p style="font-size:16px;">Hi ${firstName},</p>
<p style="font-size:16px;">Thank you for your purchase${programName ? ` of <strong>${programName}</strong>` : ""}! Your account has been created. Use the temporary credentials below to log in.</p>
<div class="credentials">
<div class="credential-item"><div class="label">Email:</div><div class="value">${email}</div></div>
<div class="credential-item"><div class="label">Temporary Password:</div><div class="value">${tempPassword}</div></div>
</div>
<p style="font-size:16px;"><strong style="color:#e53e3e;">⚠️ Important:</strong> Please change your password immediately after your first login from Profile Settings.</p>
<div class="button-container"><a href="https://truheirs.app/auth" class="button">Log In to Your Account</a></div>
<p style="font-size:16px;">If you have any questions, please reach out to our support team.</p>
</div>
<div class="footer"><p>This is an automated message. Please do not reply.</p></div>
</div></body></html>`;


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
