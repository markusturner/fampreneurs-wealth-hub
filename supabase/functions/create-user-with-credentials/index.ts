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

    // Generate temporary password
    const tempPassword = generateSecurePassword();

    console.log("Creating user with email:", email);

    // Create user in Auth
    const { data: authUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
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
        JSON.stringify({ error: createError.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("User created successfully:", authUser.user.id);

    // Insert role into user_roles table
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

    // Send credentials email using Resend
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
              <p>Your account has been created. Below are your login credentials:</p>
              
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

    try {
      const { error: emailError } = await resend.emails.send({
        from: "Platform <onboarding@resend.dev>",
        to: [email],
        subject: "Your Account Credentials",
        html: emailHtml,
      });

      if (emailError) {
        console.error("Error sending email:", emailError);
        // Don't fail the whole request if email fails
      } else {
        console.log("Credentials email sent successfully to:", email);
      }
    } catch (emailError) {
      console.error("Failed to send credentials email:", emailError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        userId: authUser.user.id,
        email: email,
        message: "User created successfully and credentials sent via email",
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
