import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface FamilyMemberCredentialsRequest {
  email: string;
  firstName: string;
  lastName?: string;
  familyMemberId: string;
  tempPassword: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, firstName, lastName, familyMemberId, tempPassword }: FamilyMemberCredentialsRequest = await req.json();

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

    // Create user in Auth
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        first_name: firstName,
        last_name: lastName || '',
        role: 'family_office_only'
      }
    });

    if (authError) {
      console.error('Error creating auth user:', authError);
      throw authError;
    }

    // Create family member credentials record
    const { error: credentialsError } = await supabaseAdmin
      .from('family_member_credentials')
      .insert({
        family_member_id: familyMemberId,
        email: email,
        password_hash: 'managed_by_auth', // We let Supabase Auth handle the actual password
        role: 'family_office_only'
      });

    if (credentialsError) {
      console.error('Error creating credentials record:', credentialsError);
      // Clean up auth user if credentials creation fails
      await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
      throw credentialsError;
    }

    // Update family member status
    const { error: updateError } = await supabaseAdmin
      .from('family_members')
      .update({ 
        status: 'active',
        invitation_sent_at: new Date().toISOString() 
      })
      .eq('id', familyMemberId);

    if (updateError) {
      console.error('Error updating family member:', updateError);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        userId: authUser.user.id,
        email: email,
        message: 'Family member credentials created successfully'
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in create-family-member-credentials function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);