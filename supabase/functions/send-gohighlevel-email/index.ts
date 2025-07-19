import { serve } from "https://deno.land/std@0.190.0/http/server.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

interface GoHighLevelEmailRequest {
  email: string
  firstName: string
  lastName?: string
  programName: string
  membershipType: string
  templateId?: string
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { email, firstName, lastName, programName, membershipType, templateId }: GoHighLevelEmailRequest = await req.json()
    
    const apiKey = Deno.env.get("GOHIGHLEVEL_API_KEY")
    const locationId = Deno.env.get("GOHIGHLEVEL_LOCATION_ID")
    
    if (!apiKey || !locationId) {
      throw new Error("GoHighLevel API key or Location ID not configured")
    }

    // First, create or update the contact
    const contactData = {
      firstName: firstName,
      lastName: lastName || "",
      email: email,
      source: "Fampreneurs Platform",
      tags: [programName, membershipType],
      customFields: [
        {
          key: "program_name",
          field_value: programName
        },
        {
          key: "membership_type", 
          field_value: membershipType
        }
      ]
    }

    console.log("Creating/updating contact in GoHighLevel:", contactData)

    const contactResponse = await fetch(`https://services.leadconnectorhq.com/contacts/`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Version": "2021-07-28"
      },
      body: JSON.stringify({
        ...contactData,
        locationId: locationId
      })
    })

    if (!contactResponse.ok) {
      const errorText = await contactResponse.text()
      console.error("Error creating contact:", errorText)
      throw new Error(`Failed to create contact: ${contactResponse.status} ${errorText}`)
    }

    const contactResult = await contactResponse.json()
    console.log("Contact created/updated successfully:", contactResult)

    // Send welcome email using GoHighLevel template (if templateId provided)
    if (templateId) {
      const emailData = {
        locationId: locationId,
        contactId: contactResult.contact?.id,
        templateId: templateId,
        from: "noreply@thefampreneurs.com",
        fromName: "The Fampreneurs Team"
      }

      console.log("Sending email via GoHighLevel template:", emailData)

      const emailResponse = await fetch(`https://services.leadconnectorhq.com/conversations/messages/email`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "Version": "2021-07-28"
        },
        body: JSON.stringify(emailData)
      })

      if (!emailResponse.ok) {
        const errorText = await emailResponse.text()
        console.error("Error sending email:", errorText)
        throw new Error(`Failed to send email: ${emailResponse.status} ${errorText}`)
      }

      const emailResult = await emailResponse.json()
      console.log("Email sent successfully via GoHighLevel:", emailResult)

      return new Response(JSON.stringify({
        success: true,
        contact: contactResult,
        email: emailResult,
        message: "Contact created and welcome email sent via GoHighLevel"
      }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      })
    } else {
      // If no template ID, just return the contact creation result
      return new Response(JSON.stringify({
        success: true,
        contact: contactResult,
        message: "Contact created in GoHighLevel successfully"
      }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      })
    }

  } catch (error: any) {
    console.error("Error in send-gohighlevel-email function:", error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    )
  }
}

serve(handler)