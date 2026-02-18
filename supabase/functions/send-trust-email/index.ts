import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const RESEND_FROM_EMAIL = Deno.env.get("RESEND_FROM_EMAIL");
    if (!RESEND_API_KEY || !RESEND_FROM_EMAIL) {
      throw new Error("Email configuration missing");
    }

    const { trust_type, document, email, trust_label } = await req.json();
    if (!document || !email || !trust_label) {
      throw new Error("Missing required fields: document, email, trust_label");
    }

    const subject = `Your ${trust_label} Document is Ready`;

    const htmlBody = `
      <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #1a1a1a; border-bottom: 2px solid #c5a55a; padding-bottom: 10px;">
          ${trust_label} Document
        </h1>
        <p style="color: #333; font-size: 16px; line-height: 1.6;">
          Your ${trust_label} document has been successfully generated and is attached to this email as a text file.
        </p>
        <p style="color: #333; font-size: 16px; line-height: 1.6;">
          You can also download it at any time from your Trust Creation dashboard.
        </p>
        <div style="margin-top: 30px; padding: 15px; background: #f9f7f2; border-left: 4px solid #c5a55a; border-radius: 4px;">
          <p style="margin: 0; color: #666; font-size: 14px;">
            <strong>Important:</strong> This document is Privileged and Confidential. 
            Any unauthorized disclosure of its contents is strictly prohibited.
          </p>
        </div>
        <p style="margin-top: 30px; color: #999; font-size: 12px;">
          — The Fampreneurs Wealth Hub Team
        </p>
      </div>
    `;

    // Encode document as base64 for attachment
    const encoder = new TextEncoder();
    const documentBytes = encoder.encode(document);
    const base64Document = btoa(String.fromCharCode(...documentBytes));
    
    const filename = `${trust_label.replace(/\s+/g, "_")}_Document.txt`;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: RESEND_FROM_EMAIL,
        to: [email],
        subject,
        html: htmlBody,
        attachments: [
          {
            filename,
            content: base64Document,
          },
        ],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Resend API error: ${res.status} - ${errText}`);
    }

    const result = await res.json();

    return new Response(JSON.stringify({ success: true, id: result.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[SEND-TRUST-EMAIL] ERROR:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
