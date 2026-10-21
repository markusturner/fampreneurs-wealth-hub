import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};
const COPY_TO = "info@fampreneurs.com";
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
const esc = (t: string) => String(t).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
    const token = (req.headers.get("Authorization") || "").replace("Bearer ", "");
    if (!token) return json({ error: "Missing authorization" }, 401);
    const { data: u, error: ue } = await sb.auth.getUser(token);
    if (ue || !u.user) return json({ error: "Not authenticated" }, 401);
    const userEmail = u.user.email || "";

    const body = await req.json().catch(() => null);
    const pdf = typeof body?.pdf_base64 === "string" ? body.pdf_base64 : "";
    const filename = typeof body?.filename === "string" ? body.filename.replace(/[^\w.-]/g, "").slice(0, 120) || "Plan.pdf" : "Plan.pdf";
    const workbook = body?.mode === "workbook";
    const fullName = String(body?.full_name || "").slice(0, 200);
    const familyName = String(body?.family_name || "").slice(0, 200);
    const state = String(body?.state || "").slice(0, 100);
    if (!pdf || pdf.length > 15_000_000) return json({ error: "Invalid PDF" }, 400);

    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) return json({ error: "Email not configured" }, 500);
    const from = Deno.env.get("RESEND_FROM_EMAIL") || "TruHeirs <noreply@truheirs.app>";
    const title = workbook ? "Family Protection Workbook" : "Family Protection Plan";
    const attachments = [{ filename, content: pdf }];
    const shell = (h: string, inner: string) => `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;border:1px solid #eee;border-radius:12px;overflow:hidden">
<div style="background:#290a52;padding:20px 24px"><h2 style="color:#ffb500;margin:0">${h}</h2></div>
<div style="padding:24px;color:#222;line-height:1.5">${inner}<p style="color:#888;font-size:12px">The Fampreneurs Team</p></div></div>`;

    const send = (to: string, subject: string, html: string) => fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [to], subject, html, attachments }),
    }).then(async r => { if (!r.ok) throw new Error(`Resend ${r.status}: ${await r.text()}`); });

    const name = fullName || userEmail || "A client";
    const results = await Promise.allSettled([
      userEmail ? send(userEmail, `Your ${title}`, shell(`Your ${title}`,
        `<p>Hi ${esc(fullName || "there")},</p><p>Thank you for filling out your ${title}. Your PDF is attached to this email so you can keep it handy.</p>`)) : Promise.resolve(),
      send(COPY_TO, `${title} submitted: ${name}`, shell(`${title} Submitted`,
        `<p><strong>${esc(name)}</strong>${userEmail ? ` (${esc(userEmail)})` : ""} just filled out the ${title}.</p><p>Family: ${esc(familyName || "-")}<br/>State: ${esc(state || "-")}</p><p>The PDF copy is attached.</p>`)),
    ]);
    const failed = results.filter(r => r.status === "rejected") as PromiseRejectedResult[];
    failed.forEach(f => console.error("[EMAIL-PROTECTION-PLAN]", f.reason));
    return json({ sent_to_client: !!userEmail && results[0].status === "fulfilled", sent_copy: results[1].status === "fulfilled" }, failed.length === 2 ? 500 : 200);
  } catch (e) {
    console.error("[EMAIL-PROTECTION-PLAN]", e);
    return json({ error: "Could not send email" }, 500);
  }
});
