import { createClient } from "https://esm.sh/@supabase/supabase-js@2.51.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PROGRAMS = ["fbu", "tfv", "tfba", "tffm"];

const PROGRAM_NAMES: Record<string, string> = {
  fbu: "Family Business University",
  tfv: "The Family Vault",
  tfba: "The Family Business Accelerator",
  tffm: "The Family Fortune Mastermind",
};

type Generated = { title: string; body: string; replyToKey?: string };
type Cadence = "monthly" | "as_needed";
type TemplateDef = {
  key: string;
  category: string;
  cadence: Cadence;
  generate: (supabase: any, program: string) => Promise<Generated | null>;
};

const REQUIRED_TRUST_TYPES = ["family", "business"];

async function getOnboardedUserIds(supabase: any, userIds: string[]): Promise<Set<string>> {
  if (!userIds.length) return new Set();
  const { data } = await supabase
    .from("onboarding_responses")
    .select("user_id")
    .in("user_id", userIds);
  return new Set((data || []).map((d: any) => d.user_id));
}

async function getRecentOnboardedNewMembers(supabase: any, program: string) {
  const since = new Date(Date.now() - 7 * 86400000).toISOString();
  const programName = PROGRAM_NAMES[program];
  const { data } = await supabase
    .from("profiles")
    .select("user_id, display_name, first_name, last_name, city, state, created_at, program_name")
    .gte("created_at", since)
    .ilike("program_name", `%${programName}%`)
    .order("created_at", { ascending: false })
    .limit(25);
  const list = (data || []) as any[];
  if (!list.length) return [];
  const onboarded = await getOnboardedUserIds(supabase, list.map((m) => m.user_id));
  return list.filter((m) => onboarded.has(m.user_id)).slice(0, 15);
}

function nameOf(p: any) {
  return p.display_name || [p.first_name, p.last_name].filter(Boolean).join(" ") || "A new member";
}

