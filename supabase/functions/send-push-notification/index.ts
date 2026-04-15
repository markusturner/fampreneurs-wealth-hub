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
    const { user_id, title, message, notification_type, reference_id, link } =
      await req.json();

    console.log(`push_request: user=${user_id} type=${notification_type} ref=${reference_id} link=${link}`);

    if (!user_id) {
      return new Response(JSON.stringify({ error: "user_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apnsKeyId = Deno.env.get("APNS_KEY_ID");
    const apnsTeamId = Deno.env.get("APNS_TEAM_ID");
    const apnsPrivateKey = Deno.env.get("APNS_PRIVATE_KEY");
    const bundleId = Deno.env.get("APP_BUNDLE_ID");

    if (!apnsKeyId || !apnsTeamId || !apnsPrivateKey || !bundleId) {
      console.error("Missing APNs configuration secrets");
      return new Response(
        JSON.stringify({ error: "APNs not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: tokens, error: tokensError } = await supabase
      .from("push_tokens")
      .select("token, platform")
      .eq("user_id", user_id);

    if (tokensError) {
      console.error("Error fetching tokens:", tokensError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch tokens" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!tokens || tokens.length === 0) {
      console.log(`push_skip: no tokens for user=${user_id}`);
      return new Response(
        JSON.stringify({ message: "No push tokens for user" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const jwt = await createApnsJwt(apnsPrivateKey, apnsKeyId, apnsTeamId);

    let sent = 0;
    let failed = 0;

    for (const { token, platform } of tokens) {
      if (platform === "ios") {
        const apnsPayload = {
          aps: {
            alert: {
              title: title || "Notification",
              body: message || "",
            },
            sound: "default",
            badge: 1,
          },
          notification_type: notification_type || "general",
          reference_id: reference_id || null,
          link: link || null,
        };

        try {
          const response = await fetch(
            `https://api.push.apple.com/3/device/${token}`,
            {
              method: "POST",
              headers: {
                authorization: `bearer ${jwt}`,
                "apns-topic": bundleId,
                "apns-push-type": "alert",
                "apns-priority": "10",
                "content-type": "application/json",
              },
              body: JSON.stringify(apnsPayload),
            }
          );

          if (response.ok) {
            sent++;
            console.log(`push_sent: user=${user_id} type=${notification_type} token=${token.substring(0, 10)}...`);
          } else {
            failed++;
            const errorBody = await response.text();
            console.error(`push_failed: user=${user_id} status=${response.status} error=${errorBody}`);

            if (response.status === 410 || response.status === 400) {
              await supabase.from("push_tokens").delete().eq("token", token);
              console.log(`push_token_removed: token=${token.substring(0, 10)}...`);
            }
          }
        } catch (err) {
          failed++;
          console.error(`push_error: user=${user_id}`, err);
        }
      }
    }

    console.log(`push_result: user=${user_id} sent=${sent} failed=${failed}`);

    return new Response(
      JSON.stringify({ sent, failed }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in send-push-notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
