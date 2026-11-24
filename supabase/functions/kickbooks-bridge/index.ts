// TruHeirs edge function: kickbooks-bridge
// Lets Kickbooks (1) use the same Markus knowledge as Markus AI on TruHeirs and (2) check if an email is a
// paying Markus AI member. Kickbooks must send the shared secret; nobody else can call it.
// Kickbooks sends a shared key; only its SHA-256 fingerprint is stored here, so the key itself is never in this code.
// To rotate it, set a new TRUHEIRS_BRIDGE_SECRET in Kickbooks and either update KEY_SHA256 or set KICKBOOKS_BRIDGE_SECRET here.
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

const KEY_SHA256 = "11d070ffac3cfd6ead70668e90895f2d8ef4d322c4c1dca3309dfb12700ed81a";

async function sha256(text: string) {
  const bytes = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function sameSecret(a: string, b: string) {
  if (!a || !b || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  const given = req.headers.get("x-bridge-secret") ?? "";
  const secret = Deno.env.get("KICKBOOKS_BRIDGE_SECRET") ?? "";
  const allowed = given.length >= 20 && (secret ? sameSecret(given, secret) : sameSecret(await sha256(given), KEY_SHA256));
  if (!allowed) return json({ error: "Not allowed" }, 401);
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  let body: any = {};
  try { body = await req.json(); } catch { return json({ error: "Bad request" }, 400); }

  if (body.action === "knowledge") {
    const text = String(body.text ?? "").slice(0, 4000);
    if (!text.trim()) return json({ docs: [] });
    const { data, error } = await db.rpc("search_markus_knowledge", { search_text: text });
    if (error) { console.error("kickbooks-bridge knowledge", error.message); return json({ docs: [] }); }
    return json({ docs: (data ?? []).slice(0, 5) });
  }

  if (body.action === "member") {
    const email = String(body.email ?? "").trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(email)) return json({ member: false });
    const { data } = await db.from("subscribers").select("subscribed, subscription_tier").ilike("email", email).maybeSingle();
    const member = !!data?.subscribed && /markus ai/i.test(String(data?.subscription_tier ?? ""));
    return json({ member });
  }

  return json({ error: "Unknown action" }, 400);
});
