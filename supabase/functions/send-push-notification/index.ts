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

    const { data: savedSubscriptions, error: tokenError } = await supabase
      .from("push_tokens")
      .select("token, platform")
      .eq("user_id", user_id)
      .order("updated_at", { ascending: false });

    if (tokenError) {
      console.warn(`[PUSH] Could not read saved OneSignal subscriptions: ${tokenError.message}`);
    }

    const subscriptionIds = Array.from(
      new Set((savedSubscriptions ?? []).map((row: any) => row.token).filter(Boolean))
    );
    console.log(`[PUSH] Saved subscription count=${subscriptionIds.length}`);

    const basePayload: Record<string, unknown> = {
      app_id: appId,
      headings: { en: title || "Notification" },
      contents: { en: message || "" },
      priority: 10,
      ios_interruption_level: "active",
      ios_sound: "default",
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
      (basePayload as any).url = link.startsWith("http") ? link : undefined;
      (basePayload as any).app_url = link;
    }

    // First target by External User ID. If OneSignal has not attached the phone
    // to that user yet, retry directly by the saved Subscription IDs from Natively.
    const externalPayload: Record<string, unknown> = {
      ...basePayload,
      include_aliases: { external_id: [user_id] },
      target_channel: "push",
    };

    console.log(`[PUSH] POST OneSignal /notifications for external_id=${user_id}`);
    let delivery = await sendOneSignal(restKey, externalPayload);

    if (delivery.ok && (delivery.recipients ?? 0) === 0 && subscriptionIds.length > 0) {
      console.warn(`[PUSH] External ID had 0 recipients; retrying ${subscriptionIds.length} saved subscription(s).`);
      delivery = await sendOneSignal(restKey, {
        ...basePayload,
        include_subscription_ids: subscriptionIds,
      });
    }

    console.log(`[PUSH] OneSignal status=${delivery.status} body=${delivery.text.substring(0, 500)}`);

    if (!delivery.ok) {
      return new Response(
        JSON.stringify({
          error: "OneSignal request failed",
          status: delivery.status,
          details: delivery.json ?? delivery.text,
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const recipients = delivery.recipients ?? 0;
    if (recipients === 0) {
      console.warn(`[PUSH] OneSignal delivered to 0 recipients — no subscribed phone matched this user yet.`);
    }

    return new Response(
      JSON.stringify({
        sent: recipients,
        failed: recipients > 0 ? 0 : subscriptionIds.length || 1,
        total: Math.max(recipients, subscriptionIds.length || 1),
        badge: badgeCount,
        onesignal_id: delivery.json?.id ?? null,
        results: delivery.json ?? null,
        targeted_saved_subscriptions: subscriptionIds.length,
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

async function sendOneSignal(restKey: string, payload: Record<string, unknown>) {
  const resp = await fetch("https://api.onesignal.com/notifications?c=push", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Key ${restKey}`,
      },
      body: JSON.stringify(payload),
    });

    const text = await resp.text();
    let respJson: any = null;
    try { respJson = JSON.parse(text); } catch { /* keep text */ }

  return {
    ok: resp.ok,
    status: resp.status,
    text,
    json: respJson,
    recipients: Number(respJson?.recipients ?? 0),
  }
}