const TEMPLATES: TemplateDef[] = [
  {
    key: "student_of_the_month",
    category: "wins",
    cadence: "monthly",
    generate: async (supabase) => {
      const since = new Date(Date.now() - 30 * 86400000).toISOString();
      const [tsRes, spRes] = await Promise.all([
        supabase.from("trust_submissions").select("user_id, submitter_name, created_at").gte("created_at", since),
        supabase.from("succession_progress").select("user_id, status, updated_at").gte("updated_at", since),
      ]);
      const counts = new Map<string, { score: number; name?: string }>();
      for (const r of (tsRes.data || []) as any[]) {
        const c = counts.get(r.user_id) || { score: 0, name: r.submitter_name };
        c.score += 2;
        if (r.submitter_name) c.name = r.submitter_name;
        counts.set(r.user_id, c);
      }
      for (const r of (spRes.data || []) as any[]) {
        if (r.status !== "completed") continue;
        const c = counts.get(r.user_id) || { score: 0 };
        c.score += 1;
        counts.set(r.user_id, c);
      }
      const top = [...counts.entries()].sort((a, b) => b[1].score - a[1].score)[0];
      if (!top) return null;
      let name = top[1].name;
      if (!name) {
        const { data: p } = await supabase
          .from("profiles")
          .select("display_name, first_name, last_name")
          .eq("user_id", top[0])
          .maybeSingle();
        name = p ? nameOf(p) : "One of our standout members";
      }
      return {
        title: "🌟 Student of the Month",
        body: `Huge shout-out to **${name}** for being our Student of the Month! 🎉

They've been showing up — completing trust submissions and pushing their succession plan forward over the last 30 days. That's exactly the kind of momentum legacy is built on.

Drop a 🔥 in the comments to celebrate them 👇`,
      };
    },
  },
  {
    key: "welcome_new_members",
    category: "discussion",
    cadence: "as_needed",
    generate: async (supabase, program) => {
      const members = await getRecentOnboardedNewMembers(supabase, program);
      if (members.length === 0) return null;
      const list = members
        .slice(0, 10)
        .map((m) => {
          const loc = [m.city, m.state].filter(Boolean).join(", ");
          return `- **${nameOf(m)}**${loc ? ` — ${loc}` : ""}`;
        })
        .join("\n");
      return {
        title: "👋 Welcome to our newest members!",
        body: `Big welcome to the family members who joined this week! 💛

${list}

**Quick start:**
- Drop a hello in the comments and tell us where you're from
- Share one goal you want to hit this quarter
- Open the Classroom and start Week 1 of Legacy Launchpad

Reply below — let's get to know you 👇`,
      };
    },
  },
  {
    key: "new_member_orientation",
    category: "discussion",
    cadence: "as_needed",
    generate: async (supabase, program) => {
      const members = await getRecentOnboardedNewMembers(supabase, program);
      if (members.length === 0) return null;
      const today = new Date().toISOString().slice(0, 10);
      const { data: meeting } = await supabase
        .from("meetings")
        .select("title, meeting_date, meeting_time")
        .gte("meeting_date", today)
        .order("meeting_date", { ascending: true })
        .limit(1)
        .maybeSingle();
      const meetingLine = meeting
        ? `📅 This week's live call: **${meeting.title}** on ${meeting.meeting_date}${meeting.meeting_time ? ` at ${meeting.meeting_time}` : ""}. Find it in the Calendar tab.`
        : `📅 Check the Calendar tab for this week's live call.`;
      return {
        title: "🧭 New Member Orientation — Start Here",
        body: `Welcome again to everyone who just joined 👋

Two things to lock in this week:

1. ${meetingLine}
2. 🎓 Open the **Classroom** and start **Week 1 of Legacy Launchpad** — it's the foundation everything else builds on.

Do those two and you're already ahead of 90% of new members. Reply below once you've started Week 1 👇`,
        replyToKey: "welcome_new_members",
      };
    },
  },
  {
    key: "community_wins",
    category: "wins",
    cadence: "as_needed",
    generate: async (supabase, program) => {
      // TFFM (Succession Society) members already completed trust creation — skip.
      if (program === "tffm") return null;

      // Look at recent trust submissions (last 14d) for new completers
      const since = new Date(Date.now() - 14 * 86400000).toISOString();
      const { data: recent } = await supabase
        .from("trust_submissions")
        .select("user_id, trust_type, submitter_name, created_at")
        .gte("created_at", since);
      const recentUserIds = Array.from(new Set(((recent || []) as any[]).map((r) => r.user_id)));
      if (!recentUserIds.length) return null;

      // Get all their submissions to check completion
      const { data: allSubs } = await supabase
        .from("trust_submissions")
        .select("user_id, trust_type, submitter_name, created_at")
        .in("user_id", recentUserIds);

      // Filter to recent users in THIS program only
      const programName = PROGRAM_NAMES[program];
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id, display_name, first_name, last_name, program_name")
        .in("user_id", recentUserIds)
        .ilike("program_name", `%${programName}%`);
      const inProgram = new Set(((profs || []) as any[]).map((p) => p.user_id));

      const byUser = new Map<string, { types: Set<string>; name?: string; latest: string }>();
      for (const s of (allSubs || []) as any[]) {
        if (!inProgram.has(s.user_id)) continue;
        const entry = byUser.get(s.user_id) || { types: new Set<string>(), name: s.submitter_name, latest: s.created_at };
        entry.types.add(s.trust_type);
        if (s.submitter_name) entry.name = s.submitter_name;
        if (s.created_at > entry.latest) entry.latest = s.created_at;
        byUser.set(s.user_id, entry);
      }

      // Skip users we've already celebrated for this template
      const candidateIds = [...byUser.keys()];
      const { data: alreadyCelebrated } = await supabase
        .from("community_manager_celebrated_users")
        .select("user_id")
        .eq("program", program)
        .eq("template_key", "community_wins")
        .in("user_id", candidateIds);
      const celebrated = new Set(((alreadyCelebrated || []) as any[]).map((c) => c.user_id));

      const newCompleters: { id: string; name: string }[] = [];
      for (const [uid, v] of byUser.entries()) {
        if (celebrated.has(uid)) continue;
        if (!REQUIRED_TRUST_TYPES.every((t) => v.types.has(t))) continue;
        let name = v.name;
        if (!name) {
          const prof = ((profs || []) as any[]).find((p) => p.user_id === uid);
          name = prof ? nameOf(prof) : "A member";
        }
        newCompleters.push({ id: uid, name });
      }
      if (newCompleters.length === 0) return null;

      const list = newCompleters.slice(0, 25).map((n) => `- ${n.name} ✅`).join("\n");

      // Mark these as celebrated
      await supabase.from("community_manager_celebrated_users").insert(
        newCompleters.map((n) => ({ user_id: n.id, program, template_key: "community_wins" })),
      );

      return {
        title: "🏆 Community Wins — Trust Creation Completed!",
        body: `Massive shout-out to the members who just completed **all of their trust creation submissions**! 🎉

${list}

These families just locked in protection that will outlive them. Drop a 🔥 in the comments to celebrate them and let us know — who's next? 👇`,
      };
    },
  },
  {
    key: "new_updates",
    category: "updates",
    cadence: "as_needed",
    generate: async (supabase) => {
      const since = new Date(Date.now() - 14 * 86400000).toISOString();
      const [coursesRes, meetingsRes] = await Promise.all([
        supabase.from("courses").select("title, created_at").gte("created_at", since).order("created_at", { ascending: false }).limit(5),
        supabase.from("meetings").select("title, meeting_date").gte("created_at", since).order("meeting_date", { ascending: true }).limit(5),
      ]);
      const newCourses = (coursesRes.data || []) as any[];
      const newMeetings = (meetingsRes.data || []) as any[];
      if (!newCourses.length && !newMeetings.length) return null;
      let body = `Here's what's new inside TruHeirs this week:\n\n`;
      if (newCourses.length) {
        body += `**🎓 New in the Classroom:**\n` + newCourses.map((c) => `- ${c.title}`).join("\n") + `\n\n`;
      }
      if (newMeetings.length) {
        body += `**📅 New calls on the Calendar:**\n` + newMeetings.map((m) => `- ${m.title} — ${m.meeting_date}`).join("\n") + `\n\n`;
      }
      body += `Log in, take a look, and tell us what you want to see next 👇`;
      return { title: "🚀 New Updates Inside TruHeirs", body };
    },
  },
];


Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: settings } = await supabase
      .from("community_manager_settings")
      .select("*")
      .limit(1)
      .maybeSingle();

    if (!settings?.enabled) {
      return new Response(JSON.stringify({ skipped: "disabled" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const personaUserId: string = settings.persona_user_id;
    const today = new Date();

    let force = false;
    try {
      if (req.method === "POST") {
        const body = await req.json().catch(() => ({}));
        force = !!body?.force;
      }
    } catch (_) { /* ignore */ }

    const startOfToday = new Date(today.toISOString().slice(0, 10) + "T00:00:00.000Z").toISOString();
    const startOfMonth = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1)).toISOString();

    const { data: recentLog } = await supabase
      .from("community_manager_post_log")
      .select("program, template_key, posted_at")
      .gte("posted_at", startOfMonth);
    const recent = (recentLog || []) as any[];

    const postedToday = new Set<string>();
    const postedThisMonth = new Set<string>();
    for (const r of recent) {
      const key = `${r.program}|${r.template_key}`;
      postedThisMonth.add(key);
      if (r.posted_at >= startOfToday) postedToday.add(key);
    }

    const results: any[] = [];

    for (const program of PROGRAMS) {
      for (const tpl of TEMPLATES) {
        const key = `${program}|${tpl.key}`;
        if (!force) {
          if (tpl.cadence === "monthly" && postedThisMonth.has(key)) {
            results.push({ program, template: tpl.key, skipped: "monthly: already posted this month" });
            continue;
          }
          if (tpl.cadence === "as_needed" && postedToday.has(key)) {
            results.push({ program, template: tpl.key, skipped: "already posted today" });
            continue;
          }
        }

        let content: Generated | null = null;
        try {
          content = await tpl.generate(supabase, program);
        } catch (e: any) {
          results.push({ program, template: tpl.key, error: `generate failed: ${e?.message}` });
          continue;
        }
        if (!content) {
          results.push({ program, template: tpl.key, skipped: "no content" });
          continue;
        }

        const { data: post, error } = await supabase
          .from("community_posts")
          .insert({
            user_id: personaUserId,
            title: content.title,
            content: content.body,
            category: tpl.category,
            program,
            pinned: false,
          })
          .select("id")
          .single();

        if (error) {
          results.push({ program, template: tpl.key, error: error.message });
          continue;
        }

        await supabase.from("community_manager_post_log").insert({
          post_id: post.id,
          program,
          template_key: tpl.key,
          title: content.title,
        });

        if (content.replyToKey) {
          const { data: parent } = await supabase
            .from("community_manager_post_log")
            .select("post_id")
            .eq("program", program)
            .eq("template_key", content.replyToKey)
            .order("posted_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          if (parent?.post_id) {
            await supabase.from("community_posts").insert({
              user_id: personaUserId,
              parent_id: parent.post_id,
              content: content.body,
              category: tpl.category,
              program,
            });
          }
        }

        results.push({ program, post_id: post.id, template: tpl.key });
      }
    }

    await supabase
      .from("community_manager_settings")
      .update({ last_post_at: new Date().toISOString() })
      .eq("id", settings.id);

    return new Response(JSON.stringify({ ok: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("daily post error", e);
    return new Response(JSON.stringify({ error: e?.message || String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
