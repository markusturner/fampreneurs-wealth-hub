import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { user_id, title, message, notification_type, reference_id, link } = body;

    console.log(`[PUSH] ===== START OneSignal push =====`);
    console.log(`[PUSH] user_id=${user_id} type=${notification_type} ref=${reference_id} link=${link}`);
    console.log(`[PUSH] title="${title}" message="${(message ?? '').toString().substring(0, 60)}"`);

    if (!user_id) {
      console.error("[PUSH] ERROR: user_id missing");
      return new Response(JSON.stringify({ error: "user_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const appId = Deno.env.get("ONESIGNAL_APP_ID");
    const restKey = Deno.env.get("ONESIGNAL_REST_API_KEY");

    console.log(`[PUSH] OneSignal config: appId=${!!appId} restKey=${!!restKey}`);

    if (!appId || !restKey) {
      console.error("[PUSH] ERROR: Missing OneSignal secrets");
      return new Response(
        JSON.stringify({
          error: "OneSignal not configured",
          details: { ONESIGNAL_APP_ID: !!appId, ONESIGNAL_REST_API_KEY: !!restKey },
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Unread badge from DB
    const { count: unreadBadgeCount, error: countError } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user_id)
      .eq("is_read", false);

    const badgeCount = countError ? 1 : (unreadBadgeCount ?? 1);
    console.log(`[PUSH] Badge count: ${badgeCount}`);

    // Build OneSignal payload — target by External User ID (Supabase user_id)
    const payload: Record<string, unknown> = {
      app_id: appId,
      include_aliases: { external_id: [user_id] },
      target_channel: "push",
      headings: { en: title || "Notification" },
      contents: { en: message || "" },
      ios_badgeType: "SetTo",
      ios_badgeCount: badgeCount,
      data: {
        notification_type: notification_type || "general",
        reference_id: reference_id || null,
        link: link || null,
      },
    };

    if (link) {
      // Deep link when the user taps the notification
      (payload as any).url = link.startsWith("http") ? link : undefined;
      (payload as any).app_url = link;
    }

    console.log(`[PUSH] POST OneSignal /notifications for external_id=${user_id}`);
    const resp = await fetch("https://api.onesignal.com/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Key ${restKey}`,
      },
      body: JSON.stringify(payload),
    });

    const respText = await resp.text();
    let respJson: any = null;
    try { respJson = JSON.parse(respText); } catch { /* keep text */ }

    console.log(`[PUSH] OneSignal status=${resp.status} body=${respText.substring(0, 500)}`);

    if (!resp.ok) {
      return new Response(
        JSON.stringify({
          error: "OneSignal request failed",
          status: resp.status,
          details: respJson ?? respText,
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const recipients = respJson?.recipients ?? 0;
    if (recipients === 0) {
      console.warn(`[PUSH] OneSignal delivered to 0 recipients — external_id=${user_id} is not registered as a OneSignal subscription yet.`);
    }

    return new Response(
      JSON.stringify({
        sent: recipients,
        failed: 0,
        total: recipients,
        badge: badgeCount,
        onesignal_id: respJson?.id ?? null,
        results: respJson ?? null,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error(`[PUSH] EXCEPTION:`, err);
    return new Response(
      JSON.stringify({ error: (err as Error).message ?? String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
