// Translates a lesson's source transcript into a target language and caches it.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

interface Segment { start: number; end: number; text: string }

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { lessonId, language } = await req.json();
    if (!lessonId || !language) {
      return new Response(JSON.stringify({ error: "lessonId and language are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Return cache if present
    const { data: cached } = await admin
      .from("lesson_transcripts")
      .select("*")
      .eq("lesson_id", lessonId)
      .eq("language", language)
      .maybeSingle();

    if (cached && cached.status === "ready") {
      return new Response(JSON.stringify({ ok: true, cached: true, transcript: cached }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load source
    const { data: source } = await admin
      .from("lesson_transcripts")
      .select("*")
      .eq("lesson_id", lessonId)
      .eq("is_source", true)
      .maybeSingle();

    if (!source || source.status !== "ready") {
      return new Response(JSON.stringify({ error: "Source transcript is not ready yet." }), {
        status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const segments: Segment[] = Array.isArray(source.segments) ? source.segments : [];
    if (segments.length === 0) {
      return new Response(JSON.stringify({ error: "Empty source transcript." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await admin.from("lesson_transcripts").upsert(
      { lesson_id: lessonId, language, is_source: false, status: "processing", error: null },
      { onConflict: "lesson_id,language" },
    );

    // Ask Gemini to translate each segment. Numbered list preserves 1:1 mapping.
    const numbered = segments.map((s, i) => `${i + 1}. ${s.text}`).join("\n");
    const prompt = `Translate each numbered line into ${language}. Keep the SAME numbering and the SAME number of lines. Do not merge or split lines. Output ONLY the translated numbered lines, no preamble.\n\n${numbered}`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are a professional subtitle translator. Preserve numbering exactly." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!aiRes.ok) {
      const t = await aiRes.text();
      await admin.from("lesson_transcripts").upsert(
        { lesson_id: lessonId, language, is_source: false, status: "error", error: `Translation failed: ${aiRes.status}` },
        { onConflict: "lesson_id,language" },
      );
      return new Response(JSON.stringify({ error: "Translation failed", details: t }), {
        status: aiRes.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiJson = await aiRes.json();
    const raw: string = aiJson.choices?.[0]?.message?.content ?? "";

    // Parse "N. text" lines
    const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const byIndex = new Map<number, string>();
    for (const line of lines) {
      const m = line.match(/^(\d+)[\.\)]\s*(.*)$/);
      if (m) byIndex.set(parseInt(m[1], 10), m[2]);
    }

    const translatedSegments: Segment[] = segments.map((s, i) => ({
      start: s.start,
      end: s.end,
      text: byIndex.get(i + 1) || s.text,
    }));

    const fullText = translatedSegments.map((s) => s.text).join(" ");

    const row = {
      lesson_id: lessonId,
      language,
      is_source: false,
      segments: translatedSegments,
      full_text: fullText,
      status: "ready",
      error: null,
      updated_at: new Date().toISOString(),
    };

    const { error: upErr } = await admin
      .from("lesson_transcripts")
      .upsert(row, { onConflict: "lesson_id,language" });
    if (upErr) throw upErr;

    return new Response(JSON.stringify({ ok: true, transcript: row }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("translate-lesson-transcript error:", e);
    return new Response(JSON.stringify({ error: String((e as Error).message || e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
