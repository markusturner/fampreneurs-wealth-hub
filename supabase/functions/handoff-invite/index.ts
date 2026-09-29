import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders, inviteHtml, sendEmail } from "../_shared/handoff-email.ts";

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const token = (req.headers.get("Authorization") || "").replace("Bearer ", "");
    const { data: { user } } = await admin.auth.getUser(token);
    if (!user) return json({ error: "Unauthorized" }, 401);

    const { id, origin } = await req.json();
    if (typeof id !== "string") return json({ error: "id required" }, 400);
    const { data: s } = await admin.from("handoff_successors").select("*").eq("id", id).eq("owner_id", user.id).maybeSingle();
    if (!s) return json({ error: "Not found" }, 404);

    const { data: p } = await admin.from("profiles").select("full_name, display_name, first_name").eq("user_id", user.id).maybeSingle();
    const ownerName = p?.full_name || p?.display_name || p?.first_name || "A family member";
    const base = typeof origin === "string" && origin.startsWith("http") ? origin : "https://truheirs.app";
    const link = `${base}/handoff/accept/${s.token}`;
    const deadline = new Date(s.deadline + "T00:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
    await sendEmail(s.email.trim(), `${ownerName} named you as a successor`, inviteHtml(s.name, ownerName, s.role || "", deadline, link, 0, Array.isArray(s.step_list) ? s.step_list : []));
    await admin.from("handoff_successors").update({ status: s.status === "completed" ? "completed" : s.status === "overdue" ? "overdue" : s.status }).eq("id", id);
    return json({ ok: true });
  } catch (e) {
    console.error(e);
    return json({ error: (e as Error).message }, 500);
  }
});
