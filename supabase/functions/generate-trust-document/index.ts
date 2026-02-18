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

const MINISTRY_TRUST_TEMPLATE = `YOUR NAMED CHARITABLE TRUST

THIS DECLARATION OF TRUST is made this {{DAY}} day of {{MONTH}} in the Year {{YEAR_WRITTEN}} ({{YEAR}}) at {{TIME}}, by and between {{SETTLOR_NAME}} ("Settlor"), and {{TRUSTEE_NAME}} ("Initial Trustee(s)"). {{TRUST_PROTECTOR_NAME}} is hereby appointed as the Initial Trust Protector and Trust Custodian to act in accordance with Section 1.1 of this Trust Agreement. The Settlor hereby creates this Trust for the benefit of {{BENEFICIARY_NAME}} (individually referred to herein "Beneficiary"). The Trustee(s) and Trust Protector are hereby delegated with the authority to act on behalf of {{TRUST_NAME}} as provided in the Trust Indenture.

THIS TRUST INDENTURE AUTHORIZES ITS TRUSTEE(S) TO PERFORM UNDER THE NAME OF:

{{TRUST_NAME}}

Irrevocable, Express TRUST

{{TRUST_STREET}}
{{TRUST_SUITE}}
{{TRUST_CITY}}, {{TRUST_STATE}} [{{TRUST_ZIP}}]

ARTICLE I - CLASSIFICATION OF ORGANIZATION; IRREVOCABILITY (Articles 1.1-1.5: Settlor's Establishment, Declaration of Trust, Irrevocability, Qualifications as Tax-Exempt Organization under Section 508(c)(1)(a), Operation as Non-Profit Organization)
ARTICLE II - NAME AND PURPOSE (Religious, charitable, and educational purposes)
ARTICLE III - GIFTS, TRANSFERS & PROPERTY CONTRIBUTIONS TO THE TRUST (Articles 3.1-3.2)
ARTICLE IV - BOARD OF TRUSTEE(S) (Articles 4.1-4.6: Board of Trustees, Removal/Appointment, Trust Officers, Fiduciary Monitoring, Co-Trustee, Successor Trustees)
ARTICLE V - TRUSTEES (Articles 5.1-5.27: Preservation, Care, Acquisition, Powers to Sell/Lease/Loan/Invest/Manage Securities/Borrow/Insure/Compromise, Compensation, Corporate Fiduciaries, Termination, Division, Liability, Succession, Consensus/Dispute Resolution)
ARTICLE VI - COMPLIANCE STEWARD (Articles 6.1-6.2: Designation, Successor)
ARTICLE VII - DISTRIBUTION OF ASSETS (Articles 7.1-7.4: Mandatory Charitable Contributions, Process, Compliance Protocol, Discretionary Distributions)
ARTICLE VIII - BENEFICIARIES (Articles 8.1-8.3: Charitable Beneficiary, Non-Charitable Beneficiaries, Spendthrift Provision)
ARTICLE IX - GOVERNANCE AND SUCCESSION / MEETINGS
ARTICLE X - AMENDMENT AND TERMINATION (Articles 10.1-10.2)
ARTICLE XI - MISCELLANEOUS PROVISIONS (Articles 11.1-11.5: Dispute Resolution, Liability Protection, Reporting/Compliance, Trust Accounting, Valuation of Assets)
ARTICLE XII - SEVERABILITY (Articles 12.1-12.3)
ARTICLE XIII - INTERPRETATIONS: DEFINITIONS (Articles 13.1: Trust Language, definitions for Adopted/Afterborn Persons, Beneficial Care, Incapacity, Income Beneficiary, Independent/Interested Trustee, IRC, Legal Representative, Per Stirpes, Shall/May, TCU, TCU Holder, Charitable Trust, Compliance Steward)

COMPLIANCE STEWARD: {{COMPLIANCE_STEWARD_NAME}}

SCHEDULES: Schedule A (Trust Certificate Units), Schedule B (Assets), Schedule C (Beneficiary Contact), Schedule D (Memorandum of Personal Property)
CERTIFICATES: Certificate of Trust, Trustee Acceptance, Trust Protector Acceptance, Compliance Steward Acceptance, Jurat/Acknowledgment`;

