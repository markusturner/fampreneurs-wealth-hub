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
}

const generateSecurePassword = (): string => {
  const length = 12;
  const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
  let password = "";
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  for (let i = 0; i < length; i++) {
    password += charset[array[i] % charset.length];
  }
  return password;
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  console.log("=== Create User Request Started ===");

  try {
    const { email, firstName, lastName, role }: CreateUserRequest = await req.json();
    
    console.log("Request data:", { email, firstName, lastName, role });

    // Validate input
    if (!email || !firstName || !role) {
      console.error("Missing required fields");
      return new Response(
        JSON.stringify({ error: "Missing required fields: email, firstName, and role are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase Admin Client
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Verify the requesting user is an admin
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

    // Check if requesting user is admin
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

    // Check if user already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(u => u.email === email);
    
    // Generate temporary password
    const tempPassword = generateSecurePassword();
    
    let authUser;
    let isExistingUser = false;

    if (existingUser) {
      console.log("User already exists, updating password:", email);
      isExistingUser = true;
      
      // Update existing user's password and metadata
      const { data: updatedUser, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        existingUser.id,
        {
          password: tempPassword,
          user_metadata: {
            first_name: firstName,
            last_name: lastName || "",
            role: role,
          },
        }
      );

      if (updateError) {
        console.error("Error updating user:", updateError);
        return new Response(
          JSON.stringify({ 
            success: false,
            error: updateError.message || "Failed to update user credentials" 
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      authUser = { user: updatedUser.user };
    } else {
      console.log("Creating new user with email:", email);

      // Create user in Auth
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: {
          first_name: firstName,
          last_name: lastName || "",
          role: role,
        },
      });

      if (createError) {
        console.error("Error creating auth user:", createError);
        return new Response(
          JSON.stringify({ 
            success: false,
            error: createError.message || "Failed to create user" 
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      authUser = newUser;
    }

    console.log(isExistingUser ? "User credentials updated:" : "User created successfully:", authUser.user.id);

    // Insert or update role into user_roles table (only for new users)
    if (!isExistingUser) {
      const { error: roleError } = await supabaseAdmin
        .from("user_roles")
        .insert({
          user_id: authUser.user.id,
          role: role,
          assigned_by: requestingUser.id,
        });

      if (roleError) {
        console.error("Error creating user role:", roleError);
      }
    }

    // Send email in background (non-blocking)
    const sendEmailInBackground = async () => {
      try {
        const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
        
        const emailHtml = `
          <!DOCTYPE html>
          <html>
            <head>
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background-color: #4F46E5; color: white; padding: 20px; text-align: center; }
                .content { background-color: #f9fafb; padding: 30px; }
                .credentials { background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
                .credential-item { margin: 15px 0; }
                .label { font-weight: bold; color: #6B7280; }
                .value { font-family: monospace; background-color: #F3F4F6; padding: 8px 12px; border-radius: 4px; display: inline-block; margin-top: 5px; }
                .button { display: inline-block; background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
                .footer { text-align: center; color: #6B7280; font-size: 12px; margin-top: 30px; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>Welcome to the Platform!</h1>
                </div>
                <div class="content">
                  <p>Hi ${firstName},</p>
                  <p>${isExistingUser ? 'Your login credentials have been updated' : 'Your account has been created'}. Below are your login credentials:</p>
                  
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

                  <p><strong>Important:</strong> Please change your password after your first login for security purposes.</p>
                  
                  <a href="${Deno.env.get("SUPABASE_URL")?.replace('.supabase.co', '.lovable.app') || 'https://your-app-url.com'}/auth" class="button">
                    Login to Your Account
                  </a>

                  <p>If you have any questions, please don't hesitate to reach out to our support team.</p>
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
          subject: "Your Account Credentials - TruHeirs",
          html: emailHtml,
        });

        if (emailError) {
          console.error("Background email error:", emailError);
          // Log but don't fail - email issues shouldn't block user creation
          console.log("⚠️ Email failed to send. Please verify your domain at resend.com/domains");
        } else {
          console.log("Background email sent successfully to:", email);
        }
      } catch (error) {
        console.error("Background email task failed:", error);
      }
    };

    // Start background email task (non-blocking)
    // @ts-ignore - EdgeRuntime is available in Supabase Edge Functions
    if (typeof EdgeRuntime !== 'undefined') {
      // @ts-ignore
      EdgeRuntime.waitUntil(sendEmailInBackground());
      console.log("Email scheduled for background delivery");
    } else {
      // Fallback for local development
      sendEmailInBackground().catch(console.error);
    }

    return new Response(
      JSON.stringify({
        success: true,
        userId: authUser.user.id,
        email: email,
        message: isExistingUser 
          ? "User credentials updated and email sent successfully."
          : "User created successfully. Email will be sent if domain is verified in Resend.",
        isExistingUser: isExistingUser
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("=== ERROR in create-user-with-credentials ===");
    console.error("Error details:", error);
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || "An unexpected error occurred",
        details: error.toString()
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
};

serve(handler);
