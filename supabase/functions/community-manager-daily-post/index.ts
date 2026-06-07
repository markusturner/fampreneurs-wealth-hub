import { createClient } from "https://esm.sh/@supabase/supabase-js@2.51.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PROGRAMS = ["fbu", "tfv", "tfba", "tffm"];

// Template library inspired by the Community Manager Content board
const TEMPLATES = [
  {
    key: "welcome_new_members",
    category: "discussion",
    title: "👋 Welcome to our newest members!",
    body: `Hey family! 👋

Big welcome to everyone who joined this week. We're so glad you're here.

**Quick start tips:**
- Drop a hello in the comments and tell us where you're from
- Share one goal you want to hit this quarter
- Check out the Classroom tab for your first lesson

Reply below and let's get to know you 💛`,
  },
  {
    key: "coaching_call_announcement",
    category: "announcement",
    title: "📣 Coaching Call This Week — Don't Miss It",
    body: `Our weekly coaching call is coming up. Bring your questions, wins, and roadblocks.

**What to expect:**
- Live Q&A with the team
- Real strategies you can use this week
- Networking with other family business owners

Check the Calendar tab for the time. See you there! 🚀`,
  },
  {
    key: "community_wins",
    category: "wins",
    title: "🏆 Community Wins of the Week",
    body: `Let's celebrate! 🎉

Drop your wins from this week in the comments — big or small. New client, finished a course, opened a trust, hard conversation with family… it all counts.

Reading your wins fuels the rest of us. Let's hear it! 👇`,
  },
  {
    key: "new_plays_gems",
    category: "discussion",
    title: "💎 New Plays & Gems",
    body: `Here are a few gems to chew on this week:

1. **Pay yourself first** — even $50 a week builds the habit
2. **Document one process** — turn it into a system your family can run
3. **Talk to one new person** — relationships compound

Which one are you going to act on? Tell us below 👇`,
  },
  {
    key: "new_member_orientation",
    category: "announcement",
    title: "🧭 New Member Orientation",
    body: `New here? Start with these 3 steps:

1. Fill out your profile so others can connect with you
2. Watch the welcome video in the Classroom
3. Introduce yourself in the comments

Got questions? Reply here and the team will jump in.`,
  },
  {
    key: "recommendations",
    category: "discussion",
    title: "📚 Recommendation of the Week",
    body: `Looking for a good resource this week?

**Try this:** Spend 15 minutes writing down everything you want your family to remember about you in 50 years. It's a powerful exercise that shapes how you build.

What's a book, podcast, or habit that changed your life? Share it below 👇`,
  },
  {
    key: "student_of_the_month",
    category: "wins",
    title: "🌟 Student Spotlight",
    body: `Shout-out to all the members showing up week after week. Consistency wins.

If someone in this community has helped you lately, tag them in the comments and tell us why. Let's give credit where it's due 💛`,
  },
  {
    key: "new_updates",
    category: "announcement",
    title: "🚀 New Updates Inside TruHeirs",
    body: `Here's what's new this week:

- Fresh content in the Classroom
- Updated tools in your Family Office
- New coaching calls on the Calendar

Log in, take a look, and tell us what you want to see next 👇`,
  },
  {
    key: "coaching_recordings",
    category: "recordings",
    title: "🎥 Latest Coaching Call Recording",
    body: `Missed the last coaching call? The recording is up.

**Inside this call:**
- Real questions from members like you
- Step-by-step playbook you can copy
- Q&A you can replay anytime

Head to the Classroom recordings to watch.`,
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

    // Skip if already posted today
    const startOfToday = new Date(today.toISOString().slice(0, 10) + "T00:00:00.000Z").toISOString();
    const { data: alreadyPosted } = await supabase
      .from("community_manager_post_log")
      .select("program")
      .gte("posted_at", startOfToday);
    const postedPrograms = new Set((alreadyPosted || []).map((r: any) => r.program));

    const results: any[] = [];

    for (let i = 0; i < PROGRAMS.length; i++) {
      const program = PROGRAMS[i];
      if (postedPrograms.has(program)) {
        results.push({ program, skipped: "already posted today" });
        continue;
      }
      const tpl = pickTemplate(dayIndex, i);

      const { data: post, error } = await supabase
        .from("community_posts")
        .insert({
          user_id: personaUserId,
          title: tpl.title,
          content: tpl.body,
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
        title: tpl.title,
      });

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
