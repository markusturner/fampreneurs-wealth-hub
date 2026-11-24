// Kickbooks bridge (see ../_shared/kickbooks-bridge.ts). ai-chat serves the same thing with mode "kickbooks-bridge".
import { handleKickbooksBridge } from "../_shared/kickbooks-bridge.ts";

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "POST only" }), { status: 405, headers: { "Content-Type": "application/json" } });
  let body: any = {};
  try { body = await req.json(); } catch { return new Response(JSON.stringify({ error: "Bad request" }), { status: 400, headers: { "Content-Type": "application/json" } }); }
  return handleKickbooksBridge(req, body);
});
