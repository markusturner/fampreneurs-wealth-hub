import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
const usd = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);

function quarterKey(d = new Date()) {
  return `${d.getUTCFullYear()}-Q${Math.floor(d.getUTCMonth() / 3) + 1}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) throw new Error("RESEND_API_KEY not configured");
    const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "TruHeirs <noreply@truheirs.app>";
    const body = await req.json().catch(() => ({}));
    const test = body?.test === true;
    const quarter = quarterKey();
    const since = new Date(Date.now() - 92 * 86400000).toISOString();

    let targets: { user_id: string; email: string; first_name: string | null }[] = [];
    if (test) {
      const token = (req.headers.get("Authorization") || "").replace("Bearer ", "");
      const { data: u } = await admin.auth.getUser(token);
      if (!u.user) return json({ error: "Please sign in again." }, 401);
      const { data: isAdmin } = await admin.rpc("is_user_admin", { user_id: u.user.id });
      if (!isAdmin) return json({ error: "Admins only" }, 403);
      targets = [{ user_id: u.user.id, email: u.user.email!, first_name: null }];
    } else {
      const { data } = await admin.from("profiles").select("user_id, email, first_name")
        .eq("truheirs_access", true).eq("subscription_paused", false).not("email", "is", null).limit(300);
      const { data: done } = await admin.from("family_report_log").select("user_id").eq("quarter", quarter);
      const skip = new Set((done || []).map((d: any) => d.user_id));
      targets = (data || []).filter((p: any) => !skip.has(p.user_id)).slice(0, 40) as any;
    }

    let sent = 0;
    for (const t of targets) {
      const [acc, trusts, members, docs, meetings, last] = await Promise.all([
        admin.from("connected_accounts").select("balance, manual_balance_override, manual_balance_amount").eq("user_id", t.user_id),
        admin.from("trust_submissions").select("trust_type, status").eq("user_id", t.user_id),
        admin.from("family_members").select("id, created_at").eq("added_by", t.user_id),
        admin.from("family_documents").select("id, uploaded_at").eq("user_id", t.user_id),
        admin.from("meetings").select("id").eq("created_by", t.user_id).gte("created_at", since),
        admin.from("family_report_log").select("net_worth").eq("user_id", t.user_id).neq("quarter", quarter).order("sent_at", { ascending: false }).limit(1),
      ]);
      const netWorth = (acc.data || []).reduce((s: number, a: any) => s + Number(a.manual_balance_override ? a.manual_balance_amount || 0 : a.balance || 0), 0);
      const prev = last.data?.[0]?.net_worth != null ? Number(last.data[0].net_worth) : null;
      const change = prev != null ? netWorth - prev : null;
      const trustCount = (trusts.data || []).length;
      const newMembers = (members.data || []).filter((m: any) => m.created_at >= since).length;
      const newDocs = (docs.data || []).filter((d: any) => d.uploaded_at >= since).length;
      const meetingCount = (meetings.data || []).length;

      const steps: string[] = [];
      if (trustCount === 0) steps.push("Start your first trust in Trust Creation.");
      if ((acc.data || []).length === 0) steps.push("Connect a bank account to track your net worth.");
      if ((members.data || []).length < 2) steps.push("Invite family members to your family office.");
      if ((docs.data || []).length < 5) steps.push("Upload key documents like deeds and policies.");
      if (meetingCount === 0) steps.push("Hold a family meeting this quarter.");
      if (!steps.length) steps.push("Review your ownership map and move any personal-name assets into your trust.");

      const row = (label: string, value: string) => `<tr><td style="padding:8px 0;color:#666">${label}</td><td style="padding:8px 0;text-align:right;font-weight:bold;color:#290a52">${value}</td></tr>`;
      const html = `
<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#290a52">
  <div style="background:#290a52;color:#fff;padding:20px;border-radius:12px 12px 0 0"><h2 style="margin:0">Your ${quarter.replace("-", " ")} Family Report</h2></div>
  <div style="border:1px solid #eee;border-top:0;padding:20px;border-radius:0 0 12px 12px">
    <p>Hi ${t.first_name || "there"}, here is what your family built this quarter.</p>
    <h3 style="color:#ffb500;margin-bottom:4px">Net Worth</h3>
    <table style="width:100%">${row("Current net worth", usd(netWorth))}${row("Change since last report", change == null ? "First report" : `${change >= 0 ? "+" : ""}${usd(change)}`)}</table>
    <h3 style="color:#ffb500;margin-bottom:4px">Trust Progress</h3>
    <table style="width:100%">${row("Trust forms submitted", String(trustCount))}</table>
    <h3 style="color:#ffb500;margin-bottom:4px">Family Activity</h3>
    <table style="width:100%">${row("New family members", String(newMembers))}${row("New documents", String(newDocs))}${row("Meetings held", String(meetingCount))}</table>
    <h3 style="color:#ffb500;margin-bottom:4px">Next Steps</h3>
    <ul>${steps.slice(0, 3).map((s) => `<li style="margin:6px 0">${s}</li>`).join("")}</ul>
    <p style="text-align:center;margin:24px 0"><a href="https://truheirs.app/dashboard" style="background:#ffb500;color:#290a52;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold">Open my family office</a></p>
  </div>
</div>`;

      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from: fromEmail, to: [t.email.trim()], subject: `Your ${quarter.replace("-", " ")} TruHeirs Family Report`, html }),
      });
      if (!res.ok) { console.error("[FAMILY-REPORT] send failed", res.status, await res.text()); continue; }
      if (!test) await admin.from("family_report_log").insert({ user_id: t.user_id, quarter, net_worth: netWorth });
      sent++;
    }
    return json({ ok: true, sent, quarter });
  } catch (e) {
    console.error("[FAMILY-REPORT]", e);
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
