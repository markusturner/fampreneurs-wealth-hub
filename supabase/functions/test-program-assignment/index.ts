import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { userId, programName } = await req.json()

    console.log(`Testing program assignment for user ${userId} to program ${programName}`)

    // Update user's program
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ program_name: programName })
      .eq('user_id', userId)

    if (updateError) {
      throw updateError
    }

    // Check if user was automatically assigned to channel
    const { data: memberships, error: membershipError } = await supabase
      .from('group_memberships')
      .select(`
        id,
        role,
        community_groups (
          id,
          name
        )
      `)
      .eq('user_id', userId)

    if (membershipError) {
      throw membershipError
    }

    console.log(`User now has ${memberships?.length || 0} channel memberships:`, memberships)

    return new Response(JSON.stringify({
      success: true,
      message: `User assigned to program ${programName}`,
      channelMemberships: memberships
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('Error in test-program-assignment:', error)
    return new Response(JSON.stringify({ 
      error: error.message 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})