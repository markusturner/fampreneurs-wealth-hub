import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { name } = await req.json();
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return new Response(JSON.stringify({ error: "Name is required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `You are a professional translator and name transliterator. Given an English trust name, render it naturally in every requested language.

IMPORTANT RULES:
- For English, return the name exactly as provided
- Preserve actual personal names, business names, initials, and acronyms; transliterate them when the target language uses a different script
- Translate meaningful common words in the trust name, including words such as Family, Legacy, Heritage, Ministry, Business, Estate, and Foundation
- Spanish, French, and Portuguese MUST translate all meaningful common English words into that language. They may match English only when the entire input consists solely of proper names, initials, or acronyms
- Hebrew, Greek, and Arabic must use their native scripts and translate meaningful common words rather than merely copying English
- Return ONLY the rendered trust name — do not add explanations or words that were not present in the input
- Example: "ABC Family Legacy" must keep "ABC" but translate "Family Legacy" in Spanish, French, and Portuguese
- For Latin, do NOT copy the English spelling. Produce a genuine Latinized form of the name using classical Latin orthography and masculine/feminine nominative endings (e.g., "John Smith" -> "Ioannes Faber", "Mary Baker" -> "Maria Pistoria", "David" -> "David", "Michael" -> "Michael", "James" -> "Iacobus", "Verona" -> "Verona"). Use the classical Latin equivalent of the given name when one exists, and Latinize surnames with -us/-a/-ius endings. Latin must never be identical to the English answer unless the name is already Latin.

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
          { role: "user", content: `Name: ${name.trim()}` },
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