const FAMILY_TRUST_TEMPLATE = `YOUR NAMED FAMILY TRUST

THIS DECLARATION OF TRUST is made this {{DAY}} day of the {{MONTH}} Month in the Year {{YEAR_WRITTEN}} ({{YEAR}}) at {{TIME}}, by and between {{SETTLOR_NAME}} ("Settlor"), and {{TRUSTEE_NAME}} ("Trustee(s)") and {{TRUST_PROTECTOR_NAME}} ("Trust Protector") in care of {{TRUST_STREET}}, {{TRUST_SUITE}}, {{TRUST_CITY}}, {{TRUST_STATE}} [{{TRUST_ZIP}}]. The Trustee(s) and Trust Protector are hereby delegated with the authority to act on behalf of {{TRUST_NAME}} as provided in the Trust Indenture.

THIS TRUST INDENTURE AUTHORIZES ITS TRUSTEE(S) TO PERFORM UNDER THE NAME OF:

{{TRUST_NAME}}

Irrevocable Express TRUST

{{TRUST_STREET}}
{{TRUST_SUITE}}
{{TRUST_CITY}}, {{TRUST_STATE}} [{{TRUST_ZIP}}]

ARTICLE I - CLASSIFICATION OF ORGANIZATION; IRREVOCABILITY (Articles 1.1-1.2: Declaration of Trust, Irrevocability)
ARTICLE II - GIFT, TRANSFERS & PROPERTY CONTRIBUTIONS TO THE TRUST (Articles 2.1-2.4: Acceptance, Transfer of Property, Gifts into Trust, Trustee Acceptance with Trust Name/Identification/Commercial Transactions)
ARTICLE III - PURPOSE(S) (Articles 3.1-3.5: Beneficiary Benefit, Administrative Purposes, Efficient Administration, Furthering Administrative Purposes, Best Organizational Interests)
ARTICLE IV - TRUSTEE(S) (Articles 4.1-4.34: Board of Trustees, Oversight/Management, Trust Officers, Care/Acquisition of Property, Authority to Act, Powers to Retain/Sell/Lease/Loan/Invest/Manage Securities/Borrow/Insure/Compromise, No Right to Claims, Compensation, No Bond, Delegation, Liability, Resignation, Successor Trustees, Rights/Obligations, Capital/Payments, Disposition/Allocation of Principal and Income, Capital Gains, Trust Certificates, Certificate Transfers, Fiduciary Monitoring, Removal, Appointment)
ARTICLE V - BENEFICIARY(S) (Articles 5.1-5.12: The Beneficiaries, Distribution, Advisement, Gift Tax, Status, Notice of Events, Administration for Underage/Incapacitated, Beneficiaries List, Registration, Entitlement, Control of Property, Payment of Death Taxes)
ARTICLE VI - JURISDICTION (Articles 6.1-6.3: Right to Establish Trust, Natural Rights, Situs under Common Law)
ARTICLE VII - PRIVACY (Articles 7.1-7.5: Trust Privacy, Approval Process, Protection of Trust Instrument, Notices, Private Trust Indenture)
ARTICLE VIII - POWERS IN GENERAL; LIABILITY (Articles 8.1-8.3: Meetings/Statements, Hold Harmless, Dispute Resolution)
ARTICLE IX - DURATION OF TRUST (Article 9.1: Trust continues in perpetuity)
ARTICLE X - SEVERABILITY (Article 10.1)
ARTICLE XI - INTERPRETATIONS: DEFINITIONS (Article 11.1: Trust Language, definitions for Adopted/Afterborn Persons, Agreement, Beneficial Care, Certificate of Trust Units, Descendants, Default Beneficiary, Education, Incapacity, Income Beneficiary, Independent/Interested Trustee, IRC, Legal Representative, Per Stirpes, Shall/May, TCU, TCU Holder)

SCHEDULES: Schedule A (Trust Certificate Units), Schedule B (Assets), Schedule C (Beneficiary Contact), Schedule D (Memorandum of Personal Property)
CERTIFICATES: Certificate of Trust, Trustee Acceptance, Trust Protector Acceptance, Jurat/Acknowledgment`;

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
    const systemPrompt = `You are a legal document generator specializing in trust documents. You will be given a trust template outline and form data. Your job is to generate a COMPLETE, professionally formatted trust document by filling in ALL placeholder fields with the provided form data.

CRITICAL RULES:
- "Settlor" and "Grantor" are the SAME person. Wherever either term appears, use the same name provided in the form data as the Settlor/Grantor. They are interchangeable.
- Replace ALL placeholder fields (marked with {{FIELD}}) with the actual values from the form data. Do NOT leave any placeholder unfilled.
- Generate ALL articles listed in the template outline with FULL legal language — do not summarize, abbreviate, or skip any article, section, or subsection.
- Every single article and sub-article (e.g., 4.1 through 4.34, 5.1 through 5.12) must be written out in full with proper legal prose.
- Format dates properly (e.g., "22nd day of December in the Year Two Thousand Twenty-Six (2026)")
- For Ministry Charitable Trust: Include ALL articles I through XIII with full text. Article 1.4 must cover Tax-Exempt status under 508(c)(1)(a). Article 1.5 must cover Non-Profit Operation. Article VI must cover Compliance Steward. Article VII must cover Distribution of Assets with mandatory 5% charitable distributions. Article VIII must cover both Charitable and Non-Charitable Beneficiaries with spendthrift provisions.
- For Private Family Trust: Include ALL articles I through XI with full text. Article IV must include ALL trustee powers 4.1 through 4.34 written out completely. Article V must include ALL beneficiary provisions 5.1 through 5.12 including distribution allocation of 30% living expenses / 70% investments. Articles VI-IX must cover Jurisdiction under Common Law, Privacy, Powers/Liability, and Duration in perpetuity.
- For Business Trust: Include ALL standard articles for Private Unincorporated Business Trust with full legal language.
- Include Schedule A (Trust Certificate Units - 100 units total with allocation table)
- Include Schedule B (Assets - with space for listing initial trust property)
- Include Schedule C (Beneficiary Contact Information - with all beneficiary details filled in)
- Include Schedule D (Memorandum of Personal Property)
- Include a complete Certificate of Trust with all required sections
- Include Trustee Acceptance pages with full oath language and signature lines for each trustee
- Include Trust Protector Acceptance pages with full oath language and signature lines
- For Ministry Trust: Include Compliance Steward Acceptance page with oath and signature lines
- Include Jurat/Acknowledgment sections with complete notary blocks (State, County, notary lines)
- Add the confidentiality footer: "This document is Privileged and Confidential. Any unauthorized disclosure of its contents is strictly prohibited."
- The output MUST be a complete, ready-to-sign trust document. Do NOT truncate, summarize, or use "..." or "[continued]" or "etc." anywhere.
- Write out EVERY article, EVERY section, EVERY schedule, and EVERY certificate in full.`;

    const userPrompt = `Generate a complete ${trust_type === 'business' ? 'Private Unincorporated Business' : trust_type === 'ministry' ? 'Ministry Charitable' : 'Private Family'} Trust document using this template outline and data:

TEMPLATE OUTLINE:
${template}

FORM DATA:

Trust Name: ${form_data.trust_name}
Settlor/Grantor Name (these are the SAME person): ${form_data.settlor_name}
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

IMPORTANT: Generate the COMPLETE trust document with ALL articles written in full, ALL schedules, ALL certificates, and ALL acceptance pages. Do NOT abbreviate or skip any section. The Settlor and Grantor are the SAME person — use "${form_data.settlor_name}" for both.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 32000,
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
