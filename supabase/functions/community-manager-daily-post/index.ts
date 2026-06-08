import { createClient } from "https://esm.sh/@supabase/supabase-js@2.51.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PROGRAMS = ["fbu", "tfv", "tfba", "tffm"];

type Generated = { title: string; body: string; replyToKey?: string };
type Cadence = "daily" | "monthly" | "as_needed";
type TemplateDef = {
  key: string;
  category: string;
  cadence: Cadence;
  generate: (supabase: any, program: string) => Promise<Generated | null>;
};

const REQUIRED_TRUST_TYPES = ["family", "business"];

async function getRecentNewMembers(supabase: any) {
  const since = new Date(Date.now() - 7 * 86400000).toISOString();
  const { data } = await supabase
    .from("profiles")
    .select("display_name, first_name, last_name, city, state, created_at")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(15);
  return (data || []) as any[];
}

function nameOf(p: any) {
  return p.display_name || [p.first_name, p.last_name].filter(Boolean).join(" ") || "A new member";
}

function pickRotating<T>(arr: T[], dayIndex: number, programOffset = 0): T {
  return arr[(dayIndex + programOffset) % arr.length];
}

const REC_PROMPTS = [
  {
    title: "🏆 Trust Win of the Week",
    body: `Share your latest protection milestone with the family — LLC filed, trust funded, bank account opened, EIN secured.

Drop yours below 👇 No win is too small. Every step locks in generational protection.`,
  },
  {
    title: "📚 Best Resource for Family Wealth Building",
    body: `What book, attorney, podcast, or tool actually moved the needle for you?

Reply with **one recommendation** and a sentence on why it helped. Let's build a community resource list 💛`,
  },
  {
    title: "🤝 Vendor Recs — Drop Your Trusted Pros",
    body: `Looking for vetted CPAs, estate attorneys, registered agents, or bookkeepers?

Comment with someone you've **actually used** and what they handled for you. No referrals — real receipts only.`,
  },
  {
    title: "💭 What I Wish I Knew Before Starting My Trust",
    body: `If you could go back, what would you tell yourself the day before you started your trust?

Your lesson could save another family weeks of confusion. Drop it below 👇`,
  },
  {
    title: "🔍 Business Structure Check",
    body: `Post your current setup (LLC, S-Corp, Trust, Holding Co.) and get peer feedback before your next call with Markus.

Format:
- Entity type:
- State:
- Purpose:
- One question you have:`,
  },
  {
    title: "🏦 Banking Wins for Black Family Businesses",
    body: `Which business banks, credit unions, or cards are actually working for you right now?

Share what's working — easy approvals, no nonsense fees, real support. Let's map the landscape 🗺️`,
  },
];

const GEMS_PROMPTS = [
  {
    title: "💎 Legacy Launchpad Gem: Pay Yourself First",
    body: `Pulled from **Week 1 of Legacy Launchpad** — pay yourself before any bill, any expense, any investment.

Even $50 a week, automated, builds the habit and the wealth. Open the Classroom and watch the Week 1 walkthrough.

What's your "pay yourself first" number? 👇`,
  },
  {
    title: "💎 Gem: Document One Process This Week",
    body: `From the **Legacy Launchpad systems module** — every undocumented process dies with you.

This week: pick one thing only you know how to do, write it down, and hand it to a family member. That's legacy.`,
  },
  {
    title: "⚖️ New Law Watch: Corporate Transparency Act",
    body: `Heads up — the **Corporate Transparency Act (BOI reporting)** is still in flux. If you own an LLC, you may need to file beneficial ownership info with FinCEN.

Check the latest status before year-end. Ask your CPA or post questions below.`,
  },
  {
    title: "🏛️ Politics & Your Wealth: Estate Tax Sunset",
    body: `The current **estate tax exemption (~$13.6M per person)** is scheduled to sunset at the end of 2025 — dropping to roughly $7M.

If your family is anywhere near that line, this is the year to lock in trust planning. Don't sleep on it.`,
  },
  {
    title: "💎 Gem from Legacy Launchpad: Trust Funding > Trust Drafting",
    body: `A trust with no assets in it is just paper.

**This week's play:** list every asset you own and ask, "Is this titled in my trust's name?" If no — that's your next move.

Watch the Funding module in the Classroom for the step-by-step.`,
  },
  {
    title: "📰 New Update: IRS Inheritance Reporting",
    body: `The IRS continues to tighten reporting on inherited assets and step-up in basis calculations.

If you're inheriting (or leaving) property, get your **cost basis documented now** — not after the fact. Save your family the audit.`,
  },
];

