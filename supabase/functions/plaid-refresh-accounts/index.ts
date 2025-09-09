import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: userRes, error: userErr } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (userErr || !userRes.user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const user = userRes.user;

    // optional: refresh a single account
    let accountFilter: string | null = null;
    try {
      if (req.method !== "GET") {
        const body = await req.json().catch(() => ({}));
        accountFilter = body?.account_id ?? null;
      }
    } catch (_) {
      accountFilter = null;
    }

    // Load Plaid credentials
    const plaidClientId = Deno.env.get("PLAID_CLIENT_ID");
    const plaidSecret = Deno.env.get("PLAID_SECRET_KEY");
    if (!plaidClientId || !plaidSecret) {
      return new Response(JSON.stringify({ error: "Plaid credentials not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get all plaid-connected accounts for this user
    let query = supabase
      .from("connected_accounts")
      .select("id, user_id, account_name, currency, external_account_id, plaid_access_token")
      .eq("user_id", user.id)
      .eq("provider", "plaid");

    if (accountFilter) {
      query = query.eq("id", accountFilter);
    }

    const { data: accounts, error: accErr } = await query;
    if (accErr) {
      console.error("Supabase query error:", accErr);
      return new Response(JSON.stringify({ error: "Failed to load accounts" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!accounts || accounts.length === 0) {
      return new Response(JSON.stringify({ updated: 0, accounts: [] }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Determine Plaid environment from the first access token
    const token = accounts[0].plaid_access_token as string;
    const plaidEnv = token.startsWith("access-sandbox")
      ? "sandbox"
      : token.startsWith("access-development")
      ? "development"
      : "production";

    const plaidBaseUrl = {
      sandbox: "https://sandbox.plaid.com",
      development: "https://development.plaid.com",
      production: "https://production.plaid.com",
    }[plaidEnv];

    // Collect unique item access tokens (multiple accounts may share the same item)
    const byAccessToken = new Map<string, typeof accounts>();
    for (const acc of accounts) {
      const at = (acc as any).plaid_access_token as string;
      const list = (byAccessToken.get(at) ?? []) as any[];
      list.push(acc);
      byAccessToken.set(at, list as any);
    }

    let totalUpdated = 0;
    const updatedAccounts: any[] = [];

    // For each item, fetch balances and update matching connected_accounts
    for (const [accessToken, accs] of byAccessToken.entries()) {
      const payload = {
        client_id: plaidClientId,
        secret: plaidSecret,
        access_token: accessToken,
        options: {},
      };

      console.log(`Fetching balances for ${accs.length} account(s) [env=${plaidEnv}]`);

      const resp = await fetch(`${plaidBaseUrl}/accounts/balance/get`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!resp.ok) {
        const txt = await resp.text();
        console.error("Plaid balance/get error:", resp.status, txt);
        continue; // skip this item but proceed with others
      }

      const { accounts: plaidAccounts } = await resp.json();
      if (!Array.isArray(plaidAccounts)) continue;

      for (const pAcc of plaidAccounts) {
        // Try to find a matching connected account by external_account_id
        const matching = accs.find((a: any) => a.external_account_id === pAcc.account_id);
        if (!matching) continue;

        const current =
          typeof pAcc.balances.current === "number"
            ? pAcc.balances.current
            : typeof pAcc.balances.available === "number"
            ? pAcc.balances.available
            : null;

        const meta = {
          mask: pAcc.mask ?? null,
          subtype: pAcc.subtype ?? null,
          plaid_type: pAcc.type ?? null,
          official_name: pAcc.official_name ?? null,
          account_id: pAcc.account_id,
          institution_id: (pAcc as any).institution_id ?? null,
        };

        const updates: Record<string, any> = {
          last_sync: new Date().toISOString(),
          status: "connected",
          currency: pAcc.balances.iso_currency_code ?? matching.currency ?? "USD",
          metadata: meta,
        };
        if (current !== null) updates.balance = current;

        const { error: updErr } = await supabase
          .from("connected_accounts")
          .update(updates)
          .eq("user_id", user.id)
          .eq("id", matching.id);

        if (!updErr) {
          totalUpdated += 1;
          updatedAccounts.push({ id: matching.id, balance: updates.balance, currency: updates.currency });
        } else {
          console.error("Failed to update connected_accounts:", updErr);
        }
      }
    }

    return new Response(
      JSON.stringify({ updated: totalUpdated, accounts: updatedAccounts }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("Unhandled error in plaid-refresh-accounts:", e);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
