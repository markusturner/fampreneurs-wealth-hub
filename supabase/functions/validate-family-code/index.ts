import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface FamilyCodeRequest {
  code: string
  ip_address?: string
  user_agent?: string
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { code, ip_address, user_agent }: FamilyCodeRequest = await req.json()

    if (!code) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Family secret code is required' 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      )
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Find the family secret code
    const { data: codeRecord, error: codeError } = await supabase
      .from('family_secret_codes')
      .select('*')
      .eq('code', code.toUpperCase().trim())
      .eq('is_active', true)
      .single()

    if (codeError || !codeRecord) {
      console.log('Code not found or error:', codeError)
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Invalid access code' 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401 
        }
      )
    }

    // Check if code has expired
    if (codeRecord.expires_at && new Date(codeRecord.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Access code has expired' 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401 
        }
      )
    }

    // Check usage limit
    if (codeRecord.max_uses && codeRecord.current_uses >= codeRecord.max_uses) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Access code usage limit reached' 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401 
        }
      )
    }

    // Get auth context if available
    const authHeader = req.headers.get('authorization')
    let userId = null
    
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '')
      const { data: { user } } = await supabase.auth.getUser(token)
      userId = user?.id
    }

    // Log the usage
    await supabase
      .from('family_code_usage_log')
      .insert({
        code_id: codeRecord.id,
        used_by: userId,
        ip_address: ip_address,
        user_agent: user_agent
      })

    // Update usage count
    await supabase
      .from('family_secret_codes')
      .update({ 
        current_uses: codeRecord.current_uses + 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', codeRecord.id)

    console.log(`Family code ${code} validated successfully for user ${userId || 'anonymous'}`)

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Access granted',
        access_level: codeRecord.access_level,
        permissions: codeRecord.permissions,
        description: codeRecord.description
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Error validating family code:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: 'Server error occurred while validating code' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})