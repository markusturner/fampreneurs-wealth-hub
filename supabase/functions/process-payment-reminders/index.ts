import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { Resend } from "npm:resend@2.0.0";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2023-10-16",
});

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ReminderInfo {
  userId: string;
  email: string;
  subscriptionId: string;
  nextPaymentDate: Date;
  amount: number;
  tier: string;
  daysUntil: number;
  reminderType: '7_days' | '3_days' | '24_hours';
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Starting payment reminder process...");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get all active subscribers
    const { data: subscribers, error: subsError } = await supabaseClient
      .from('subscribers')
      .select('user_id, stripe_customer_id, subscription_tier, subscription_period')
      .eq('subscribed', true);

    if (subsError) {
      console.error("Error fetching subscribers:", subsError);
      throw subsError;
    }

    console.log(`Found ${subscribers?.length || 0} active subscribers`);

    const remindersToSend: ReminderInfo[] = [];
    const now = new Date();

    // Check each subscriber's upcoming payment
    for (const subscriber of subscribers || []) {
      if (!subscriber.stripe_customer_id) continue;

      try {
        // Get customer's active subscriptions from Stripe
        const subscriptions = await stripe.subscriptions.list({
          customer: subscriber.stripe_customer_id,
          status: 'active',
          limit: 10,
        });

        for (const subscription of subscriptions.data) {
          const nextPaymentDate = new Date(subscription.current_period_end * 1000);
          const daysUntil = Math.ceil((nextPaymentDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

          console.log(`Subscription ${subscription.id}: ${daysUntil} days until payment`);

          // Determine reminder type based on days until payment
          let reminderType: '7_days' | '3_days' | '24_hours' | null = null;
          
          if (daysUntil <= 1 && daysUntil >= 0) {
            reminderType = '24_hours';
          } else if (daysUntil === 3) {
            reminderType = '3_days';
          } else if (daysUntil === 7) {
            reminderType = '7_days';
          }

          if (!reminderType) continue;

          // Check if we've already sent this reminder
          const { data: existingReminder } = await supabaseClient
            .from('payment_reminders_sent')
            .select('id')
            .eq('user_id', subscriber.user_id)
            .eq('subscription_id', subscription.id)
            .eq('next_payment_date', nextPaymentDate.toISOString())
            .eq('reminder_type', reminderType)
            .single();

          if (existingReminder) {
            console.log(`Reminder already sent for ${subscriber.user_id} - ${reminderType}`);
            continue;
          }

          // Get user email
          const { data: profile } = await supabaseClient
            .from('profiles')
            .select('email')
            .eq('id', subscriber.user_id)
            .single();

          if (!profile?.email) continue;

          const amount = subscription.items.data[0]?.price?.unit_amount || 0;

          remindersToSend.push({
            userId: subscriber.user_id,
            email: profile.email,
            subscriptionId: subscription.id,
            nextPaymentDate,
            amount: amount / 100,
            tier: subscriber.subscription_tier || 'Standard',
            daysUntil,
            reminderType,
          });
        }
      } catch (error) {
        console.error(`Error processing subscriber ${subscriber.user_id}:`, error);
      }
    }

    console.log(`Sending ${remindersToSend.length} payment reminders`);

    // Send reminders
    let sentCount = 0;
    for (const reminder of remindersToSend) {
      try {
        const timeText = reminder.reminderType === '24_hours' 
          ? 'tomorrow'
          : reminder.reminderType === '3_days'
          ? 'in 3 days'
          : 'in 7 days';

        await resend.emails.send({
          from: "Payments <onboarding@resend.dev>",
          to: [reminder.email],
          subject: `Payment Reminder - Upcoming Charge ${timeText}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #333;">Payment Reminder</h2>
              <p>Hello,</p>
              <p>This is a friendly reminder that your <strong>${reminder.tier}</strong> subscription payment of <strong>$${reminder.amount.toFixed(2)}</strong> will be charged <strong>${timeText}</strong>.</p>
              <p><strong>Payment Date:</strong> ${reminder.nextPaymentDate.toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}</p>
              <p>Please ensure you have sufficient funds in your payment method to avoid any service interruption.</p>
              <p>If you need to update your payment method or have any questions, please log in to your account or contact our support team.</p>
              <p>Thank you for being a valued member!</p>
              <p style="margin-top: 30px; color: #666; font-size: 12px;">
                Best regards,<br>
                The Team
              </p>
            </div>
          `,
        });

        // Record that we sent this reminder
        await supabaseClient
          .from('payment_reminders_sent')
          .insert({
            user_id: reminder.userId,
            subscription_id: reminder.subscriptionId,
            next_payment_date: reminder.nextPaymentDate.toISOString(),
            reminder_type: reminder.reminderType,
          });

        sentCount++;
        console.log(`Sent ${reminder.reminderType} reminder to ${reminder.email}`);
      } catch (error) {
        console.error(`Failed to send reminder to ${reminder.email}:`, error);
      }
    }

    console.log(`Successfully sent ${sentCount} reminders`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        checked: subscribers?.length || 0,
        sent: sentCount 
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in process-payment-reminders:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
