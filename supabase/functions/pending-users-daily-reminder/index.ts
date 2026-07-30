import { createClient } from "https://esm.sh/@supabase/supabase-js@2.51.0";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Pending = needs_profile_completion true OR missing first_name
    const { data: pending, error } = await supabase
      .from("profiles")
      .select("user_id, email, first_name, display_name, needs_profile_completion")
      .or("needs_profile_completion.eq.true,first_name.is.null");

    if (error) throw error;

    // Weekly cadence: skip anyone reminded in the last 7 days
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: alreadySent } = await supabase
      .from("pending_user_reminder_log")
      .select("user_id")
      .gte("sent_at", weekAgo);
    const sentToday = new Set((alreadySent || []).map((r: any) => r.user_id));

    const results: any[] = [];
    for (const u of pending || []) {
      if (!u.email || sentToday.has(u.user_id)) continue;

      const name = u.first_name || u.display_name || "there";
      const html = `<!doctype html><html><body style="font-family:Inter,Arial,sans-serif;background:#f6f3ec;padding:24px;color:#290a52;">
  <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:16px;padding:32px;">
    <h1 style="color:#290a52;margin:0 0 12px;font-size:22px;">Hi ${name}, finish setting up your TruHeirs account 👋</h1>
    <p style="font-size:15px;line-height:1.5;">You have not joined the TruHeirs community yet. It only takes a few minutes, and you get access to your courses, coaching calls, and the member community.</p>
    <div style="background:#f6f3ec;border-radius:12px;padding:16px;margin:20px 0;">
      <p style="margin:0 0 8px;font-weight:700;font-size:14px;">How to sign in</p>
      <ol style="margin:0;padding-left:18px;font-size:14px;line-height:1.6;">
        <li>Go to <a href="https://truheirs.app/auth" style="color:#2eb2ff;">truheirs.app/auth</a></li>
        <li>Use this email as your username: <strong>${u.email}</strong></li>
        <li>Enter the temporary password we sent you. Lost it? Click "Forgot password" to make a new one.</li>
        <li>Finish the short setup steps to join your community.</li>
      </ol>
    </div>
    <p style="text-align:center;margin:28px 0;">
      <a href="https://truheirs.app/auth" style="background:#ffb500;color:#290a52;text-decoration:none;font-weight:700;padding:14px 28px;border-radius:999px;display:inline-block;">Finish My Setup</a>
    </p>
    <p style="font-size:13px;color:#666;">If you've already finished, you can ignore this email. Reply if you need help — we're here for you.</p>
    <p style="font-size:13px;color:#666;margin-top:24px;">— The TruHeirs Team</p>
  </div>
</body></html>`;

      try {
        await resend.emails.send({
          from: "TruHeirs <hello@truheirs.app>",
          to: [u.email],
          subject: "Reminder: join the TruHeirs community",
          html,
        });
        await supabase.from("pending_user_reminder_log").insert({
          user_id: u.user_id,
          email: u.email,
          status: "sent",
        });
        results.push({ email: u.email, status: "sent" });
      } catch (e: any) {
        await supabase.from("pending_user_reminder_log").insert({
          user_id: u.user_id,
          email: u.email,
          status: "failed",
        });
        results.push({ email: u.email, status: "failed", error: e?.message });
      }
    }

    return new Response(JSON.stringify({ ok: true, count: results.length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error(e);
    return new Response(JSON.stringify({ error: e?.message || String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
