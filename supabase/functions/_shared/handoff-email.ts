export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

export const HANDOFF_STEPS = [
  { key: "accept", label: "Accept your successor role" },
  { key: "review", label: "Review the family structure and trusts" },
  { key: "contacts", label: "Confirm your contact details" },
  { key: "meeting", label: "Schedule a handoff meeting with the family" },
  { key: "acknowledge", label: "Acknowledge your responsibilities" },
];

export async function sendEmail(to: string, subject: string, html: string) {
  const key = Deno.env.get("RESEND_API_KEY");
  if (!key) throw new Error("RESEND_API_KEY not configured");
  const from = Deno.env.get("RESEND_FROM_EMAIL") || "TruHeirs <noreply@truheirs.app>";
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [to], subject, html }),
  });
  if (!res.ok) throw new Error(`Email failed [${res.status}]: ${await res.text()}`);
}

export const inviteHtml = (name: string, ownerName: string, role: string, deadline: string, url: string, reminder = 0) => `
<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#290a52">
  <h2>Hi ${name},</h2>
  <p>${reminder ? `Reminder ${reminder} of 3: ` : ""}${ownerName} has named you as a successor${role ? ` (${role})` : ""} in their TruHeirs Digital Family Office.</p>
  <p>Please complete your handoff steps by <b>${deadline}</b>.</p>
  <p style="text-align:center;margin:28px 0"><a href="${url}" style="background:#ffb500;color:#290a52;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold">Start my handoff</a></p>
  <p style="font-size:13px;color:#666">Questions? Just reply to this email.</p>
</div>`;
