import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Get the calling user's profile to verify admin status
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: { headers: { Authorization: authHeader } },
        auth: { persistSession: false }
      }
    )

    // Verify the calling user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) {
      throw new Error('Unauthorized')
    }

    // Check if calling user is admin
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('is_admin, email')
      .eq('user_id', user.id)
      .single()

    if (profileError || !profile?.is_admin) {
      console.log('Unauthorized access attempt by:', user.email)
      throw new Error('Unauthorized: Admin access required')
    }

    // Only allow markusturner94@gmail.com
    if (profile.email !== 'markusturner94@gmail.com') {
      console.log('Unauthorized admin access attempt by:', profile.email)
      throw new Error('Unauthorized: Insufficient privileges')
    }

    const { email, firstName, lastName, role } = await req.json()

    console.log(`Admin creating user: ${email} with role: ${role}`)

    // Generate a temporary password
    const tempPassword = crypto.randomUUID()

    // Create the user in Supabase Auth
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
      }
    })

    if (createError) {
      console.error('Error creating user:', createError)
      throw createError
    }

    if (!newUser.user) {
      throw new Error('User creation failed')
    }

    console.log(`User created successfully: ${newUser.user.id}`)

    // Insert role into user_roles table
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .insert({
        user_id: newUser.user.id,
        role: role,
        assigned_by: user.id
      })

    if (roleError) {
      console.error('Error assigning role:', roleError)
      // Don't fail the whole operation if role assignment fails
    }

    // Send password reset email so user can set their own password
    const { error: resetError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: email,
    })

    if (resetError) {
      console.error('Error sending password reset:', resetError)
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'User created successfully',
        userId: newUser.user.id,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error: any) {
    console.error('Error in create-admin-user:', error)
    return new Response(
      JSON.stringify({
        error: error.message || 'Internal server error',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
