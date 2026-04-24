import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

async function createApnsJwt(
  privateKeyPem: string,
  keyId: string,
  teamId: string
): Promise<string> {
  const pemBody = privateKeyPem
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s/g, "");

  const binaryKey = Uint8Array.from(atob(pemBody), (c) => c.charCodeAt(0));

  const key = await crypto.subtle.importKey(
    "pkcs8",
    binaryKey,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );

  const header = { alg: "ES256", kid: keyId };
  const payload = { iss: teamId, iat: Math.floor(Date.now() / 1000) };

  const encode = (obj: Record<string, unknown>) =>
    btoa(JSON.stringify(obj))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

  const headerB64 = encode(header);
  const payloadB64 = encode(payload);
  const signingInput = `${headerB64}.${payloadB64}`;

  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    new TextEncoder().encode(signingInput)
  );

  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  return `${headerB64}.${payloadB64}.${sigB64}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { user_id, title, message, notification_type, reference_id, link } = body;

    console.log(`[PUSH] ===== START push notification =====`);
    console.log(`[PUSH] user_id=${user_id} type=${notification_type} ref=${reference_id} link=${link}`);
    console.log(`[PUSH] title="${title}" message="${message?.substring(0, 50)}..."`);

    if (!user_id) {
      console.error("[PUSH] ERROR: user_id is missing from request body");
      return new Response(JSON.stringify({ error: "user_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check APNs configuration
    const apnsKeyId = Deno.env.get("APNS_KEY_ID");
    const apnsTeamId = Deno.env.get("APNS_TEAM_ID");
    const apnsPrivateKey = Deno.env.get("APNS_PRIVATE_KEY");
    const bundleId = Deno.env.get("APP_BUNDLE_ID");

    console.log(`[PUSH] APNs config: keyId=${!!apnsKeyId} teamId=${!!apnsTeamId} privateKey=${!!apnsPrivateKey} bundleId=${bundleId || 'MISSING'}`);

    if (!apnsKeyId || !apnsTeamId || !apnsPrivateKey || !bundleId) {
      console.error("[PUSH] ERROR: Missing APNs configuration secrets.");
      return new Response(
        JSON.stringify({ error: "APNs not configured", details: {
          APNS_KEY_ID: !!apnsKeyId,
          APNS_TEAM_ID: !!apnsTeamId,
          APNS_PRIVATE_KEY: !!apnsPrivateKey,
          APP_BUNDLE_ID: !!bundleId,
        }}),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // ── Compute accurate unread badge count from DB ──
    const { count: unreadBadgeCount, error: countError } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user_id)
      .eq("is_read", false);

    const badgeCount = countError ? 1 : (unreadBadgeCount ?? 1);
    console.log(`[PUSH] Badge count from DB: ${badgeCount} (error=${!!countError})`);

    // ── Fetch push tokens ──
    console.log(`[PUSH] Fetching push tokens for user=${user_id}`);
    const { data: tokens, error: tokensError } = await supabase
      .from("push_tokens")
      .select("token, platform")
      .eq("user_id", user_id);

    if (tokensError) {
      console.error(`[PUSH] ERROR fetching tokens:`, JSON.stringify(tokensError));
      return new Response(
        JSON.stringify({ error: "Failed to fetch tokens", details: tokensError }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[PUSH] Found ${tokens?.length || 0} token(s) for user=${user_id}`);

    if (!tokens || tokens.length === 0) {
      console.log(`[PUSH] SKIP: No push tokens registered for user=${user_id}.`);
      return new Response(
        JSON.stringify({ message: "No push tokens for user", user_id, badge: badgeCount }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    tokens.forEach((t, i) => {
      console.log(`[PUSH] Token[${i}]: platform=${t.platform} token=${t.token.substring(0, 12)}...${t.token.substring(t.token.length - 6)}`);
    });

    console.log(`[PUSH] Creating APNs JWT...`);
    const jwt = await createApnsJwt(apnsPrivateKey, apnsKeyId, apnsTeamId);
    console.log(`[PUSH] APNs JWT created successfully`);

    let sent = 0;
    let failed = 0;
    const results: Array<{ token: string; platform: string; status: string; detail?: string }> = [];

    for (const { token, platform } of tokens) {
      const tokenShort = `${token.substring(0, 12)}...`;

      if (platform === "ios") {
        const apnsPayload = {
          aps: {
            alert: {
              title: title || "Notification",
              body: message || "",
            },
            sound: "default",
            badge: badgeCount,
            "mutable-content": 1,
          },
          notification_type: notification_type || "general",
          reference_id: reference_id || null,
          link: link || null,
        };

        console.log(`[PUSH] Sending APNs: token=${tokenShort} badge=${badgeCount} payload=${JSON.stringify(apnsPayload).substring(0, 200)}`);

        try {
          const apnsUrl = `https://api.push.apple.com/3/device/${token}`;

          const response = await fetch(apnsUrl, {
            method: "POST",
            headers: {
              authorization: `bearer ${jwt}`,
              "apns-topic": bundleId,
              "apns-push-type": "alert",
              "apns-priority": "10",
              "apns-expiration": "0",
              "content-type": "application/json",
            },
            body: JSON.stringify(apnsPayload),
          });

          if (response.ok) {
            sent++;
            const apnsId = response.headers.get("apns-id") || "unknown";
            console.log(`[PUSH] SUCCESS: token=${tokenShort} apns-id=${apnsId} badge=${badgeCount}`);
            results.push({ token: tokenShort, platform, status: "sent", detail: `apns-id=${apnsId} badge=${badgeCount}` });
          } else {
            failed++;
            const errorBody = await response.text();
            console.error(`[PUSH] FAILED: token=${tokenShort} status=${response.status} body=${errorBody}`);
            results.push({ token: tokenShort, platform, status: "failed", detail: `status=${response.status} ${errorBody}` });

            if (response.status === 410 || response.status === 400) {
              console.log(`[PUSH] Removing invalid token: ${tokenShort}`);
              const { error: deleteError } = await supabase.from("push_tokens").delete().eq("token", token);
              if (deleteError) console.error(`[PUSH] Failed to delete token: ${JSON.stringify(deleteError)}`);
              else console.log(`[PUSH] Token removed: ${tokenShort}`);
            }
          }
        } catch (err) {
          failed++;
          console.error(`[PUSH] EXCEPTION token=${tokenShort}:`, err);
          results.push({ token: tokenShort, platform, status: "error", detail: String(err) });
        }
      } else {
        console.log(`[PUSH] SKIP: unsupported platform="${platform}" for token=${tokenShort}`);
        results.push({ token: tokenShort, platform, status: "skipped", detail: "unsupported platform" });
      }
    }

    console.log(`[PUSH] ===== RESULT: sent=${sent} failed=${failed} total=${tokens.length} badge=${badgeCount} =====`);

    return new Response(
      JSON.stringify({ sent, failed, total: tokens.length, badge: badgeCount, results }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[PUSH] FATAL ERROR:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
