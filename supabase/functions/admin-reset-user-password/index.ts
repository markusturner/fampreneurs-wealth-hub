import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const generateSecurePassword = (): string => {
  const length = 14;
  const lower = "abcdefghjkmnpqrstuvwxyz";
  const upper = "ABCDEFGHJKMNPQRSTUVWXYZ";
  const digits = "23456789";
  const charset = lower + upper + digits;
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  let password =
    lower[array[0] % lower.length] +
    upper[array[1] % upper.length] +
    digits[array[2] % digits.length];
  for (let i = 3; i < length; i++) password += charset[array[i] % charset.length];
  return password;
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    // Caller must be an admin or owner
    const authHeader = req.headers.get("Authorization") ?? "";
    const jwt = authHeader.replace("Bearer ", "");
    const { data: userRes } = await admin.auth.getUser(jwt);
    const caller = userRes?.user;
    if (!caller) return json({ error: "Not authenticated" }, 401);

    const { data: roles } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id);
    const isAdmin = (roles || []).some((r: any) => r.role === "admin" || r.role === "owner");
    if (!isAdmin) return json({ error: "Not allowed" }, 403);

    const body = await req.json();
    const email = String(body?.email || "").trim().toLowerCase();
    const firstName = String(body?.firstName || "").trim();
    const lastName = String(body?.lastName || "").trim();
    if (!email) return json({ error: "Email is required" }, 400);

    // Find the auth user by email
    let targetId: string | null = null;
    let page = 1;
    while (page <= 20 && !targetId) {
      const { data: list, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
      if (error) return json({ error: error.message }, 500);
      const hit = list.users.find((u) => (u.email || "").toLowerCase() === email);
      if (hit) targetId = hit.id;
      if (list.users.length < 200) break;
      page++;
    }
    if (!targetId) return json({ error: "No account found with that email." }, 404);

    const tempPassword = generateSecurePassword();
    const { error: updErr } = await admin.auth.admin.updateUserById(targetId, {
      password: tempPassword,
      email_confirm: true,
    });
    if (updErr) return json({ error: updErr.message }, 500);

    // Optionally fix the profile name
    if (firstName || lastName) {
      await admin
        .from("profiles")
        .update({
          first_name: firstName || undefined,
          last_name: lastName || undefined,
          display_name: `${firstName} ${lastName}`.trim(),
          email,
        } as any)
        .eq("user_id", targetId);
    }

    let emailed = false;
    try {
      const resendKey = Deno.env.get("RESEND_API_KEY");
      if (resendKey) {
        const resend = new Resend(resendKey);
        await resend.emails.send({
          from: "TruHeirs <noreply@truheirs.app>",
          to: [email],
          subject: "Your TruHeirs login credentials",
          html: `
            <div style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;color:#290a52;">
              <h1 style="color:#290a52;">Your TruHeirs login</h1>
              <p>Here are your sign-in details:</p>
              <div style="background:#f5f1ff;padding:16px;border-radius:8px;margin:20px 0;">
                <p style="margin:4px 0;"><strong>Email:</strong> ${email}</p>
                <p style="margin:4px 0;"><strong>Temporary password:</strong> <code style="background:#fff;padding:4px 8px;border-radius:4px;">${tempPassword}</code></p>
              </div>
              <p><a href="https://truheirs.app/auth" style="background:#ffb500;color:#290a52;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">Sign In</a></p>
              <p style="color:#666;font-size:13px;margin-top:24px;">Please change your password after signing in.</p>
            </div>
          `,
        });
        emailed = true;
      }
    } catch (_e) {
      emailed = false;
    }

    return json({ success: true, email, tempPassword, emailed });
  } catch (e: any) {
    return json({ error: e?.message || "Unexpected error" }, 500);
  }
});
