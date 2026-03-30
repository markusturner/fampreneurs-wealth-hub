import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { name, trustType } = await req.json();
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return new Response(JSON.stringify({ error: "Name is required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!trustType || !["family", "business", "ministry"].includes(trustType)) {
      return new Response(JSON.stringify({ error: "Invalid trust type" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const trustLabels: Record<string, string> = {
      family: "Private Family Trust",
      business: "Private Unincorporated Business Trust",
      ministry: "Tax-Exempt Ministry Charitable Trust",
    };

    const systemPrompt = `You are a professional legal trust name translator. Given a person's name and trust type, create the full official trust name in English first, then translate the ENTIRE trust name (including the person's name transliterated into each language's script) into each target language.

The English trust name format is: "[Name] ${trustLabels[trustType]}"

IMPORTANT RULES:
- Transliterate the person's name into each language's native script (e.g., Hebrew script for Hebrew, Greek script for Greek, Arabic script for Arabic)
- Translate ALL words including "Private", "Family", "Trust", "Business", "Ministry", "Charitable", "Tax-Exempt", "Unincorporated" into the target language
- The result for each language should be fully written in that language's script and words — do NOT mix English words in
- For Latin, use proper Latin legal terminology
- Each translation should read naturally as a formal legal trust name in that language

Return ONLY a valid JSON object with this exact structure (no markdown, no code blocks):
{
  "english": "...",
  "latin": "...",
  "hebrew": "...",
  "greek": "...",
  "spanish": "...",
  "french": "...",
  "portuguese": "...",
  "arabic": "..."
}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Name: ${name.trim()}\nTrust Type: ${trustType}` },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again later." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required, please add funds." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI translation failed" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    // Parse the JSON from the response
    let translations;
    try {
      // Strip markdown code blocks if present
      const cleaned = content.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
      translations = JSON.parse(cleaned);
    } catch {
      console.error("Failed to parse translations:", content);
      return new Response(JSON.stringify({ error: "Failed to parse translation results" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ translations }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("translate-trust-name error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
