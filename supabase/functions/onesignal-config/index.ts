const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Returns the public OneSignal App ID so the web app never hardcodes it.
Deno.serve((req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const appId = Deno.env.get("ONESIGNAL_APP_ID") ?? null;
  return new Response(JSON.stringify({ app_id: appId }), {
    status: appId ? 200 : 500,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
