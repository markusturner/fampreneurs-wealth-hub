import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.51.0"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

interface RecoveryRequest {
  method: 'email' | 'phone';
  contact: string;
  type: 'username' | 'password';
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client with the service role key for admin access
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") || "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
    )

    const { method, contact, type } = await req.json() as RecoveryRequest

    // Password reset requests can use built-in Supabase functionality
    if (type === "password" && method === "email") {
      const { error } = await supabaseAdmin.auth.resetPasswordForEmail(contact, {
        redirectTo: `${req.headers.get("origin") || ""}/reset-password`,
      })
      
      if (error) throw error
      
      return new Response(
        JSON.stringify({ success: true, message: "Password reset email sent" }),
        { 
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200 
        }
      )
    }
    
    // Username recovery for email
    if (type === "username" && method === "email") {
      // Find user with the given email
      const { data: userList, error } = await supabaseAdmin.auth.admin.listUsers({
        filter: {
          email: contact
        }
      })
      
      if (error) throw error
      
      const user = userList.users[0]
      
      if (user) {
        // In a real implementation, you would use an email service like SendGrid or Resend.com here
        // to send an email with the username to the user
        console.log(`Found username for ${contact}: ${user.email}`)
        
        // Here we would send an actual email, but for this example we just log it
      }
      
      // Always return success for security reasons (even if no user was found)
      return new Response(
        JSON.stringify({ success: true, message: "Username recovery email sent" }),
        { 
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200 
        }
      )
    }
    
    // Username recovery for phone number
    if (type === "username" && method === "phone") {
      // Find user profile with the given phone number
      const { data: profiles, error } = await supabaseAdmin
        .from('profiles')
        .select('user_id')
        .eq('phone', contact)
        .limit(1)
      
      if (error) throw error
      
      if (profiles && profiles.length > 0) {
        // Get the user details from auth
        const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(profiles[0].user_id)
        
        if (!userError && userData?.user) {
          // In a real implementation, you would send an SMS with the username
          console.log(`Found username for phone ${contact}: ${userData.user.email}`)
        }
      }
      
      // Always return success for security reasons (even if no user was found)
      return new Response(
        JSON.stringify({ success: true, message: "Username recovery SMS sent" }),
        { 
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200 
        }
      )
    }
    
    // Phone-based recovery would require integration with an SMS service like Twilio
    if (method === "phone") {
      // In a real implementation, this would verify the phone exists in the database,
      // then use an SMS service like Twilio to send a verification code
      console.log(`Phone recovery requested for: ${contact}, type: ${type}`)
      
      // Simulate successful SMS sending
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `Recovery ${type === "password" ? "code" : "information"} sent via SMS` 
        }),
        { 
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200 
        }
      )
    }
    
    throw new Error("Invalid recovery request")
  } catch (error) {
    console.error("Account recovery error:", error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: error.message || "An unexpected error occurred" 
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400 
      }
    )
  }
})