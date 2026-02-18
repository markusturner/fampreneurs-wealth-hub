import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BUSINESS_TRUST_TEMPLATE = `PRIVATE UNINCORPORATED BUSINESS TRUST

THIS DECLARATION OF TRUST is made this {{DAY}} day of {{MONTH}} in the Year {{YEAR_WRITTEN}} ({{YEAR}}) at {{TIME}}, by and between {{SETTLOR_NAME}} ("Settlor"), and {{TRUSTEE_NAME}} ("Initial Trustee(s)"). {{TRUST_PROTECTOR_NAME}} is hereby appointed as the Initial Trust Protector and Trust Custodian to act in accordance with Section 1.1 of this Trust Agreement. The Settlor hereby creates this Trust for the benefit of {{BENEFICIARY_NAME}} (individually referred to herein "Beneficiary"). The Trustee(s) and Trust Protector are hereby delegated with the authority to act on behalf of {{TRUST_NAME}} as provided in the Trust Indenture.

THIS TRUST INDENTURE AUTHORIZES ITS TRUSTEE(S) TO PERFORM UNDER THE NAME OF:

{{TRUST_NAME}}

Irrevocable, Express TRUST

{{TRUST_STREET}}
{{TRUST_SUITE}}
{{TRUST_CITY}}, {{TRUST_STATE}} [{{TRUST_ZIP}}]`;

const MINISTRY_TRUST_TEMPLATE = `MINISTRY CHARITABLE TRUST

THIS DECLARATION OF TRUST is made this {{DAY}} day of {{MONTH}} in the Year {{YEAR_WRITTEN}} ({{YEAR}}) at {{TIME}}, by and between {{SETTLOR_NAME}} ("Settlor"), and {{TRUSTEE_NAME}} ("Initial Trustee(s)"). {{TRUST_PROTECTOR_NAME}} is hereby appointed as the Initial Trust Protector and Trust Custodian to act in accordance with Section 1.1 of this Trust Agreement. The Settlor hereby creates this Trust for the benefit of {{BENEFICIARY_NAME}} (individually referred to herein "Beneficiary"). The Trustee(s) and Trust Protector are hereby delegated with the authority to act on behalf of {{TRUST_NAME}} as provided in the Trust Indenture.

THIS TRUST INDENTURE AUTHORIZES ITS TRUSTEE(S) TO PERFORM UNDER THE NAME OF:

{{TRUST_NAME}}

Irrevocable, Express TRUST

{{TRUST_STREET}}
{{TRUST_SUITE}}
{{TRUST_CITY}}, {{TRUST_STATE}} [{{TRUST_ZIP}}]

The Trust is intended to qualify as a tax-exempt organization under Section 508(c)(1)(a) of the Internal Revenue Code as a church or faith-based organization.

MINISTRY PURPOSE: {{MINISTRY_PURPOSE}}

COMPLIANCE STEWARD: {{COMPLIANCE_STEWARD_NAME}}`;

const FAMILY_TRUST_TEMPLATE = `PRIVATE FAMILY TRUST

THIS DECLARATION OF TRUST is made this {{DAY}} day of {{MONTH}} in the Year {{YEAR_WRITTEN}} ({{YEAR}}) at {{TIME}}, by and between {{SETTLOR_NAME}} ("Settlor"), and {{TRUSTEE_NAME}} ("Trustee(s)") and {{TRUST_PROTECTOR_NAME}} ("Trust Protector") in care of {{TRUST_STREET}}, {{TRUST_SUITE}}, {{TRUST_CITY}}, {{TRUST_STATE}} [{{TRUST_ZIP}}]. The Trustee(s) and Trust Protector are hereby delegated with the authority to act on behalf of {{TRUST_NAME}} as provided in the Trust Indenture.

THIS TRUST INDENTURE AUTHORIZES ITS TRUSTEE(S) TO PERFORM UNDER THE NAME OF:

{{TRUST_NAME}}

Irrevocable Express TRUST

{{TRUST_STREET}}
{{TRUST_SUITE}}
{{TRUST_CITY}}, {{TRUST_STATE}} [{{TRUST_ZIP}}]`;

