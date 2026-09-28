import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders, inviteHtml, sendEmail } from "../_shared/handoff-email.ts";

// Daily: up to 3 reminders before the deadline, then mark Overdue and alert the owner.
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: rows } = await admin.from("handoff_successors").select("*").not("status", "in", "(completed,overdue)");
  let reminders = 0, overdue = 0;
  const now = Date.now();
  for (const s of rows || []) {
    try {
      const deadline = new Date(s.deadline + "T23:59:59").getTime();
      const created = new Date(s.created_at).getTime();
      const { data: p } = await admin.from("profiles").select("full_name, display_name, email").eq("user_id", s.owner_id).maybeSingle();
      const ownerName = p?.full_name || p?.display_name || "A family member";
      if (now > deadline) {
        await admin.from("handoff_successors").update({ status: "overdue" }).eq("id", s.id);
        await admin.from("notifications").insert({
          user_id: s.owner_id, sender_id: s.owner_id, notification_type: "handoff_overdue",
          title: "Handoff overdue", message: `${s.name} did not finish their handoff by the deadline.`, is_read: false,
        });
        if (p?.email) await sendEmail(p.email, `Handoff overdue: ${s.name}`,
          `<div style="font-family:Arial,sans-serif;color:#290a52"><p>Hi ${ownerName},</p><p>${s.name} (${s.email}) did not finish their handoff steps by ${s.deadline}. They are ${s.progress}% done. Open the Handoff tab to resend or choose someone new.</p></div>`);
        overdue++;
        continue;
      }
      if (s.reminders_sent >= 3) continue;
      // Spread 3 reminders evenly between invite and deadline.
      const due = created + ((deadline - created) * (s.reminders_sent + 1)) / 4;
      if (now < due) continue;
      const link = `https://truheirs.app/handoff/accept/${s.token}`;
      const dl = new Date(s.deadline + "T00:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
      await sendEmail(s.email.trim(), `Reminder: your handoff is due ${dl}`, inviteHtml(s.name, ownerName, s.role || "", dl, link, s.reminders_sent + 1));
      await admin.from("handoff_successors").update({ reminders_sent: s.reminders_sent + 1, last_reminder_at: new Date().toISOString() }).eq("id", s.id);
      reminders++;
    } catch (e) { console.error(s.id, e); }
  }
  return new Response(JSON.stringify({ reminders, overdue }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
