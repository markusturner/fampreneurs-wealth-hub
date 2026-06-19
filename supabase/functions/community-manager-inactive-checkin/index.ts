import { createClient } from "https://esm.sh/@supabase/supabase-js@2.51.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CHECKIN_TEMPLATES = [
  (name: string) => `Hey ${name} — Markus here. It's been a minute since I've seen you active in the community. Just checking in to make sure everything's good on your end. Anything I can help unblock this week?`,
  (name: string) => `${name}, just thinking about you. Haven't seen you around lately — how are things going? If anything's stuck or unclear, hit me back and let's get you moving again.`,
  (name: string) => `${name}, quick check-in 👋 — wanted to make sure nothing fell through the cracks for your family. Want to hop on a 15-min call this week to dust things off? No pressure either way.`,
];

function pickTemplate(uid: string, name: string) {
  let h = 0;
  for (const c of uid) h = (h * 31 + c.charCodeAt(0)) | 0;
  const idx = Math.abs(h) % CHECKIN_TEMPLATES.length;
  return CHECKIN_TEMPLATES[idx](name.split(" ")[0] || name);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: settings } = await supabase
      .from("community_manager_settings")
      .select("*")
      .limit(1)
      .maybeSingle();

    if (!settings?.enabled || !settings.persona_user_id) {
      return new Response(JSON.stringify({ skipped: "disabled or no persona" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const persona = settings.persona_user_id;

    // Read cached client retention payload to find inactive clients
    const { data: cache } = await supabase
      .from("platform_settings")
      .select("setting_value")
      .eq("setting_key", "client_retention_cache")
      .maybeSingle();
    if (!cache?.setting_value) {
      return new Response(JSON.stringify({ skipped: "no retention cache yet" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    let payload: any;
    try { payload = JSON.parse(cache.setting_value); } catch { payload = null; }
    const clients = payload?.clients ?? [];

    // Don't repeat a check-in within 14 days
    const since = new Date(Date.now() - 14 * 86400000).toISOString();
    const { data: recent } = await supabase
      .from("community_manager_checkin_log")
      .select("user_id, sent_at")
      .gte("sent_at", since);
    const recentlyMessaged = new Set(((recent || []) as any[]).map((r) => r.user_id));

    const sent: any[] = [];
    for (const c of clients) {
      if (recentlyMessaged.has(c.user_id)) continue;
      if (c.status !== "at_risk" && c.status !== "slipping") continue;
      // Use last_active_at if present, else community days metric
      const lastActiveDays = c.last_active_at
        ? Math.floor((Date.now() - new Date(c.last_active_at).getTime()) / 86400000)
        : (Number(c.metrics?.last_community_days) || 999);
      if (lastActiveDays < 21) continue;

      const body = pickTemplate(c.user_id, c.full_name || "friend");

      const { error: dmErr } = await supabase.from("direct_messages").insert({
        sender_id: persona,
        recipient_id: c.user_id,
        content: body,
      });
      if (dmErr) {
        sent.push({ user_id: c.user_id, error: dmErr.message });
        continue;
      }

      await supabase.from("community_manager_checkin_log").insert({
        user_id: c.user_id,
        reason: `inactive ${lastActiveDays}d (${c.status})`,
      });

      sent.push({ user_id: c.user_id, name: c.full_name, days_inactive: lastActiveDays });
    }

    return new Response(JSON.stringify({ ok: true, sent_count: sent.length, sent }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("inactive-checkin error", e);
    return new Response(JSON.stringify({ error: e?.message || String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
