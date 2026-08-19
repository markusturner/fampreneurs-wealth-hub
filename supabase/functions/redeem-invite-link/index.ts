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

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

interface Body {
  action: "validate" | "redeem" | "direct_access" | "attach_existing";
  token: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  zipCode?: string;
  pin?: string;
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
      const alreadyUsed = (invite.uses_count ?? 0) > 0;
      return new Response(
        JSON.stringify({
          error: alreadyUsed
            ? "This invite was already used. Please sign in with your email and password."
            : "This invite has been revoked.",
        }),
        { status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
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
            access_mode: (invite as any).access_mode || "signup",
          },
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // action === direct_access : PIN-protected, no-signup entry
    if (body.action === "direct_access") {
      const inv = invite as any;
      if (inv.access_mode !== "direct" || !inv.direct_email || !inv.access_pin_hash) {
        return new Response(JSON.stringify({ error: "This invite requires signing up." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (inv.locked_until && new Date(inv.locked_until).getTime() > Date.now()) {
        return new Response(JSON.stringify({ error: "Too many wrong codes. Try again in 15 minutes." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const pin = (body.pin || "").trim();
      const hash = await sha256Hex(`${invite.token}:${pin}`);
      if (hash !== inv.access_pin_hash) {
        const attempts = (inv.failed_attempts || 0) + 1;
        await admin
          .from("invite_links")
          .update({
            failed_attempts: attempts,
            locked_until: attempts >= 5 ? new Date(Date.now() + 15 * 60 * 1000).toISOString() : null,
          })
          .eq("id", invite.id);
        return new Response(JSON.stringify({ error: "That code is not correct." }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const directEmail = String(inv.direct_email).trim().toLowerCase();

      // Find or create the account for this invite
      const { data: existingProfile } = await admin
        .from("profiles")
        .select("user_id")
        .eq("email", directEmail)
        .maybeSingle();

      let userId = (existingProfile as any)?.user_id as string | undefined;

      if (!userId) {
        const { data: created, error: createErr } = await admin.auth.admin.createUser({
          email: directEmail,
          password: generateSecurePassword(),
          email_confirm: true,
          user_metadata: {
            full_name: inv.note || directEmail,
            role: invite.role,
            program_name: invite.program_name || null,
            truheirs_access: invite.truheirs_access,
            invited_via: "direct_invite_link",
            needs_password_setup: true,
            invite_token: invite.token,
          },
        });
        if (createErr || !created?.user) {
          return new Response(JSON.stringify({ error: createErr?.message || "Could not create access." }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        userId = created.user.id;
        await admin
          .from("profiles")
          .update({
            email: directEmail,
            program_name: invite.program_name || null,
            truheirs_access: invite.truheirs_access,
            skip_onboarding: true,
            trust_design_booked: true,
          } as any)
          .eq("user_id", userId);
      }

      // Always require credential setup on direct (no-login) access
      await admin.auth.admin.updateUserById(userId!, {
        user_metadata: { needs_password_setup: true },
      });

      const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
        type: "magiclink",
        email: directEmail,
      });
      if (linkErr || !linkData?.properties?.hashed_token) {
        return new Response(JSON.stringify({ error: linkErr?.message || "Could not start session." }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const newUses = (invite.uses_count || 0) + 1;
      await admin
        .from("invite_links")
        .update({
          uses_count: newUses,
          failed_attempts: 0,
          locked_until: null,
          is_active:
            invite.invite_type === "temporary" && invite.max_uses != null && newUses >= invite.max_uses
              ? false
              : invite.is_active,
        })
        .eq("id", invite.id);

      return new Response(
        JSON.stringify({ success: true, email: directEmail, hashedToken: linkData.properties.hashed_token }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }


    // action === attach_existing : apply invite to an account that already exists
    if (body.action === "attach_existing") {
      const exEmail = (body.email || "").trim().toLowerCase();
      if (!exEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(exEmail)) {
        return new Response(JSON.stringify({ error: "Please provide a valid email." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: prof } = await admin
        .from("profiles")
        .select("user_id")
        .eq("email", exEmail)
        .maybeSingle();

      if (!prof) {
        return new Response(
          JSON.stringify({ error: "We could not find an account with that email. Choose \"New account\" instead." }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      await admin
        .from("profiles")
        .update({
          program_name: invite.program_name || null,
          truheirs_access: invite.truheirs_access,
        } as any)
        .eq("user_id", (prof as any).user_id);

      const exUses = (invite.uses_count || 0) + 1;
      await admin
        .from("invite_links")
        .update({
          uses_count: exUses,
          is_active:
            invite.invite_type === "temporary" && invite.max_uses != null && exUses >= invite.max_uses
              ? false
              : invite.is_active,
        })
        .eq("id", invite.id);

      return new Response(
        JSON.stringify({ success: true, existing: true, message: "Access added to your existing account. Sign in as usual." }),
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
      return new Response(JSON.stringify({ error: "An account with this email already exists. Switch to the existing account option." }), {
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
      const msg = userErr?.message || "Failed to create user";
      const alreadyExists = /already been registered|already exists|duplicate/i.test(msg);
      return new Response(
        JSON.stringify({
          error: alreadyExists
            ? "An account with this email already exists. Switch to the existing account option."
            : msg,
        }),
        {
          status: alreadyExists ? 409 : 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
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
        // Free access = no onboarding funnel
        skip_onboarding: invite.plan_type === "free" || invite.plan_type === "n" || !invite.plan_type,
        trust_design_booked: invite.plan_type === "free" || invite.plan_type === "n" || !invite.plan_type ? true : undefined,
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
      JSON.stringify({ success: true, userId, tempPassword, message: "Account created — check your email for login credentials." }),
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
