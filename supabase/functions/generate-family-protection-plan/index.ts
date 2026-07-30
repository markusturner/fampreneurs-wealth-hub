import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization");
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userErr } = await supabaseClient.auth.getUser(token);
    if (userErr || !userData.user) throw new Error("Not authenticated");
    const user = userData.user;

    const { form_data } = await req.json();
    if (!form_data) throw new Error("Missing form_data");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const systemPrompt = `You are an estate-planning writer. You create clear, kind, easy-to-read Family Protection Plans written at a 7th-grade reading level. Use short sentences. Avoid legal jargon. When you must use a legal term, explain it in plain words in parentheses.`;

    const userPrompt = `Create a custom Family Protection Plan document for this family. Use the answers below. Structure it with these exact sections and clear headings:

1. Family Overview
2. Our Mission & Top Goals
3. Your Risk Level (Legend)
   - First print this legend exactly, as a list:
     - Level 1 — Low Risk: Few assets exposed. Simple fixes.
     - Level 2 — Guarded: Some gaps. Fix within 6-12 months.
     - Level 3 — Elevated: Real exposure. Fix within 90 days.
     - Level 4 — High Risk: Assets could be lost now. Fix within 30 days.
     - Level 5 — Critical: One lawsuit, death, or illness could wipe you out. Fix now.
   - Then state: "Your Risk Level: X — <name>" and explain in detail WHY they are at that level, naming the exact risk types that apply to them (lawsuit/liability risk, probate risk, estate & tax risk, business risk, real estate risk, divorce or blended-family risk, incapacity risk, creditor risk, and heir-readiness risk). For each risk that applies, say what could actually happen to their family in plain words.
4. Assets We Are Protecting
5. Growth Risk: Why a Trust With No Growth Asset Loses
   - Explain that a trust holding only "sitting" assets slowly loses value to inflation, taxes, and upkeep, so heirs inherit less than expected.
   - Use their answers about growth assets. If they have none or are unsure, explain the danger clearly and give 3-5 growth options they can place inside the trust (business interest, rental property, dividend/index investments, cash-value life insurance, private lending).
6. Trust Structure & Positions
   - Explain in simple words what a Trustee, Successor Trustee, and Trust Protector each do, and why each one is needed.
   - ASSIGN a specific person to each role. If they named someone, use that name and say why they fit. If they left a role blank or said they were unsure, choose the best fit from their "trusted_people" list and explain your reasoning. If no good fit exists, recommend the type of person or a professional trustee.
   - Do not leave any role empty.
7. Beneficiaries
8. Solutions & Recommended Next Steps
   - Give clear fixes for EVERY risk you named in section 3 and for the growth gap in section 5. Number them and put the most urgent first.
9. Special Considerations
10. Important Disclaimer
   - End the document with this exact text as its own section: "This Family Protection Plan is for education only. It is not legal, tax, or financial advice, and no attorney-client relationship is created by it. Laws change and vary by state. Please review this plan with a licensed estate-planning attorney and a tax professional in your state before you act on anything in it."

Keep the whole document under 1,400 words. Use headings and short paragraphs or bullet points. Speak directly to the family ("You and your family..."). Be honest and direct about risk without scaring them, and always pair a risk with a solution.

Family answers:
${JSON.stringify(form_data, null, 2)}`;


    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: "google/gemini-3.6-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      throw new Error(`AI gateway error: ${aiRes.status} ${errText}`);
    }

    const aiData = await aiRes.json();
    const planText: string = aiData.choices?.[0]?.message?.content ?? "";
    if (!planText) throw new Error("AI returned empty plan");

    // Optionally create a Google Doc if service account is configured
    let documentUrl: string | null = null;
    const serviceAccountJson = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_JSON");
    if (serviceAccountJson) {
      try {
        const accessToken = await getGoogleAccessToken(serviceAccountJson);
        const title = `${form_data.family_name || "Family"} Protection Plan`;
        const createRes = await fetch("https://docs.googleapis.com/v1/documents", {
          method: "POST",
          headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
          body: JSON.stringify({ title }),
        });
        if (createRes.ok) {
          const doc = await createRes.json();
          const docId = doc.documentId;
          await fetch(`https://docs.googleapis.com/v1/documents/${docId}:batchUpdate`, {
            method: "POST",
            headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              requests: [{ insertText: { location: { index: 1 }, text: planText } }],
            }),
          });
          await fetch(`https://www.googleapis.com/drive/v3/files/${docId}/permissions`, {
            method: "POST",
            headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
            body: JSON.stringify({ role: "writer", type: "anyone" }),
          });
          documentUrl = `https://docs.google.com/document/d/${docId}/edit`;
        }
      } catch (e) {
        console.error("Google Doc creation skipped:", e);
      }
    }

    // Save submission
    await supabaseClient.from("trust_submissions").insert({
      user_id: user.id,
      trust_type: "family_protection_plan",
      form_data,
      generated_document: documentUrl,
      status: "completed",
    } as any);

    return new Response(JSON.stringify({ plan_text: planText, document_url: documentUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[FAMILY-PROTECTION-PLAN] ERROR:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function getGoogleAccessToken(serviceAccountJson: string): Promise<string> {
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
  const encode = (o: unknown) =>
    btoa(JSON.stringify(o)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const unsigned = `${encode(header)}.${encode(payload)}`;
  const pem = sa.private_key
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\n/g, "");
  const bin = Uint8Array.from(atob(pem), c => c.charCodeAt(0));
  const key = await crypto.subtle.importKey(
    "pkcs8", bin, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]
  );
  const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(unsigned));
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const jwt = `${unsigned}.${sigB64}`;
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  });
  if (!res.ok) throw new Error(`Google token exchange failed: ${await res.text()}`);
  const data = await res.json();
  return data.access_token;
}
