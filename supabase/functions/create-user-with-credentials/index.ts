import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreateUserRequest {
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  programName?: string;
  mailingAddress?: string;
  truHeirsAccess?: boolean;
  isBulkInvite?: boolean;
}

const generateSecurePassword = (): string => {
  // Use only alphanumeric chars to avoid copy-paste issues from emails
  const length = 14;
  const lower = "abcdefghjkmnpqrstuvwxyz";
  const upper = "ABCDEFGHJKMNPQRSTUVWXYZ";
  const digits = "23456789";
  const charset = lower + upper + digits;
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  // Guarantee at least one of each type
  let password = lower[array[0] % lower.length] +
                 upper[array[1] % upper.length] +
                 digits[array[2] % digits.length];
  for (let i = 3; i < length; i++) {
    password += charset[array[i] % charset.length];
  }
  // Shuffle the password
  const shuffled = password.split('');
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = array[i] % (i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.join('');
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  console.log("=== Create User Request Started ===");

  try {
    const { email, firstName, lastName, role, programName, mailingAddress, truHeirsAccess, isBulkInvite }: CreateUserRequest = await req.json();
    
    console.log("Request data:", { email, firstName, lastName, role, isBulkInvite });

    if (!email || !role) {
      console.error("Missing required fields");
      return new Response(
        JSON.stringify({ error: "Missing required fields: email and role are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user: requestingUser }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !requestingUser) {
      return new Response(
        JSON.stringify({ error: "Invalid authorization" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("is_admin")
      .eq("user_id", requestingUser.id)
      .single();

    if (profileError || !profile?.is_admin) {
      return new Response(
        JSON.stringify({ error: "Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(u => u.email === email);
    
    const tempPassword = generateSecurePassword();
    
    let authUser;
    let isExistingUser = false;

    if (existingUser) {
      console.log("User already exists, updating password:", email);
      isExistingUser = true;
      
      const { data: updatedUser, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        existingUser.id,
        {
          password: tempPassword,
          user_metadata: {
            first_name: firstName || "Invited",
            last_name: lastName || "User",
            role: role,
            needs_profile_completion: isBulkInvite ? true : false,
          },
        }
      );

      if (updateError) {
        console.error("Error updating user:", updateError);
        return new Response(
          JSON.stringify({ success: false, error: updateError.message || "Failed to update user credentials" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      authUser = { user: updatedUser.user };
    } else {
      console.log("Creating new user with email:", email);

      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: {
          first_name: firstName || "Invited",
          last_name: lastName || "User",
          role: role,
          needs_profile_completion: isBulkInvite ? true : false,
        },
      });

      if (createError) {
        console.error("Error creating auth user:", createError);
        return new Response(
          JSON.stringify({ success: false, error: createError.message || "Failed to create user" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      authUser = newUser;
    }

    console.log(isExistingUser ? "User credentials updated:" : "User created successfully:", authUser.user.id);

    if (!isExistingUser) {
      const { error: roleError } = await supabaseAdmin
        .from("user_roles")
        .insert({ user_id: authUser.user.id, role: role, assigned_by: requestingUser.id });

      if (roleError) {
        console.error("Error creating user role:", roleError);
      }
    }

    if (programName || mailingAddress || truHeirsAccess !== undefined) {
      console.log("Setting additional profile fields:", { programName, mailingAddress, truHeirsAccess });
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const updateFields: Record<string, unknown> = {};
      if (programName) updateFields.program_name = programName;
      if (mailingAddress) updateFields.mailing_address = mailingAddress;
      if (truHeirsAccess !== undefined) updateFields.truheirs_access = truHeirsAccess;
      if (isBulkInvite) updateFields.needs_profile_completion = true;

      const { error: updateError } = await supabaseAdmin
        .from("profiles")
        .update(updateFields)
        .eq("user_id", authUser.user.id);

      if (updateError) {
        const { error: retryError } = await supabaseAdmin
          .from("profiles")
          .upsert({
            user_id: authUser.user.id,
            first_name: firstName || "Invited",
            last_name: lastName || "User",
            email: email,
            ...updateFields,
          }, { onConflict: "user_id" });
        
        if (retryError) {
          console.error("Error upserting profile with fields:", retryError);
        }
      }
    }

    // Assign user to community group based on program
    if (programName) {
      const PROGRAM_TO_GROUP: Record<string, string> = {
        "The Family Business University": "Family Business University",
        "The Family Vault": "The Family Vault",
        "The Family Business Accelerator": "The Family Business Accelerator",
        "The Family Legacy: VIP Weekend": "The Family Legacy: VIP Weekend",
        "The Family Fortune Mastermind": "The Family Fortune Mastermind",
      };

      const groupName = PROGRAM_TO_GROUP[programName];
      if (groupName) {
        const { data: group } = await supabaseAdmin
          .from("community_groups")
          .select("id")
          .eq("name", groupName)
          .maybeSingle();

        if (group?.id) {
          const { error: membershipError } = await supabaseAdmin
            .from("group_memberships")
            .upsert({ group_id: group.id, user_id: authUser.user.id, role: "member" }, { onConflict: "group_id,user_id" });

          if (membershipError) {
            console.error("Error adding user to community group:", membershipError);
          } else {
            console.log(`User added to community group: ${groupName}`);
          }
        }
      }
    }

    // Send email in background
    const sendEmailInBackground = async () => {
      try {
        const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
        
        const loginUrl = "https://fampreneurs-wealth-hub.lovable.app/auth";
        
        const emailHtml = isBulkInvite
          ? `
          <!DOCTYPE html>
          <html>
            <head>
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background-color: #290a52; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
                .content { background-color: #f5f5f5; padding: 30px; border-radius: 0 0 8px 8px; }
                .credentials { background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
                .credential-item { margin: 15px 0; }
                .label { font-weight: bold; color: #6B7280; }
                .value { font-family: monospace; background-color: #F3F4F6; padding: 10px 15px; border-radius: 4px; display: block; margin-top: 5px; word-break: break-all; }
                .button-container { text-align: center; margin: 30px 0; }
                .button { display: inline-block; background-color: #ffb500; color: #290a52; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 18px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
                .steps { background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
                .steps-table { width: 100%; border-collapse: collapse; }
                .step-row td { padding: 6px 0; vertical-align: top; }
                .step-number-cell { width: 36px; }
                .step-number { display: inline-block; background-color: #ffb500; color: #290a52; width: 28px; height: 28px; border-radius: 50%; text-align: center; font-weight: bold; font-size: 14px; line-height: 28px; }
                .step-text { font-size: 15px; line-height: 1.5; padding-left: 8px; }
                .footer { text-align: center; color: #6B7280; font-size: 12px; margin-top: 30px; }
                @media only screen and (max-width: 600px) {
                  .container { padding: 10px; }
                  .header { padding: 20px; }
                  .content { padding: 20px; }
                  .button { padding: 14px 30px; font-size: 16px; display: block; width: 100%; box-sizing: border-box; }
                }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1 style="margin: 0; font-size: 28px;">You're Invited to TruHeirs!</h1>
                  <p style="margin: 10px 0 0; opacity: 0.9;">Complete your profile to get started</p>
                </div>
                <div class="content">
                  <p style="font-size: 16px;">Hi there! 👋</p>
                  <p style="font-size: 16px;">You've been invited to join the TruHeirs platform${programName ? ` as part of the <strong>${programName}</strong> program` : ''}. Your temporary login credentials are below.</p>
                  
                  <div class="credentials">
                    <div class="credential-item">
                      <div class="label">Email:</div>
                      <div class="value">${email}</div>
                    </div>
                    <div class="credential-item">
                      <div class="label">Temporary Password:</div>
                      <div class="value">${tempPassword}</div>
                    </div>
                  </div>

                   <div class="steps">
                     <p style="font-weight: bold; margin-top: 0;">To get started:</p>
                     <table role="presentation" class="steps-table">
                       <tr class="step-row">
                         <td class="step-number-cell"><span class="step-number">1</span></td>
                         <td class="step-text">Log in with the credentials above</td>
                       </tr>
                       <tr class="step-row">
                         <td class="step-number-cell"><span class="step-number">2</span></td>
                         <td class="step-text">Complete your onboarding by entering your <strong>first name</strong>, <strong>last name</strong>, <strong>email</strong>, <strong>phone number</strong>, <strong>t-shirt size</strong>, and <strong>mailing address</strong></td>
                       </tr>
                       <tr class="step-row">
                         <td class="step-number-cell"><span class="step-number">3</span></td>
                         <td class="step-text">Sign your <strong>Program Agreement</strong></td>
                       </tr>
                       <tr class="step-row">
                         <td class="step-number-cell"><span class="step-number">4</span></td>
                         <td class="step-text">Upload your <strong>profile photo</strong></td>
                       </tr>
                       <tr class="step-row">
                         <td class="step-number-cell"><span class="step-number">5</span></td>
                         <td class="step-text"><strong style="color: #e53e3e;">⚠️ Change your password immediately</strong> for security — go to Profile Settings after logging in</td>
                       </tr>
                     </table>
                   </div>
                  
                  <div class="button-container">
                    <a href="${loginUrl}" class="button">
                      Accept Invitation & Log In
                    </a>
                  </div>

                  <p style="font-size: 16px;">If you have any questions, please don't hesitate to reach out to our support team.</p>
                </div>
                <div class="footer">
                  <p>This is an automated message. Please do not reply to this email.</p>
                </div>
              </div>
            </body>
          </html>
          `
          : `
          <!DOCTYPE html>
          <html>
            <head>
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background-color: #5b5fd6; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
                .content { background-color: #f5f5f5; padding: 30px; border-radius: 0 0 8px 8px; }
                .credentials { background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
                .credential-item { margin: 15px 0; }
                .label { font-weight: bold; color: #6B7280; }
                .value { font-family: monospace; background-color: #F3F4F6; padding: 10px 15px; border-radius: 4px; display: block; margin-top: 5px; word-break: break-all; }
                .button-container { text-align: center; margin: 30px 0; }
                .button { display: inline-block; background-color: #ffb500; color: #290a52; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 18px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
                .footer { text-align: center; color: #6B7280; font-size: 12px; margin-top: 30px; }
                @media only screen and (max-width: 600px) {
                  .container { padding: 10px; }
                  .header { padding: 20px; }
                  .content { padding: 20px; }
                  .button { padding: 14px 30px; font-size: 16px; display: block; width: 100%; box-sizing: border-box; }
                }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1 style="margin: 0; font-size: 32px;">Welcome to the Platform!</h1>
                </div>
                <div class="content">
                  <p style="font-size: 16px;">Hi ${firstName},</p>
                  <p style="font-size: 16px;">${isExistingUser ? 'Your login credentials have been updated' : 'Your account has been created'}. Below are your login credentials:</p>
                  
                  <div class="credentials">
                    <div class="credential-item">
                      <div class="label">Email:</div>
                      <div class="value">${email}</div>
                    </div>
                    <div class="credential-item">
                      <div class="label">Temporary Password:</div>
                      <div class="value">${tempPassword}</div>
                    </div>
                    <div class="credential-item">
                      <div class="label">Role:</div>
                      <div class="value">${role}</div>
                    </div>
                  </div>

                  <p style="font-size: 16px;"><strong>Important:</strong> Please change your password after your first login for security purposes.</p>
                  
                  <div class="button-container">
                    <a href="${loginUrl}" class="button">
                      Login to Your Account
                    </a>
                  </div>

                  <p style="font-size: 16px;">If you have any questions, please don't hesitate to reach out to our support team.</p>
                </div>
                <div class="footer">
                  <p>This is an automated message. Please do not reply to this email.</p>
                </div>
              </div>
            </body>
          </html>
          `;

        const { error: emailError } = await resend.emails.send({
          from: "TruHeirs <noreply@truheirs.app>",
          to: [email],
          subject: isBulkInvite ? "You're Invited to TruHeirs — Complete Your Profile" : "Your Account Credentials - TruHeirs",
          html: emailHtml,
        });

        if (emailError) {
          console.error("Background email error:", emailError);
          console.log("⚠️ Email failed to send. Please verify your domain at resend.com/domains");
        } else {
          console.log("Background email sent successfully to:", email);
        }
      } catch (error) {
        console.error("Background email task failed:", error);
      }
    };

    // @ts-ignore - EdgeRuntime is available in Supabase Edge Functions
    if (typeof EdgeRuntime !== 'undefined') {
      // @ts-ignore
      EdgeRuntime.waitUntil(sendEmailInBackground());
      console.log("Email scheduled for background delivery");
    } else {
      sendEmailInBackground().catch(console.error);
    }

    return new Response(
      JSON.stringify({
        success: true,
        userId: authUser.user.id,
        email: email,
        message: isExistingUser 
          ? "User credentials updated and email sent successfully."
          : "User created successfully. Invitation email will be sent.",
        isExistingUser: isExistingUser
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("=== ERROR in create-user-with-credentials ===");
    console.error("Error details:", error);
    
    return new Response(
      JSON.stringify({ error: error.message || "An unexpected error occurred", details: error.toString() }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
