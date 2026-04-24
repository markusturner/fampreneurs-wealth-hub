import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.51.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { eventType, data } = await req.json()

    console.log('Zapier notification triggered:', { eventType, data })

    // Get Zapier settings
    const { data: settings, error: settingsError } = await supabase
      .from('platform_settings')
      .select('setting_key, setting_value')
      .in('setting_key', [
        'zapier_personal_messages_webhook',
        'zapier_group_messages_webhook',
        'zapier_coaching_calls_webhook',
        'zapier_enable_personal_messages',
        'zapier_enable_group_messages',
        'zapier_enable_coaching_calls'
      ])

    if (settingsError) {
      console.error('Error fetching settings:', settingsError)
      throw settingsError
    }

    const settingsMap = settings?.reduce((acc, item) => {
      acc[item.setting_key] = item.setting_value
      return acc
    }, {} as Record<string, string>) || {}

    let webhookUrl: string | undefined
    let isEnabled = false

    // Determine which webhook to use based on event type
    switch (eventType) {
      case 'personal_message':
        webhookUrl = settingsMap.zapier_personal_messages_webhook
        isEnabled = settingsMap.zapier_enable_personal_messages === 'true'
        break
      case 'group_message':
        webhookUrl = settingsMap.zapier_group_messages_webhook
        isEnabled = settingsMap.zapier_enable_group_messages === 'true'
        break
      case 'coaching_call':
        webhookUrl = settingsMap.zapier_coaching_calls_webhook
        isEnabled = settingsMap.zapier_enable_coaching_calls === 'true'
        break
      default:
        console.log('Unknown event type:', eventType)
        return new Response(
          JSON.stringify({ success: false, error: 'Unknown event type' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }

    if (!isEnabled || !webhookUrl) {
      console.log('Webhook not enabled or URL not configured for:', eventType)
      return new Response(
        JSON.stringify({ success: true, message: 'Webhook not configured or disabled' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Send webhook to Zapier
    const webhookPayload = {
      event_type: eventType,
      timestamp: new Date().toISOString(),
      ...data
    }

    console.log('Sending webhook to:', webhookUrl, 'with payload:', webhookPayload)

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(webhookPayload),
    })

    if (!response.ok) {
      console.error('Webhook failed with status:', response.status)
      throw new Error(`Webhook failed with status ${response.status}`)
    }

    console.log('Webhook sent successfully')

    return new Response(
      JSON.stringify({ success: true, message: 'Webhook sent successfully' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in zapier-notifications function:', error)
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})