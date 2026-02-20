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

    // ─── PART 1: Stripe subscription reminders ───────────────────────────────
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

    for (const subscriber of subscribers || []) {
      if (!subscriber.stripe_customer_id) continue;

      try {
        const subscriptions = await stripe.subscriptions.list({
          customer: subscriber.stripe_customer_id,
          status: 'active',
          limit: 10,
        });

        for (const subscription of subscriptions.data) {
          const nextPaymentDate = new Date(subscription.current_period_end * 1000);
          const daysUntil = Math.ceil((nextPaymentDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

          let reminderType: '7_days' | '3_days' | '24_hours' | null = null;
          if (daysUntil <= 1 && daysUntil >= 0) reminderType = '24_hours';
          else if (daysUntil === 3) reminderType = '3_days';
          else if (daysUntil === 7) reminderType = '7_days';

          if (!reminderType) continue;

          const { data: existingReminder } = await supabaseClient
            .from('payment_reminders_sent')
            .select('id')
            .eq('user_id', subscriber.user_id)
            .eq('subscription_id', subscription.id)
            .eq('next_payment_date', nextPaymentDate.toISOString())
            .eq('reminder_type', reminderType)
            .single();

          if (existingReminder) continue;

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

    let stripeRemindersSent = 0;
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
              <p><strong>Payment Date:</strong> ${reminder.nextPaymentDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
              <p>Please ensure you have sufficient funds in your payment method to avoid any service interruption.</p>
              <p>Thank you for being a valued member!</p>
              <p style="margin-top: 30px; color: #666; font-size: 12px;">Best regards,<br>The TruHeirs Team</p>
            </div>
          `,
        });

        await supabaseClient
          .from('payment_reminders_sent')
          .insert({
            user_id: reminder.userId,
            subscription_id: reminder.subscriptionId,
            next_payment_date: reminder.nextPaymentDate.toISOString(),
            reminder_type: reminder.reminderType,
          });

        stripeRemindersSent++;
      } catch (error) {
        console.error(`Failed to send Stripe reminder to ${reminder.email}:`, error);
      }
    }

    // ─── PART 2: Manual payment plan reminders & auto-revoke ─────────────────
    const { data: paymentPlans, error: plansError } = await supabaseClient
      .from('user_payment_plans' as any)
      .select('*')
      .eq('status', 'active');

    if (plansError) {
      console.error("Error fetching payment plans:", plansError);
    }

    let planRemindersSent = 0;
    let accessRevoked = 0;

    for (const plan of paymentPlans || []) {
      if (!plan.next_payment_due) continue;

      const dueDate = new Date(plan.next_payment_due);
      const daysUntil = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      // Send reminder if 7, 3, or 1 day before due
      let shouldRemind = daysUntil === 7 || daysUntil === 3 || (daysUntil <= 1 && daysUntil >= 0);

      if (shouldRemind) {
        const lastReminder = plan.last_reminder_sent ? new Date(plan.last_reminder_sent) : null;
        const hoursSinceLastReminder = lastReminder
          ? (now.getTime() - lastReminder.getTime()) / (1000 * 60 * 60)
          : 999;

        // Don't send duplicate reminders within 12 hours
        if (hoursSinceLastReminder > 12) {
          const timeText = daysUntil <= 1 ? 'tomorrow' : `in ${daysUntil} days`;

          try {
            await resend.emails.send({
              from: "Payments <onboarding@resend.dev>",
              to: [plan.user_email],
              subject: `Payment Reminder - $${plan.installment_amount} Due ${timeText}`,
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <h2 style="color: #290a52;">Payment Reminder</h2>
                  <p>Hello,</p>
                  <p>This is a friendly reminder that your program payment of <strong>$${plan.installment_amount}</strong> is due <strong>${timeText}</strong> (${dueDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}).</p>
                  <p><strong>Program Total:</strong> $${plan.total_amount}</p>
                  <p><strong>Amount Paid So Far:</strong> $${plan.amount_paid}</p>
                  <p><strong>Remaining Balance:</strong> $${(plan.total_amount - plan.amount_paid).toFixed(2)}</p>
                  <p>Please log in to your account or contact support to make your payment and avoid any service interruption.</p>
                  <p style="margin-top: 30px; color: #666; font-size: 12px;">Best regards,<br>The TruHeirs Team</p>
                </div>
              `,
            });

            // Create in-app notification
            await supabaseClient
              .from('enhanced_notifications')
              .insert({
                recipient_id: plan.user_id,
                notification_type: 'payment_reminder',
                title: 'Payment Due Soon',
                message: `Your payment of $${plan.installment_amount} is due ${timeText}. Please log in to complete your payment.`,
                priority: daysUntil <= 1 ? 'high' : 'medium',
              });

            // Update last reminder sent
            await supabaseClient
              .from('user_payment_plans' as any)
              .update({ last_reminder_sent: now.toISOString() })
              .eq('id', plan.id);

            planRemindersSent++;
            console.log(`Sent payment reminder to ${plan.user_email} (${daysUntil} days before due)`);
          } catch (err) {
            console.error(`Failed to send plan reminder to ${plan.user_email}:`, err);
          }
        }
      }

      // Auto-revoke if payment is overdue by more than 7 days and missed_payments >= 2
      if (daysUntil < -7 && plan.missed_payments >= 2) {
        try {
          // Mark as revoked
          await supabaseClient
            .from('user_payment_plans' as any)
            .update({ status: 'revoked' })
            .eq('id', plan.id);

          // Disable user access (set truheirs_access to false in profile metadata)
          await supabaseClient
            .from('profiles')
            .update({ truheirs_access: false } as any)
            .eq('user_id', plan.user_id);

          // Send access revoked notification
          await supabaseClient
            .from('enhanced_notifications')
            .insert({
              recipient_id: plan.user_id,
              notification_type: 'access_revoked',
              title: 'Access Suspended',
              message: 'Your access has been suspended due to missed payments. Please contact support to reinstate your account.',
              priority: 'high',
            });

          // Send revocation email
          await resend.emails.send({
            from: "Payments <onboarding@resend.dev>",
            to: [plan.user_email],
            subject: 'Account Access Suspended - Payment Required',
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #dc2626;">Account Access Suspended</h2>
                <p>Hello,</p>
                <p>Your account access has been temporarily suspended due to <strong>${plan.missed_payments} missed payments</strong>.</p>
                <p><strong>Outstanding Balance:</strong> $${(plan.total_amount - plan.amount_paid).toFixed(2)}</p>
                <p>Please contact our support team immediately to reinstate your account and discuss a payment arrangement.</p>
                <p style="margin-top: 30px; color: #666; font-size: 12px;">Best regards,<br>The TruHeirs Team</p>
              </div>
            `,
          });

          accessRevoked++;
          console.log(`Access revoked for ${plan.user_email} after ${plan.missed_payments} missed payments`);
        } catch (err) {
          console.error(`Failed to revoke access for ${plan.user_email}:`, err);
        }
      } else if (daysUntil < 0) {
        // Payment is overdue — increment missed payments counter
        await supabaseClient
          .from('user_payment_plans' as any)
          .update({ missed_payments: (plan.missed_payments || 0) + 1, status: 'overdue' })
          .eq('id', plan.id);
      }
    }

    console.log(`Done. Stripe reminders: ${stripeRemindersSent}, Plan reminders: ${planRemindersSent}, Revoked: ${accessRevoked}`);

    return new Response(
      JSON.stringify({
        success: true,
        stripeSubscribersChecked: subscribers?.length || 0,
        stripeRemindersSent,
        planRemindersSent,
        accessRevoked,
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
