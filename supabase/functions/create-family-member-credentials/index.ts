import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

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
    // Validate input
    const CredentialsSchema = z.object({
      email: z.string().email('Invalid email format').max(255),
      firstName: z.string().min(1).max(100),
      lastName: z.string().max(100).optional(),
      familyMemberId: z.string().uuid('Invalid family member ID'),
      tempPassword: z.string().min(8, 'Password must be at least 8 characters').max(100)
    });
    
    const body = await req.json();
    const validation = CredentialsSchema.safeParse(body);
    
    if (!validation.success) {
      return new Response(
        JSON.stringify({ 
          error: 'Invalid input', 
          details: validation.error.flatten() 
        }), 
        { 
          status: 400, 
          headers: { "Content-Type": "application/json", ...corsHeaders } 
        }
      );
    }
    
    const { email, firstName, lastName, familyMemberId, tempPassword } = validation.data;

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
        role: 'family_member'
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
        password_hash: 'managed_by_auth' // We let Supabase Auth handle the actual password
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

    // Update profile membership_type to family_member
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({ 
        membership_type: 'family_member'
      })
      .eq('user_id', authUser.user.id);

    if (profileError) {
      console.error('Error updating profile membership type:', profileError);
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