import { createClient } from "https://esm.sh/@supabase/supabase-js@2.51.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { comment_id } = await req.json();
    if (!comment_id) return new Response(JSON.stringify({ error: "missing comment_id" }), { status: 400, headers: corsHeaders });

    const { data: settings } = await supabase
      .from("community_manager_settings")
      .select("*")
      .limit(1)
      .maybeSingle();
    if (!settings?.reply_enabled) return new Response(JSON.stringify({ skipped: "disabled" }), { headers: corsHeaders });

    const personaUserId: string = settings.persona_user_id;

    const { data: comment } = await supabase
      .from("community_posts")
      .select("id, content, user_id, parent_id, program, category")
      .eq("id", comment_id)
      .maybeSingle();
    if (!comment || comment.user_id === personaUserId) {
      return new Response(JSON.stringify({ skipped: "self or missing" }), { headers: corsHeaders });
    }

    // Get parent post for context
    const { data: parentPost } = await supabase
      .from("community_posts")
      .select("title, content")
      .eq("id", comment.parent_id)
      .maybeSingle();

    // Call Lovable AI to generate a warm, on-brand reply
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    let replyText = "Love this 💛 thanks for sharing! Keep going — we're rooting for you.";
    if (apiKey) {
      try {
        const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              {
                role: "system",
                content: `You are Markus Turner, a warm, encouraging community manager for TruHeirs (a family business and legacy community). Reply to members in 1-3 short sentences, friendly, supportive, at a 7th-grade reading level. Use one emoji max. Never make up facts. If they ask a question you can't answer, invite them to tag the team or reply with more details.`,
              },
              {
                role: "user",
                content: `Original post: "${parentPost?.title || ""}\n${parentPost?.content || ""}"\n\nMember comment: "${comment.content}"\n\nWrite Markus's reply.`,
              },
            ],
          }),
        });
        if (aiRes.ok) {
          const j = await aiRes.json();
          const t = j?.choices?.[0]?.message?.content?.trim();
          if (t) replyText = t;
        } else {
          console.warn("AI reply non-200", aiRes.status, await aiRes.text());
        }
      } catch (e) {
        console.warn("AI reply failed", e);
      }
    }

    // Insert as a comment under the same parent post
    const { data: reply, error } = await supabase
      .from("community_posts")
      .insert({
        user_id: personaUserId,
        content: replyText,
        parent_id: comment.parent_id,
        program: comment.program,
        category: comment.category,
      })
      .select("id")
      .single();

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
    }

    await supabase.from("community_manager_reply_log").insert({
      parent_post_id: comment.parent_id,
      reply_post_id: reply.id,
      replied_to_user_id: comment.user_id,
    });

    return new Response(JSON.stringify({ ok: true, reply_id: reply.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("reply error", e);
    return new Response(JSON.stringify({ error: e?.message || String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
