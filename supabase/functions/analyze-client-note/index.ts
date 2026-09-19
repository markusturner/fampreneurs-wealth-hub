const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Body {
  client_name?: string;
  program?: string | null;
  base_score?: number;
  signals?: { label: string }[];
  notes: string;
}

const SYSTEM = `You are a client-retention analyst for TruHeirs, a family trust and wealth program.
You read an account manager's free-text notes about ONE client and judge how healthy that relationship actually is.
Read carefully. Do not reward a note just because it mentions money, trusts, or the program name.

Rate the client 1-10:
1-3.9  At Risk: unhappy, unresponsive, unpaid balance, no attendance, wants refund/cancel, ghosting.
4-6.4  Slipping: some friction, slow payments, low engagement, stalled progress.
6.5-8.4 Stable: paying, engaged, progressing, no red flags.
8.5-10 Expansion Ready: ONLY if the notes show completed trusts/assets funded or clear proof of results plus readiness to buy more.

Rules:
- Unpaid balances, renegotiated payment plans, missed calls, or silence LOWER the score.
- Buying the program is not a result. Mentioning a trust is not a completed trust.
- Be decisive and realistic; most notes are not 9s.
- Judge the NOTES on their own. Do NOT anchor on the system-computed score; it can be stale or wrong.
- HARD CAPS, no exceptions:
  - Client asks to cancel, quit, get a refund, or mentions a chargeback: rating MUST be 1-2.5, status at_risk.
  - Client asks to pause/suspend their subscription or payments: rating MUST be 1-3, status at_risk.
  - Any unpaid or overdue balance mentioned: rating MUST be 1-3.9, status at_risk.
  - Client hired someone else to do the work (e.g. "I have someone working on my trust"): rating MUST be 1-3, status at_risk.
  - Client ghosting or unresponsive 30+ days: rating MUST be under 4.
- Several of these at once means the LOWEST end of the range, not the highest.
- Mixed notes: the most recent bad news outweighs older good news.
Return strict JSON only:
{"rating": number, "status": "at_risk"|"slipping"|"stable"|"expansion_ready"|"continuity", "rationale": string, "concerns": string[], "positives": string[]}
rationale: REQUIRED, one specific sentence citing evidence from the notes. concerns/positives: REQUIRED short evidence phrases from the notes (at least one concern if anything is unpaid, stalled, or quiet).`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const json = (b: unknown, status = 200) =>
    new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const key = Deno.env.get("LOVABLE_API_KEY");
    if (!key) return json({ error: "Missing LOVABLE_API_KEY" }, 500);

    const body = (await req.json()) as Body;
    if (!body?.notes?.trim()) return json({ error: "notes required" }, 400);

    const user = `Client: ${body.client_name ?? "unknown"}
Program: ${body.program ?? "unknown"}
System-computed score before notes: ${body.base_score ?? "n/a"}/10
System signals:
${(body.signals ?? []).map((s) => `- ${s.label}`).join("\n") || "- none"}

Account manager notes (most recent first):
"""
${body.notes.slice(0, 12000)}
"""`;

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Lovable-API-Key": key,
        "Content-Type": "application/json",
        "X-Lovable-AIG-SDK": "fetch",
      },
      body: JSON.stringify({
        model: "google/gemini-3.8-flash",
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: user },
        ],
        response_format: { type: "json_object" },
        temperature: 0.2,
      }),
    });

    if (!resp.ok) {
      const text = await resp.text();
      return json({ error: `AI gateway ${resp.status}: ${text}` }, resp.status);
    }

    const data = await resp.json();
    const raw = data?.choices?.[0]?.message?.content ?? "";
    let parsed: any = {};
    try {
      parsed = JSON.parse(raw);
    } catch {
      const m = String(raw).match(/\{[\s\S]*\}/);
      parsed = m ? JSON.parse(m[0]) : {};
    }

    // Never invent a neutral score: if the model gave no rating, fail loudly
    // so the client keeps its existing rating instead of jumping to 6/10.
    if (parsed.rating === undefined || parsed.rating === null || isNaN(Number(parsed.rating))) {
      return json({ error: "AI did not return a rating", raw: String(raw).slice(0, 500) }, 502);
    }

    const rating = Math.min(10, Math.max(1, Number(parsed.rating)));
    const allowed = ["at_risk", "slipping", "stable", "expansion_ready", "continuity"];
    let status = allowed.includes(parsed.status) ? parsed.status : null;
    if (!status) {
      status = rating >= 8.5 ? "expansion_ready" : rating >= 6.5 ? "stable" : rating >= 4 ? "slipping" : "at_risk";
    }
    // Guard against the model inflating: expansion needs an explicit high rating too
    if (status === "expansion_ready" && rating < 8.5) status = rating >= 6.5 ? "stable" : "slipping";

    return json({
      rating: Number(rating.toFixed(1)),
      status,
      rationale: String(parsed.rationale ?? "").slice(0, 300),
      concerns: Array.isArray(parsed.concerns) ? parsed.concerns.slice(0, 5).map(String) : [],
      positives: Array.isArray(parsed.positives) ? parsed.positives.slice(0, 5).map(String) : [],
    });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
