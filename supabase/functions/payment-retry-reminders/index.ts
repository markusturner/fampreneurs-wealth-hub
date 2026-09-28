import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const SCHEDULE_DAYS = [1, 3, 7];

const subjectFor = (n: number) =>
  ["Your TruHeirs payment did not go through", "Quick reminder: please update your card", "Final notice: keep your TruHeirs account active"][n];

const html = (name: string, n: number, url: string) => `
<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#290a52">
  <h2 style="color:#290a52">Hi ${name},</h2>
  <p>${n === 2 ? "This is our last reminder." : "We tried to charge your card for TruHeirs, but it did not go through."} Please update your card so your family office stays active and your data stays safe.</p>
  <p style="text-align:center;margin:28px 0"><a href="${url}" style="background:#ffb500;color:#290a52;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold">Update my card</a></p>
  <p style="font-size:13px;color:#666">Questions? Just reply to this email.</p>
</div>`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2023-10-16" });
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) throw new Error("RESEND_API_KEY not configured");
    const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "TruHeirs <noreply@truheirs.app>";

    const invoices = await stripe.invoices.list({ status: "open", limit: 50, expand: ["data.customer"] });
    let sent = 0;
    for (const inv of invoices.data) {
      if (!inv.attempt_count || inv.attempt_count < 1 || !inv.subscription) continue;
      const count = Number(inv.metadata?.truheirs_reminders || 0);
      if (count >= 3) continue;
      const firstFail = inv.status_transitions?.finalized_at || inv.created;
      const days = (Date.now() / 1000 - firstFail) / 86400;
      if (days < SCHEDULE_DAYS[count]) continue;
      const customer = inv.customer as Stripe.Customer;
      const email = (customer?.email || inv.customer_email || "").trim();
      if (!email) continue;

      const portal = await stripe.billingPortal.sessions.create({ customer: customer.id, return_url: "https://truheirs.app/profile-settings" });
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from: fromEmail, to: [email], subject: subjectFor(count), html: html(customer?.name?.split(" ")[0] || "there", count, portal.url) }),
      });
      if (!res.ok) { console.error("[RETRY-REMINDERS] send failed", res.status, await res.text()); continue; }
      await stripe.invoices.update(inv.id, { metadata: { ...inv.metadata, truheirs_reminders: String(count + 1) } });
      sent++;
    }
    return new Response(JSON.stringify({ ok: true, sent }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("[RETRY-REMINDERS]", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
