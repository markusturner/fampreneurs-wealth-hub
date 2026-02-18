import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TEMPLATE_IDS: Record<string, string> = {
  business: Deno.env.get("GOOGLE_DOCS_TEMPLATE_BUSINESS") ?? "",
  ministry: Deno.env.get("GOOGLE_DOCS_TEMPLATE_MINISTRY") ?? "",
  family: Deno.env.get("GOOGLE_DOCS_TEMPLATE_FAMILY") ?? "",
};

// --- Google Auth: Create JWT and exchange for access token ---
async function getGoogleAccessToken(): Promise<string> {
  const serviceAccountJson = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_JSON");
  if (!serviceAccountJson) throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON not configured");

  const sa = JSON.parse(serviceAccountJson);
  const now = Math.floor(Date.now() / 1000);

  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/documents",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };

  const encode = (obj: unknown) =>
    btoa(JSON.stringify(obj)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

  const headerB64 = encode(header);
  const payloadB64 = encode(payload);
  const unsignedToken = `${headerB64}.${payloadB64}`;

  // Import the private key and sign
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

  // Exchange JWT for access token
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

// --- Google Drive: Copy template ---
async function copyTemplate(accessToken: string, templateId: string, title: string): Promise<string> {
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${templateId}/copy`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name: title }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Drive copy failed: ${errText}`);
  }

  const data = await res.json();
  return data.id;
}

