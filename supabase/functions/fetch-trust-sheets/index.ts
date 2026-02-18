// deno-lint-ignore-file

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SHEET_IDS: Record<string, string> = {
  business: Deno.env.get("GOOGLE_SHEET_BUSINESS") ?? "",
  ministry: Deno.env.get("GOOGLE_SHEET_MINISTRY") ?? "",
  family: Deno.env.get("GOOGLE_SHEET_FAMILY") ?? "",
};

async function getGoogleAccessToken(): Promise<string> {
  const serviceAccountJson = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_JSON");
  if (!serviceAccountJson) throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON not configured");

  const sa = JSON.parse(serviceAccountJson);
  const now = Math.floor(Date.now() / 1000);

  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/spreadsheets.readonly",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };

  const encode = (obj: unknown) =>
    btoa(JSON.stringify(obj)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

  const unsignedToken = `${encode(header)}.${encode(payload)}`;

  const pemContents = sa.private_key
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\n/g, "");
  const binaryDer = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    binaryDer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    new TextEncoder().encode(unsignedToken)
  );

  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  const jwt = `${unsignedToken}.${signatureB64}`;

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  });

  if (!tokenRes.ok) {
    const errText = await tokenRes.text();
    throw new Error(`Google token exchange failed: ${errText}`);
  }

  const tokenData = await tokenRes.json();
  return tokenData.access_token;
}

async function fetchSheetData(accessToken: string, sheetId: string): Promise<Record<string, string>[]> {
  // Fetch all data from the first sheet
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/Sheet1?majorDimension=ROWS`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!res.ok) {
    // Try "Form Responses 1" as fallback (Google Forms default sheet name)
    const res2 = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/Form%20Responses%201?majorDimension=ROWS`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );
    if (!res2.ok) {
      const errText = await res2.text();
      throw new Error(`Sheets API error for ${sheetId}: ${errText}`);
    }
    const data2 = await res2.json();
    return parseSheetRows(data2.values || []);
  }

  const data = await res.json();
  return parseSheetRows(data.values || []);
}

function parseSheetRows(values: string[][]): Record<string, string>[] {
  if (values.length < 2) return [];
  const headers = values[0];
  return values.slice(1).map((row) => {
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => {
      obj[h] = row[i] || "";
    });
    return obj;
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const trustType = url.searchParams.get("type"); // optional filter

    const accessToken = await getGoogleAccessToken();

    const typesToFetch = trustType && SHEET_IDS[trustType]
      ? { [trustType]: SHEET_IDS[trustType] }
      : SHEET_IDS;

    const results: Record<string, Record<string, string>[]> = {};

    for (const [type, sheetId] of Object.entries(typesToFetch)) {
      if (!sheetId) continue;
      try {
        results[type] = await fetchSheetData(accessToken, sheetId);
      } catch (err) {
        console.error(`Error fetching ${type} sheet:`, err);
        results[type] = [];
      }
    }

    return new Response(JSON.stringify({ submissions: results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[FETCH-TRUST-SHEETS] ERROR:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
