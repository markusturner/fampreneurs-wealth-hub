import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.51.0'

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid authentication' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { agreementId, recipientEmail, fullName, programName, agreementDate, mailingAddress, signatureData } = await req.json()

    if (!recipientEmail || !fullName || !programName) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const apiKey = Deno.env.get("GOHIGHLEVEL_API_KEY")
    const locationId = Deno.env.get("GOHIGHLEVEL_LOCATION_ID")

    if (!apiKey || !locationId) {
      console.error("GoHighLevel credentials not configured")
      return new Response(JSON.stringify({ error: 'Email service not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Build a signature display
    const signatureHtml = signatureData?.startsWith('data:image')
      ? `<img src="${signatureData}" alt="Signature" style="max-height:60px; border:1px solid #ccc; padding:4px; border-radius:4px;" />`
      : `<p style="font-family: 'Brush Script MT', cursive; font-size:24px; color:#290a52;">${signatureData || fullName}</p>`

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h1 style="color: #290a52; margin-bottom: 5px;">Program Services Agreement</h1>
          <p style="color: #666; font-size: 14px;">${programName}</p>
        </div>
        
        <div style="background: #f9f9f9; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
          <table style="width: 100%; font-size: 14px;">
            <tr><td style="color:#888; padding:4px 0;">Full Name:</td><td style="font-weight:bold;">${fullName}</td></tr>
            <tr><td style="color:#888; padding:4px 0;">Mailing Address:</td><td style="font-weight:bold;">${mailingAddress || 'Not provided'}</td></tr>
            <tr><td style="color:#888; padding:4px 0;">Agreement Date:</td><td style="font-weight:bold;">${agreementDate || new Date().toISOString().split('T')[0]}</td></tr>
          </table>
        </div>

        <div style="border: 1px solid #ddd; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
          <h3 style="color: #290a52; margin-top: 0;">Signature</h3>
          ${signatureHtml}
          <p style="font-size: 12px; color: #888; margin-top: 8px;">
            Signed on: ${agreementDate || new Date().toISOString().split('T')[0]}
          </p>
        </div>

        <p style="font-size: 13px; color: #888; text-align: center;">
          This email confirms that ${fullName} has signed the ${programName} Program Services Agreement.
          Please keep this email for your records.
        </p>
        
        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
          <p style="font-size: 12px; color: #aaa;">The Fampreneurs &bull; TruHeirs Platform</p>
        </div>
      </div>
    `

    // Create/update contact in GoHighLevel
    const contactResponse = await fetch(`https://services.leadconnectorhq.com/contacts/`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Version": "2021-07-28"
      },
      body: JSON.stringify({
        firstName: fullName.split(' ')[0] || fullName,
        lastName: fullName.split(' ').slice(1).join(' ') || '',
        email: recipientEmail,
        source: "Agreement Signing",
        tags: [programName, "Agreement Signed"],
        locationId
      })
    })

    const contactData = await contactResponse.json()
    const contactId = contactData?.contact?.id

    if (!contactId) {
      // Try to find existing contact
      const searchResponse = await fetch(
        `https://services.leadconnectorhq.com/contacts/search/duplicate?locationId=${locationId}&email=${encodeURIComponent(recipientEmail)}`,
        {
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Version": "2021-07-28"
          }
        }
      )
      const searchData = await searchResponse.json()
      const existingContactId = searchData?.contact?.id

      if (!existingContactId) {
        console.error("Could not create or find contact")
        return new Response(JSON.stringify({ success: true, warning: 'Contact not found but agreement saved' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // Send email to existing contact
      await fetch(`https://services.leadconnectorhq.com/contacts/${existingContactId}/campaigns/emails`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "Version": "2021-07-28"
        },
        body: JSON.stringify({
          emailBody: emailHtml,
          subject: `Your Signed ${programName} Agreement - The Fampreneurs`,
          html: emailHtml,
        })
      })
    } else {
      // Send email to new contact
      await fetch(`https://services.leadconnectorhq.com/contacts/${contactId}/campaigns/emails`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "Version": "2021-07-28"
        },
        body: JSON.stringify({
          emailBody: emailHtml,
          subject: `Your Signed ${programName} Agreement - The Fampreneurs`,
          html: emailHtml,
        })
      })
    }

    console.log(`Agreement email sent to ${recipientEmail} for ${programName}`)

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error: any) {
    console.error("Error in send-agreement-email:", error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
