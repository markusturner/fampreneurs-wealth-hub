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
  const shuffled = password.split("");
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = array[i] % (i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.join("");
};

interface Body {
  action: "validate" | "redeem";
  token: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  zipCode?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body: Body = await req.json();
    if (!body?.token) {
      return new Response(JSON.stringify({ error: "Missing token" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    const { data: invite, error: inviteErr } = await admin
      .from("invite_links")
      .select("*")
      .eq("token", body.token)
      .maybeSingle();

    if (inviteErr || !invite) {
      return new Response(JSON.stringify({ error: "Invite not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!invite.is_active) {
      return new Response(JSON.stringify({ error: "This invite has been revoked." }), {
        status: 410,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (invite.expires_at && new Date(invite.expires_at).getTime() < Date.now()) {
      return new Response(JSON.stringify({ error: "This invite has expired." }), {
        status: 410,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (invite.max_uses != null && invite.uses_count >= invite.max_uses) {
      return new Response(JSON.stringify({ error: "This invite has reached its usage limit." }), {
        status: 410,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (body.action === "validate") {
      return new Response(
        JSON.stringify({
          success: true,
          invite: {
            invite_type: invite.invite_type,
            program_name: invite.program_name,
            role: invite.role,
            plan_type: invite.plan_type,
            total_amount: invite.total_amount,
            expires_at: invite.expires_at,
            max_uses: invite.max_uses,
            uses_count: invite.uses_count,
          },
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // action === redeem
    const email = (body.email || "").trim().toLowerCase();
    const firstName = (body.firstName || "").trim();
    const lastName = (body.lastName || "").trim();
    const zipCode = (body.zipCode || "").trim();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !firstName || !lastName) {
      return new Response(JSON.stringify({ error: "Please provide first name, last name, and a valid email." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check duplicate
    const { data: existing } = await admin
      .from("profiles")
      .select("id")
      .eq("email", email)
      .maybeSingle();
    if (existing) {
      return new Response(JSON.stringify({ error: "An account with this email already exists. Please sign in instead." }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const tempPassword = generateSecurePassword();
    const { data: userData, error: userErr } = await admin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
        full_name: `${firstName} ${lastName}`,
        role: invite.role,
        program_name: invite.program_name || null,
        mailing_address: zipCode || null,
        truheirs_access: invite.truheirs_access,
        invited_via: "invite_link",
        invite_token: invite.token,
      },
    });

    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: userErr?.message || "Failed to create user" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = userData.user.id;

    // Update profile
    await admin
      .from("profiles")
      .update({
        first_name: firstName,
        last_name: lastName,
        display_name: `${firstName} ${lastName}`,
        email,
        mailing_address: zipCode || null,
        program_name: invite.program_name || null,
        truheirs_access: invite.truheirs_access,
      } as any)
      .eq("user_id", userId);

    // Payment plan
    if (invite.plan_type !== "free" && invite.total_amount) {
      const total = Number(invite.total_amount);
      const cashCollected = invite.plan_type === "paid_in_full" ? total : 0;
      await admin
        .from("profiles")
        .update({
          program_contract_value: total,
          program_cash_collected: cashCollected,
        } as any)
        .eq("user_id", userId);

      await admin.from("user_payment_plans" as any).insert({
        user_id: userId,
        user_email: email,
        plan_type: invite.plan_type,
        total_amount: total,
        amount_paid: cashCollected,
        installment_amount: invite.plan_type === "payment_plan" ? invite.installment_amount : null,
        installment_frequency: invite.plan_type === "payment_plan" ? invite.installment_frequency : null,
        next_payment_due: invite.plan_type === "payment_plan" ? invite.payment_start_date : null,
        payment_start_date: invite.payment_start_date,
        status: invite.plan_type === "paid_in_full" ? "paid" : "active",
        created_by: invite.created_by,
      });
    }

    // Increment uses; auto-disable temporary at limit
    const newUses = (invite.uses_count || 0) + 1;
    const shouldDisable =
      (invite.invite_type === "temporary" && invite.max_uses != null && newUses >= invite.max_uses);
    await admin
      .from("invite_links")
      .update({
        uses_count: newUses,
        is_active: shouldDisable ? false : invite.is_active,
      })
      .eq("id", invite.id);

    // Send credentials email
    try {
      const resendKey = Deno.env.get("RESEND_API_KEY");
      if (resendKey) {
        const resend = new Resend(resendKey);
        await resend.emails.send({
          from: "TruHeirs <onboarding@resend.dev>",
          to: [email],
          subject: "Welcome to TruHeirs — Your login credentials",
          html: `
            <div style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;color:#290a52;">
              <h1 style="color:#290a52;">Welcome, ${firstName}!</h1>
              <p>Your TruHeirs account has been created via community invite. Sign in using the credentials below:</p>
              <div style="background:#f5f1ff;padding:16px;border-radius:8px;margin:20px 0;">
                <p style="margin:4px 0;"><strong>Email:</strong> ${email}</p>
                <p style="margin:4px 0;"><strong>Temporary password:</strong> <code style="background:#fff;padding:4px 8px;border-radius:4px;">${tempPassword}</code></p>
              </div>
              <p><a href="https://truheirs.app/auth" style="background:#ffb500;color:#290a52;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">Sign In</a></p>
              <p style="color:#666;font-size:13px;margin-top:24px;">Please change your password after signing in.</p>
            </div>
          `,
        });
      }
    } catch (e) {
      console.error("Email send failed:", e);
    }

    return new Response(
      JSON.stringify({ success: true, userId, message: "Account created — check your email for login credentials." }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e: any) {
    console.error("redeem-invite-link error:", e);
    return new Response(JSON.stringify({ error: e?.message || "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
