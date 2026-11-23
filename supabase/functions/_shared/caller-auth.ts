// Shared caller checks for server functions.
// - Database triggers and scheduled jobs send a one-time "x-job-token".
// - Other server functions may call with the service role key.
// - People must be signed in; staff checks use the user_roles table.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const url = () => Deno.env.get("SUPABASE_URL")!;
const serviceKey = () => Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const adminClient = () => createClient(url(), serviceKey(), { auth: { persistSession: false } });

function bearer(req: Request): string {
  const h = req.headers.get("Authorization") || req.headers.get("authorization") || "";
  return h.startsWith("Bearer ") ? h.slice(7).trim() : "";
}

/** True when the request carries a valid one-time job token for this function. */
export async function hasJobToken(req: Request, purpose: string): Promise<boolean> {
  const token = req.headers.get("x-job-token") || "";
  if (token.length < 32) return false;
  const { data, error } = await adminClient().rpc("consume_job_token", { p_token: token, p_purpose: purpose });
  return !error && data === true;
}

/** True when another server function called with the service role key. */
export function isServiceCall(req: Request): boolean {
  const key = serviceKey();
  return !!key && bearer(req) === key;
}

/** The signed-in user's id, or null. */
export async function getSignedInUserId(req: Request): Promise<string | null> {
  const token = bearer(req);
  if (!token || token === serviceKey()) return null;
  const { data, error } = await adminClient().auth.getUser(token);
  if (error || !data?.user) return null;
  return data.user.id;
}

/** True when the user is an admin or owner. */
export async function isStaff(userId: string): Promise<boolean> {
  const { data } = await adminClient()
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .in("role", ["admin", "owner"])
    .limit(1);
  return !!data && data.length > 0;
}

export type Caller = { kind: "job" } | { kind: "service" } | { kind: "staff"; userId: string };

/** Allows database jobs, other server functions, and admins/owners. */
export async function authorizeInternalOrStaff(req: Request, purpose: string): Promise<Caller | null> {
  if (isServiceCall(req)) return { kind: "service" };
  if (await hasJobToken(req, purpose)) return { kind: "job" };
  const userId = await getSignedInUserId(req);
  if (userId && (await isStaff(userId))) return { kind: "staff", userId };
  return null;
}

export function deny(corsHeaders: Record<string, string>, status = 401): Response {
  return new Response(JSON.stringify({ error: status === 403 ? "Forbidden" : "Unauthorized" }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