const TRUST_TEMPLATES: Record<string, string> = {
  business: BUSINESS_TRUST_TEMPLATE,
  ministry: MINISTRY_TRUST_TEMPLATE,
  family: FAMILY_TRUST_TEMPLATE,
};

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

    const template = TRUST_TEMPLATES[trust_type];
    if (!template) throw new Error(`Invalid trust type: ${trust_type}`);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // Build prompt for AI to generate the complete trust document
    const systemPrompt = `You are a legal document generator specializing in trust documents. You will be given a trust template and form data. Your job is to generate a COMPLETE, professionally formatted trust document by filling in ALL placeholder fields with the provided form data. 

IMPORTANT RULES:
- Replace ALL placeholder fields (marked with {{FIELD}}) with the actual values from the form data
- Generate ALL articles, schedules, certificates, and acceptance pages
- Maintain the exact legal language from the template
- Format dates properly (e.g., "22nd day of March")
- Include all standard trust articles (Classification, Irrevocability, Gifts & Transfers, Purpose, Trustees, Trust Protector, Beneficiaries, Jurisdiction, Privacy, Powers, Duration, Severability, Definitions)
- Include Schedule A (Trust Certificate Units), Schedule B (Assets), Schedule C (Beneficiary Contact), Schedule D (Memorandum of Personal Property)
- Include Certificate of Trust with all sections
- Include Trustee Acceptance pages
- Include Trust Protector Acceptance pages
- Include Jurat/Acknowledgment sections
- The output should be a complete, ready-to-use trust document in plain text format`;

    const userPrompt = `Generate a complete ${trust_type === 'business' ? 'Private Unincorporated Business' : trust_type === 'ministry' ? 'Ministry Charitable' : 'Private Family'} Trust document using this data:

Trust Name: ${form_data.trust_name}
Settlor/Grantor Name: ${form_data.settlor_name}
Trustee Name(s): ${form_data.trustee_names?.join(', ') || form_data.trustee_name}
Trust Protector Name: ${form_data.trust_protector_name}
${trust_type === 'ministry' ? `Compliance Steward: ${form_data.compliance_steward_name || 'N/A'}` : ''}
Trust Address: ${form_data.trust_street}, ${form_data.trust_suite || ''}, ${form_data.trust_city}, ${form_data.trust_state} [${form_data.trust_zip}]
Beneficiary: ${form_data.beneficiary_name}
${form_data.beneficiary_contacts ? `Beneficiary Contacts: ${JSON.stringify(form_data.beneficiary_contacts)}` : ''}
Date: ${form_data.date_month} ${form_data.date_day}, ${form_data.date_year}
State of Jurisdiction: ${form_data.state_jurisdiction || form_data.trust_state}
County: ${form_data.county || 'N/A'}
EIN/Tax ID: ${form_data.ein || 'XX-XXXXXXX'}
${trust_type === 'ministry' ? `Ministry Purpose: ${form_data.ministry_purpose || 'Religious, charitable, and educational purposes'}` : ''}
${form_data.successor_trustees ? `Successor Trustees: ${form_data.successor_trustees.join(', ')}` : ''}
${form_data.successor_protectors ? `Successor Trust Protectors: ${form_data.successor_protectors.join(', ')}` : ''}
${form_data.initial_assets ? `Initial Assets: ${form_data.initial_assets}` : ''}

Generate the COMPLETE trust document with all articles, schedules, certificates, and acceptance pages.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        stream: false,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiResult = await response.json();
    const generatedDocument = aiResult.choices?.[0]?.message?.content || "";

    // Save to database
    const { data: submission, error: insertError } = await supabaseClient
      .from("trust_submissions")
      .insert({
        user_id: user.id,
        trust_type,
        form_data,
        generated_document: generatedDocument,
        status: "completed",
      })
      .select()
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
    }

    return new Response(JSON.stringify({
      document: generatedDocument,
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