// --- Google Docs: Replace placeholders ---
async function replacePlaceholders(
  accessToken: string,
  docId: string,
  replacements: Record<string, string>
): Promise<void> {
  const requests = Object.entries(replacements)
    .filter(([_, value]) => value !== undefined && value !== null)
    .map(([placeholder, value]) => ({
      replaceAllText: {
        containsText: { text: placeholder, matchCase: true },
        replaceText: String(value),
      },
    }));

  if (requests.length === 0) return;

  const res = await fetch(`https://docs.googleapis.com/v1/documents/${docId}:batchUpdate`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ requests }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Docs batchUpdate failed: ${errText}`);
  }
  await res.json(); // consume body
}

// --- Google Drive: Make document accessible via link ---
async function makeDocAccessible(accessToken: string, docId: string): Promise<void> {
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${docId}/permissions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ role: "writer", type: "anyone" }),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error("Permission set warning:", errText);
    // Non-fatal: document still accessible to service account
  } else {
    await res.json(); // consume body
  }
}

// --- Build replacement map from form data ---
function buildReplacements(trustType: string, formData: Record<string, string>): Record<string, string> {
  const r: Record<string, string> = {};

  // Helper to format date parts
  const formatDate = (dateStr: string) => {
    if (!dateStr) return { day: "", month: "", year: "", yearWritten: "" };
    const d = new Date(dateStr + "T12:00:00");
    const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
    return {
      day: String(d.getDate()),
      month: months[d.getMonth()] || "",
      year: String(d.getFullYear()),
      yearWritten: numberToWords(d.getFullYear()),
    };
  };

  const date = formatDate(formData.creation_date);
  const time = formData.creation_time
    ? `${formData.creation_time} ${formData.creation_ampm || ""}`.trim()
    : "";

  // Common placeholders across all trust types
  r["{{DAY}}"] = date.day;
  r["{{MONTH}}"] = date.month;
  r["{{YEAR}}"] = date.year;
  r["{{YEAR_WRITTEN}}"] = date.yearWritten;
  r["{{TIME}}"] = time;
  r["{{SETTLOR_NAME}}"] = formData.grantor_name || "";
  r["{{GRANTOR_NAME}}"] = formData.grantor_name || "";
  r["{{TRUSTEE_NAME}}"] = formData.trustee_name || "";
  r["{{TRUST_PROTECTOR_NAME}}"] = formData.trust_protector_name || "";
  r["{{TRUST_STREET}}"] = formData.trust_street || "";
  r["{{TRUST_SUITE}}"] = formData.trust_suite || "";
  r["{{TRUST_CITY}}"] = formData.trust_city || "";
  r["{{TRUST_STATE}}"] = formData.trust_state || "";
  r["{{TRUST_ZIP}}"] = formData.trust_zip || "";
  r["{{EIN}}"] = formData.ein || "";
  r["{{EMAIL}}"] = formData.email || "";
  r["{{FULL_NAME}}"] = formData.full_name || "";
  r["{{MAX_BOARD_TRUSTEES}}"] = formData.max_board_trustees || "";
  r["{{TCU_DOLLAR_AMOUNT}}"] = formData.tcu_dollar_amount || "";
  r["{{TCU_ALLOCATION}}"] = formData.tcu_allocation || "";
  r["{{ASSETS_LIST}}"] = formData.assets_list || "";
  r["{{BENEFICIARY_ASSET_ASSIGNMENT}}"] = formData.beneficiary_asset_assignment || "";
  r["{{FIRST_SUCCESSOR_TRUSTEE}}"] = formData.first_successor_trustee || "";
  r["{{FIRST_SUCCESSOR_PROTECTOR}}"] = formData.first_successor_protector || "";
  r["{{ADDITIONAL_TRUSTEES}}"] = formData.additional_trustees || "N/A";
  r["{{ADDITIONAL_TRUST_PROTECTORS}}"] = formData.additional_trust_protectors || "N/A";

  // Notarization
  const notDate = formatDate(formData.notarizing_date);
  r["{{NOTARIZING_DAY}}"] = notDate.day;
  r["{{NOTARIZING_MONTH}}"] = notDate.month;
  r["{{NOTARIZING_YEAR}}"] = notDate.year;
  r["{{NOTARIZING_STATE}}"] = formData.notarizing_state || "";
  r["{{NOTARIZING_COUNTY}}"] = formData.notarizing_county || "";

  // Business trust specific
  if (trustType === "business") {
    r["{{TRUST_NAME}}"] = formData.business_trust_name || "";
    r["{{BENEFICIARY_NAME}}"] = formData.family_trust_name_beneficiary || "";
    r["{{DESCENDANTS}}"] = formData.descendants || "";
    r["{{BUSINESS_TRUST_NAME_AND_DATE}}"] = formData.business_trust_name_and_date || "";
  }

  // Ministry trust specific
  if (trustType === "ministry") {
    r["{{TRUST_NAME}}"] = formData.charitable_trust_name || "";
    r["{{BENEFICIARY_NAME}}"] = formData.family_trust_name_beneficiary || "";
    r["{{COMPLIANCE_STEWARD_NAME}}"] = formData.compliance_steward_name || "";
    r["{{CHARITY_NAME}}"] = formData.charity_name || "";
    r["{{CHARITY_OWNERS}}"] = formData.charity_owners || "";
    r["{{FAMILY_TRUST_NAME_AND_DATE}}"] = formData.family_trust_name_and_date || "";
    r["{{FIRST_SUCCESSOR_COMPLIANCE_STEWARD}}"] = formData.first_successor_compliance_steward || "";
    r["{{ADDITIONAL_COMPLIANCE_STEWARDS}}"] = formData.additional_compliance_stewards || "N/A";
  }

  // Family trust specific
  if (trustType === "family") {
    r["{{TRUST_NAME}}"] = formData.trust_name || "";
    r["{{BENEFICIARY_NAME}}"] = formData.beneficiaries_names || "";
    r["{{TRUST_COUNTY}}"] = formData.trust_county || "";
    r["{{BENEFICIARY_LIVING_EXPENSES_PCT}}"] = formData.beneficiary_living_expenses_pct || "";
    r["{{BENEFICIARY_INVESTMENTS_PCT}}"] = formData.beneficiary_investments_pct || "";
    r["{{MAX_ANNUAL_GIFT}}"] = formData.max_annual_gift || "";
    r["{{EDUCATIONAL_REQUIREMENTS}}"] = formData.educational_requirements || "";
    r["{{EDUCATIONAL_REQUIREMENTS_SUMMARY}}"] = formData.educational_requirements_summary || "";
    r["{{BENEFICIARIES_NAMES}}"] = formData.beneficiaries_names || "";
    r["{{BENEFICIAL_INTEREST_DETAILS}}"] = formData.beneficial_interest_details || "";
    r["{{BENEFICIARIES_DOB}}"] = formData.beneficiaries_dob || "";
    r["{{ADDITIONAL_SUCCESSOR_TRUSTEES}}"] = formData.additional_successor_trustees || "N/A";
    r["{{ADDITIONAL_SUCCESSOR_PROTECTORS}}"] = formData.additional_successor_protectors || "N/A";
  }

  return r;
}

function numberToWords(num: number): string {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  if (num < 20) return ones[num];
  if (num < 100) return tens[Math.floor(num / 10)] + (num % 10 ? '-' + ones[num % 10] : '');
  if (num < 1000) return ones[Math.floor(num / 100)] + ' Hundred' + (num % 100 ? ' ' + numberToWords(num % 100) : '');
  if (num < 10000) return numberToWords(Math.floor(num / 1000)) + ' Thousand' + (num % 1000 ? ' ' + numberToWords(num % 1000) : '');
  return String(num);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Auth error: ${userError.message}`);
    const user = userData.user;
    if (!user) throw new Error("Not authenticated");

    const { trust_type, form_data } = await req.json();
    if (!trust_type || !form_data) throw new Error("Missing trust_type or form_data");

    const templateId = TEMPLATE_IDS[trust_type];
    if (!templateId) throw new Error(`Invalid trust type or missing template: ${trust_type}`);

    console.log(`[GENERATE-TRUST] Starting Google Docs generation for ${trust_type}`);

    // 1. Get Google access token
    const accessToken = await getGoogleAccessToken();
    console.log("[GENERATE-TRUST] Got Google access token");

    // 2. Copy template
    const trustName = form_data.business_trust_name || form_data.charitable_trust_name || form_data.trust_name || "Trust Document";
    const docTitle = `${trustName} - ${trust_type.charAt(0).toUpperCase() + trust_type.slice(1)} Trust`;
    const newDocId = await copyTemplate(accessToken, templateId, docTitle);
    console.log(`[GENERATE-TRUST] Copied template to new doc: ${newDocId}`);

    // 3. Replace placeholders
    const replacements = buildReplacements(trust_type, form_data);
    await replacePlaceholders(accessToken, newDocId, replacements);
    console.log("[GENERATE-TRUST] Replaced all placeholders");

    // 4. Make accessible
    await makeDocAccessible(accessToken, newDocId);
    console.log("[GENERATE-TRUST] Made document accessible");

    const documentUrl = `https://docs.google.com/document/d/${newDocId}/edit`;

    // 5. Save to database
    const { data: submission, error: insertError } = await supabaseClient
      .from("trust_submissions")
      .insert({
        user_id: user.id,
        trust_type,
        form_data,
        generated_document: documentUrl,
        status: "completed",
      })
      .select()
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
    }

    return new Response(JSON.stringify({
      document_url: documentUrl,
      document_id: newDocId,
      submission_id: submission?.id,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[GENERATE-TRUST] ERROR:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