const TEMPLATES: TemplateDef[] = [
  {
    key: "student_of_the_month",
    category: "wins",
    cadence: "monthly",
    generate: async (supabase) => {
      // Top member by trust submissions + succession progress in last 30 days
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
      if (!top) return null; // monthly: skip if no real winner
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
    key: "new_plays_gems",
    category: "gems",
    cadence: "daily",
    generate: async (supabase) => {
      const dayIndex = Math.floor(Date.now() / 86400000);
      const gem = pickRotating(GEMS_PROMPTS, dayIndex);
      const { data: course } = await supabase
        .from("courses")
        .select("title")
        .ilike("title", "%legacy%")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      const courseLine = course?.title
        ? `\n\n📺 Watch "${course.title}" in the Classroom for the deeper breakdown.`
        : "";
      return { title: gem.title, body: gem.body + courseLine };
    },
  },
  {
    key: "welcome_new_members",
    category: "discussion",
    cadence: "as_needed",
    generate: async (supabase) => {
      const members = await getRecentNewMembers(supabase);
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
    generate: async (supabase) => {
      // Pull next upcoming meeting for context
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
    key: "recommendations",
    category: "discussion",
    generate: async () => {
      const dayIndex = Math.floor(Date.now() / 86400000);
      const r = pickRotating(REC_PROMPTS, dayIndex);
      return { title: r.title, body: r.body };
    },
  },
  {
    key: "community_wins",
    category: "wins",
    generate: async (supabase) => {
      // Members who have submitted BOTH required trust types
      const { data: subs } = await supabase
        .from("trust_submissions")
        .select("user_id, trust_type, submitter_name");
      const byUser = new Map<string, { types: Set<string>; name?: string }>();
      for (const s of (subs || []) as any[]) {
        const entry = byUser.get(s.user_id) || { types: new Set<string>(), name: s.submitter_name };
        entry.types.add(s.trust_type);
        if (s.submitter_name) entry.name = s.submitter_name;
        byUser.set(s.user_id, entry);
      }
      const completers: string[] = [];
      for (const [uid, v] of byUser.entries()) {
        if (REQUIRED_TRUST_TYPES.every((t) => v.types.has(t))) {
          if (v.name) completers.push(v.name);
          else {
            const { data: p } = await supabase
              .from("profiles")
              .select("display_name, first_name, last_name")
              .eq("user_id", uid)
              .maybeSingle();
            completers.push(p ? nameOf(p) : "A member");
          }
        }
      }
      if (completers.length === 0) {
        return {
          title: "🏆 Community Wins of the Week",
          body: `Drop your wins this week 👇 New client, finished a course, opened a trust, hard family conversation — it all counts. Reading your wins fuels the rest of us.`,
        };
      }
      const list = completers.slice(0, 25).map((n) => `- ${n} ✅`).join("\n");
      return {
        title: "🏆 Community Wins — Trust Creation Completed!",
        body: `Massive shout-out to the members who've completed **all of their trust creation submissions**! 🎉

${list}

These families just locked in protection that will outlive them. Drop a 🔥 in the comments to celebrate them and let us know — who's next? 👇`,
      };
    },
  },
  {
    key: "new_updates",
    category: "updates",
    generate: async (supabase) => {
      const since = new Date(Date.now() - 14 * 86400000).toISOString();
      const [coursesRes, meetingsRes] = await Promise.all([
        supabase.from("courses").select("title, created_at").gte("created_at", since).order("created_at", { ascending: false }).limit(5),
        supabase.from("meetings").select("title, meeting_date").gte("created_at", since).order("meeting_date", { ascending: true }).limit(5),
      ]);
      const newCourses = (coursesRes.data || []) as any[];
      const newMeetings = (meetingsRes.data || []) as any[];
      let body = `Here's what's new inside TruHeirs this week:\n\n`;
      if (newCourses.length) {
        body += `**🎓 New in the Classroom:**\n` + newCourses.map((c) => `- ${c.title}`).join("\n") + `\n\n`;
      }
      if (newMeetings.length) {
        body += `**📅 New calls on the Calendar:**\n` + newMeetings.map((m) => `- ${m.title} — ${m.meeting_date}`).join("\n") + `\n\n`;
      }
      if (!newCourses.length && !newMeetings.length) {
        body += `- Fresh content coming to the Classroom\n- More live calls being added to the Calendar\n- New tools rolling out in your Family Office\n\n`;
      }
      body += `Log in, take a look, and tell us what you want to see next 👇`;
      return { title: "🚀 New Updates Inside TruHeirs", body };
    },
  },
];

function pickTemplate(dayIndex: number, programOffset: number) {
  return TEMPLATES[(dayIndex + programOffset) % TEMPLATES.length];
}

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
    const dayIndex = Math.floor(today.getTime() / 86400000);

    let force = false;
    try {
      if (req.method === "POST") {
        const body = await req.json().catch(() => ({}));
        force = !!body?.force;
      }
    } catch (_) { /* ignore */ }

    const startOfToday = new Date(today.toISOString().slice(0, 10) + "T00:00:00.000Z").toISOString();
    const { data: alreadyPosted } = await supabase
      .from("community_manager_post_log")
      .select("program")
      .gte("posted_at", startOfToday);
    const postedPrograms = force ? new Set<string>() : new Set((alreadyPosted || []).map((r: any) => r.program));

    const results: any[] = [];

    for (let i = 0; i < PROGRAMS.length; i++) {
      const program = PROGRAMS[i];
      if (postedPrograms.has(program)) {
        results.push({ program, skipped: "already posted today" });
        continue;
      }
      const tpl = pickTemplate(dayIndex, i);
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

      // Main post
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
        results.push({ program, error: error.message });
        continue;
      }

      await supabase.from("community_manager_post_log").insert({
        post_id: post.id,
        program,
        template_key: tpl.key,
        title: content.title,
      });

      // If this template is meant to reply to another (e.g. orientation -> welcome), also post as comment
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
