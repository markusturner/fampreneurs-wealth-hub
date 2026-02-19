const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SHEET_IDS: Record<string, string> = {
  business: Deno.env.get("GOOGLE_SHEET_BUSINESS") ?? "",
  ministry: Deno.env.get("GOOGLE_SHEET_MINISTRY") ?? "",
  family: Deno.env.get("GOOGLE_SHEET_FAMILY") ?? "",
};

async function fetchSheetData(sheetId: string): Promise<Record<string, string>[]> {
  if (!sheetId) return [];

  // Try service account first, fall back to public CSV export
  const serviceAccountJson = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_JSON");
  
  if (serviceAccountJson) {
    try {
      const accessToken = await getGoogleAccessToken(serviceAccountJson);
      return await fetchWithAccessToken(accessToken, sheetId);
    } catch (err) {
      console.warn("Service account failed, trying public CSV:", err);
    }
  }

  // Fallback: Use public CSV export (requires sheet to be published to web or shared as "anyone with link")
  try {
    const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;
    const res = await fetch(csvUrl);
    if (!res.ok) {
      // Try the gviz approach for sheets shared with "anyone with link"
      const gvizUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv`;
      const gvizRes = await fetch(gvizUrl);
      if (!gvizRes.ok) {
        console.error(`Failed to fetch sheet ${sheetId}: ${gvizRes.status}`);
        return [];
      }
      const csvText = await gvizRes.text();
      return parseCSV(csvText);
    }
    const csvText = await res.text();
    return parseCSV(csvText);
  } catch (err) {
    console.error(`Error fetching sheet ${sheetId} via CSV:`, err);
    return [];
  }
}

function parseCSV(csv: string): Record<string, string>[] {
  if (!csv.trim()) return [];
  
  const lines: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < csv.length; i++) {
    const char = csv[i];
    if (char === '"') {
      if (inQuotes && csv[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === '\n' && !inQuotes) {
      lines.push(current);
      current = '';
    } else if (char === '\r' && !inQuotes) {
      // skip
    } else {
      current += char;
    }
  }
  if (current) lines.push(current);
  
  if (lines.length < 2) return [];
  
  const parseRow = (line: string): string[] => {
    const fields: string[] = [];
    let field = '';
    let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        if (inQ && line[i + 1] === '"') { field += '"'; i++; }
        else { inQ = !inQ; }
      } else if (c === ',' && !inQ) {
        fields.push(field);
        field = '';
      } else {
        field += c;
      }
    }
    fields.push(field);
    return fields;
  };
  
  const headers = parseRow(lines[0]);
  return lines.slice(1).filter(l => l.trim()).map(line => {
    const values = parseRow(line);
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => { obj[h] = values[i] || ""; });
    return obj;
  });
}

async function getGoogleAccessToken(serviceAccountJson: string): Promise<string> {
  let sa: Record<string, string>;
  try {
    sa = JSON.parse(serviceAccountJson);
  } catch {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON is not valid JSON.");
  }

  if (!sa.client_email || !sa.private_key) {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON missing required fields.");
  }

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
  const binaryDer = Uint8Array.from(atob(pemContents), (c: string) => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8", binaryDer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false, ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5", cryptoKey,
    new TextEncoder().encode(unsignedToken)
  );

  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

  const jwt = `${unsignedToken}.${signatureB64}`;

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  });

  if (!tokenRes.ok) throw new Error(`Token exchange failed: ${await tokenRes.text()}`);
  const tokenData = await tokenRes.json();
  return tokenData.access_token;
}

async function fetchWithAccessToken(accessToken: string, sheetId: string): Promise<Record<string, string>[]> {
  const sheetNames = ["Sheet1", "Form Responses 1", "Form%20Responses%201"];
  
  for (const sheetName of sheetNames) {
    const encodedName = sheetName.includes("%20") ? sheetName : encodeURIComponent(sheetName);
    const res = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodedName}?majorDimension=ROWS`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (res.ok) {
      const data = await res.json();
      return parseSheetRows(data.values || []);
    }
  }

  const metaRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?fields=sheets.properties.title`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (metaRes.ok) {
    const meta = await metaRes.json();
    const firstTitle = meta?.sheets?.[0]?.properties?.title;
    if (firstTitle) {
      const res = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(firstTitle)}?majorDimension=ROWS`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      if (res.ok) {
        const data = await res.json();
        return parseSheetRows(data.values || []);
      }
    }
  }
  return [];
}

function parseSheetRows(values: string[][]): Record<string, string>[] {
  if (values.length < 2) return [];
  const headers = values[0];
  return values.slice(1).map((row) => {
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => { obj[h] = row[i] || ""; });
    return obj;
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const trustType = url.searchParams.get("type");

    const typesToFetch = trustType && SHEET_IDS[trustType]
      ? { [trustType]: SHEET_IDS[trustType] }
      : SHEET_IDS;

    const results: Record<string, Record<string, string>[]> = {};

    for (const [type, sheetId] of Object.entries(typesToFetch)) {
      if (!sheetId) continue;
      try {
        results[type] = await fetchSheetData(sheetId);
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
