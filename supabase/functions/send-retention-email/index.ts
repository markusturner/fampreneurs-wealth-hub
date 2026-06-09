import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@4.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Body {
  client_id: string;
  client_name: string;
  client_email: string;
  status: "at_risk" | "slipping" | "stable" | "expansion_ready";
  program?: string | null;
  signals?: { label: string; severity?: string }[];
  short_draft: string;
}

const STATUS_TONE: Record<string, { subject: string; intent: string }> = {
  at_risk: {
    subject: "Checking in — we don't want to lose momentum",
    intent: "Warm, sincere, slightly urgent. Acknowledge they've been quiet, reaffirm we're in their corner, and offer one concrete next step (a call, a resource, or a personal nudge). Do NOT sound salesy.",
  },
  slipping: {
    subject: "Quick check-in on your progress",
    intent: "Friendly and supportive. Mention you noticed engagement dipping, remind them of the value waiting for them, suggest a small re-entry step.",
  },
  stable: {
    subject: "Loving your steady progress",
    intent: "Encouraging, celebratory. Affirm what they're doing right and tease the next milestone.",
  },
  expansion_ready: {
    subject: "You're crushing it — here's what's next",
    intent: "Confident, congratulatory. Recognize their wins and invite them to the next level (referral, upgrade, advanced module).",
  },
};

async function expandToEmail(body: Body): Promise<{ subject: string; html: string; text: string }> {
  const tone = STATUS_TONE[body.status] ?? STATUS_TONE.stable;
  const signalsTxt = (body.signals ?? []).map((s) => `- ${s.label}`).join("\n") || "No specific signals.";

  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) {
    // Fallback to the short draft wrapped in an email shell
    const text = `Hi ${body.client_name.split(" ")[0]},\n\n${body.short_draft}\n\nTalk soon,\nThe TruHeirs Team`;
    return { subject: tone.subject, html: textToHtml(text), text };
  }

  const sys = `You are a warm, personal client-success writer for TruHeirs (a family wealth & trust program). Expand a short internal "text-style" save note into a longer EMAIL to the client. Keep it human, specific, and never salesy. 120-220 words. Use the client's first name. Sign off as "The TruHeirs Team". Output strictly JSON: {"subject": string, "body": string} where body is plain text with paragraph breaks.`;

  const user = `Client: ${body.client_name}
Program: ${body.program ?? "—"}
Status: ${body.status}
Tone & intent: ${tone.intent}

Signals detected:
${signalsTxt}

Internal short draft (rewrite/expand this, keep the spirit):
"""${body.short_draft}"""`;

  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: sys },
          { role: "user", content: user },
        ],
        response_format: { type: "json_object" },
      }),
    });
    if (!res.ok) throw new Error(`AI gateway ${res.status}`);
    const json = await res.json();
    const content = json.choices?.[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(content);
    const subject = parsed.subject || tone.subject;
    const text = parsed.body || body.short_draft;
    return { subject, html: textToHtml(text), text };
  } catch (e) {
    console.error("AI expand failed, using fallback:", e);
    const text = `Hi ${body.client_name.split(" ")[0]},\n\n${body.short_draft}\n\nTalk soon,\nThe TruHeirs Team`;
    return { subject: tone.subject, html: textToHtml(text), text };
  }
}

function textToHtml(text: string): string {
  const paragraphs = text
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 14px;line-height:1.6;color:#1f2937;font-size:15px;">${escapeHtml(p).replace(/\n/g, "<br/>")}</p>`)
    .join("");
  return `<!doctype html><html><body style="background:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;padding:24px;">
  <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #eef0f3;border-radius:12px;padding:28px;">
    <div style="border-bottom:2px solid #ffb500;padding-bottom:10px;margin-bottom:18px;">
      <span style="font-weight:700;color:#290a52;font-size:16px;letter-spacing:.3px;">TruHeirs</span>
    </div>
    ${paragraphs}
  </div>
</body></html>`;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Auth required" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = (await req.json()) as Body;
    if (!body?.client_email || !body?.short_draft) {
      return new Response(JSON.stringify({ error: "client_email and short_draft required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { subject, html, text } = await expandToEmail(body);

    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) {
      return new Response(JSON.stringify({ error: "RESEND_API_KEY not configured" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const resend = new Resend(resendKey);
    const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "TruHeirs <onboarding@resend.dev>";

    const sent = await resend.emails.send({
      from: fromEmail,
      to: [body.client_email],
      subject,
      html,
      text,
    });

    if ((sent as any)?.error) {
      console.error("Resend error:", (sent as any).error);
      return new Response(JSON.stringify({ error: (sent as any).error?.message ?? "Send failed" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Log
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    await admin.from("retention_messages").insert({
      client_id: body.client_id,
      status: body.status,
      channel: "email",
      draft: text,
      sent_at: new Date().toISOString(),
      sent_by: user.id,
    });

    return new Response(JSON.stringify({ success: true, subject, preview: text.slice(0, 200) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("send-retention-email error:", e);
    return new Response(JSON.stringify({ error: e?.message ?? String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
