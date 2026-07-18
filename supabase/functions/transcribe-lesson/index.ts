// Transcribes a classroom lesson video using Lovable AI STT.
// Only supports direct video/audio URLs (mp4, m4a, mp3, wav, webm).
// YouTube/Vimeo/Loom embeds cannot be transcribed here — audio is not extractable
// from those hosts in an edge function; the client shows a clear "unsupported" state.

import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

function isDirectMedia(url: string): boolean {
  const u = url.toLowerCase().split("?")[0];
  return /\.(mp4|m4a|mp3|wav|webm|ogg|mov|aac|flac)$/i.test(u);
}

function extForUrl(url: string): string {
  const m = url.toLowerCase().match(/\.(mp4|m4a|mp3|wav|webm|ogg|mov|aac|flac)(?:\?|$)/i);
  return m ? m[1] : "mp4";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { lessonId } = await req.json();
    if (!lessonId) {
      return new Response(JSON.stringify({ error: "lessonId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Return existing source transcript if present
    const { data: existing } = await admin
      .from("lesson_transcripts")
      .select("*")
      .eq("lesson_id", lessonId)
      .eq("is_source", true)
      .maybeSingle();

    if (existing && existing.status === "ready") {
      return new Response(JSON.stringify({ ok: true, cached: true, transcript: existing }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: lesson, error: lessonErr } = await admin
      .from("course_videos")
      .select("id, video_url")
      .eq("id", lessonId)
      .maybeSingle();

    if (lessonErr || !lesson?.video_url) {
      return new Response(JSON.stringify({ error: "Lesson or video URL not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!isDirectMedia(lesson.video_url)) {
      const row = {
        lesson_id: lessonId,
        language: "__source",
        is_source: true,
        segments: [],
        full_text: null,
        status: "unsupported",
        error: "Auto-transcription only works for direct video files (mp4, m4a, mp3, wav, webm). YouTube/Vimeo/Loom embeds are not supported.",
      };
      await admin.from("lesson_transcripts").upsert(row, { onConflict: "lesson_id,language" });
      return new Response(JSON.stringify({ ok: false, unsupported: true, ...row }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mark as processing
    await admin.from("lesson_transcripts").upsert(
      { lesson_id: lessonId, language: "__source", is_source: true, status: "processing", error: null },
      { onConflict: "lesson_id,language" },
    );

    // Download the media
    const mediaRes = await fetch(lesson.video_url);
    if (!mediaRes.ok) {
      const msg = `Failed to fetch video: ${mediaRes.status}`;
      await admin.from("lesson_transcripts").upsert(
        { lesson_id: lessonId, language: "__source", is_source: true, status: "error", error: msg },
        { onConflict: "lesson_id,language" },
      );
      return new Response(JSON.stringify({ error: msg }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const bytes = new Uint8Array(await mediaRes.arrayBuffer());
    if (bytes.length > 24 * 1024 * 1024) {
      const msg = "Video is larger than 24MB. Please use a shorter or lower-bitrate file.";
      await admin.from("lesson_transcripts").upsert(
        { lesson_id: lessonId, language: "__source", is_source: true, status: "error", error: msg },
        { onConflict: "lesson_id,language" },
      );
      return new Response(JSON.stringify({ error: msg }), {
        status: 413,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ext = extForUrl(lesson.video_url);
    const form = new FormData();
    form.append("model", "openai/gpt-4o-mini-transcribe");
    form.append("file", new Blob([bytes]), `lesson.${ext}`);
    form.append("response_format", "json");

    const sttRes = await fetch("https://ai.gateway.lovable.dev/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}` },
      body: form,
    });

    if (!sttRes.ok) {
      const errText = await sttRes.text();
      console.error("STT failed:", sttRes.status, errText);
      await admin.from("lesson_transcripts").upsert(
        { lesson_id: lessonId, language: "__source", is_source: true, status: "error", error: `Transcription failed: ${sttRes.status}` },
        { onConflict: "lesson_id,language" },
      );
      return new Response(JSON.stringify({ error: "Transcription failed", details: errText }), {
        status: sttRes.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sttJson = await sttRes.json();
    const fullText: string = sttJson.text ?? "";

    // Break into ~1 sentence segments with approximate timings for subtitle display.
    // The Lovable STT endpoint returns text only; we approximate timing by splitting
    // on sentence boundaries and distributing evenly across the media duration.
    const sentences = fullText
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter(Boolean);

    // We don't reliably know the duration server-side without ffprobe. Store
    // segments with no timings; client will render as a scrollable transcript
    // and (for direct video) sync using its own currentTime + estimated pacing.
    const wordsPerSec = 2.5;
    let cursor = 0;
    const segments = sentences.map((text) => {
      const words = text.split(/\s+/).length;
      const dur = Math.max(1.2, words / wordsPerSec);
      const start = cursor;
      cursor += dur;
      return { start, end: cursor, text };
    });

    const row = {
      lesson_id: lessonId,
      language: "__source",
      is_source: true,
      segments,
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
    console.error("transcribe-lesson error:", e);
    return new Response(JSON.stringify({ error: String((e as Error).message || e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
