import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Sign a JWT for APNs using ES256
async function createApnsJwt(
  privateKeyPem: string,
  keyId: string,
  teamId: string
): Promise<string> {
  // Remove PEM headers and decode
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
  const payload = {
    iss: teamId,
    iat: Math.floor(Date.now() / 1000),
  };

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
    const { user_id, title, message, notification_type, reference_id } =
      await req.json();

    if (!user_id) {
      return new Response(JSON.stringify({ error: "user_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get secrets
    const apnsKeyId = Deno.env.get("APNS_KEY_ID");
    const apnsTeamId = Deno.env.get("APNS_TEAM_ID");
    const apnsPrivateKey = Deno.env.get("APNS_PRIVATE_KEY");
    const bundleId = Deno.env.get("APP_BUNDLE_ID");

    if (!apnsKeyId || !apnsTeamId || !apnsPrivateKey || !bundleId) {
      console.error("Missing APNs configuration secrets");
      return new Response(
        JSON.stringify({ error: "APNs not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Create Supabase client with service role
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get user's push tokens
    const { data: tokens, error: tokensError } = await supabase
      .from("push_tokens")
      .select("token, platform")
      .eq("user_id", user_id);

    if (tokensError) {
      console.error("Error fetching tokens:", tokensError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch tokens" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!tokens || tokens.length === 0) {
      console.log("No push tokens found for user:", user_id);
      return new Response(
        JSON.stringify({ message: "No push tokens for user" }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Create APNs JWT
    const jwt = await createApnsJwt(apnsPrivateKey, apnsKeyId, apnsTeamId);

    let sent = 0;
    let failed = 0;

    for (const { token, platform } of tokens) {
      if (platform === "ios") {
        // Send via APNs
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
            console.log("Push sent successfully to token:", token.substring(0, 10) + "...");
          } else {
            failed++;
            const errorBody = await response.text();
            console.error(
              `APNs error (${response.status}):`,
              errorBody
            );

            // Remove invalid tokens
            if (response.status === 410 || response.status === 400) {
              await supabase
                .from("push_tokens")
                .delete()
                .eq("token", token);
              console.log("Removed invalid token:", token.substring(0, 10) + "...");
            }
          }
        } catch (err) {
          failed++;
          console.error("Error sending push:", err);
        }
      }
      // Android (FCM) can be added here later
    }

    return new Response(
      JSON.stringify({ sent, failed }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in send-push-notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
