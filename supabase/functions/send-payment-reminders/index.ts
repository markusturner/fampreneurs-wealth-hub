import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface OverduePayment {
  id: string;
  user_email: string;
  amount: number;
  days_overdue: number;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { overduePayments } = await req.json() as { overduePayments: OverduePayment[] };

    console.log(`Processing ${overduePayments.length} payment reminders`);

    for (const payment of overduePayments) {
      try {
        // Send reminder email
        await resend.emails.send({
          from: "Payments <onboarding@resend.dev>",
          to: [payment.user_email],
          subject: "Payment Reminder - Action Required",
          html: `
            <h2>Payment Reminder</h2>
            <p>This is a friendly reminder that your payment of <strong>$${payment.amount}</strong> is currently overdue by <strong>${payment.days_overdue} days</strong>.</p>
            <p>Please update your payment method as soon as possible to continue enjoying our services.</p>
            <p>If you have any questions, please don't hesitate to contact us.</p>
            <p>Best regards,<br>The Team</p>
          `,
        });

        // Update last reminder sent timestamp
        await supabaseClient
          .from('payment_reminders')
          .update({ last_reminder_sent: new Date().toISOString() })
          .eq('id', payment.id);

        console.log(`Reminder sent to ${payment.user_email}`);
      } catch (error) {
        console.error(`Failed to send reminder to ${payment.user_email}:`, error);
      }
    }

    return new Response(
      JSON.stringify({ success: true, sent: overduePayments.length }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-payment-reminders:", error);
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
