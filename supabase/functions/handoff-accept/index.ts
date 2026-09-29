import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders, HANDOFF_STEPS } from "../_shared/handoff-email.ts";

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
const stepsFor = (s: any) => Array.isArray(s.step_list) && s.step_list.length
  ? s.step_list.map((label: string, i: number) => ({ key: `s${i}`, label: String(label) }))
  : HANDOFF_STEPS;
const UUID = /^[0-9a-f-]{36}$/i;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { token, steps } = await req.json();
    if (typeof token !== "string" || !UUID.test(token)) return json({ error: "Invalid link" }, 400);
    const { data: s } = await admin.from("handoff_successors").select("*").eq("token", token).maybeSingle();
    if (!s) return json({ error: "This link is no longer valid" }, 404);

    if (steps && typeof steps === "object") {
      const list = stepsFor(s);
      const clean: Record<string, boolean> = {};
      for (const st of list) clean[st.key] = !!steps[st.key];
      const done = Object.values(clean).filter(Boolean).length;
      const progress = Math.round((done / list.length) * 100);
      const completed = progress === 100;
      const status = completed ? "completed" : s.status === "overdue" ? "overdue" : "in_progress";
      await admin.from("handoff_successors").update({
        steps: clean, progress, status, completed_at: completed ? new Date().toISOString() : null,
        opened_at: s.opened_at || new Date().toISOString(),
      }).eq("id", s.id);
      return json({ ok: true, progress, status });
    }

    if (!s.opened_at) {
      await admin.from("handoff_successors").update({ opened_at: new Date().toISOString(), status: s.status === "sent" ? "opened" : s.status }).eq("id", s.id);
    }
    const { data: p } = await admin.from("profiles").select("full_name, display_name").eq("user_id", s.owner_id).maybeSingle();
    return json({
      name: s.name, role: s.role, deadline: s.deadline, status: s.status, progress: s.progress,
      steps: s.steps || {}, stepList: stepsFor(s), ownerName: p?.full_name || p?.display_name || "Your family",
    });
  } catch (e) {
    console.error(e);
    return json({ error: (e as Error).message }, 500);
  }
});
