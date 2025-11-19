import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.51.0'
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

// Input validation schema
const emailRequestSchema = z.object({
  email: z.string()
    .trim()
    .email({ message: "Invalid email address" })
    .max(255, { message: "Email must be less than 255 characters" }),
  firstName: z.string()
    .trim()
    .min(1, { message: "First name cannot be empty" })
    .max(100, { message: "First name must be less than 100 characters" }),
  lastName: z.string()
    .trim()
    .max(100, { message: "Last name must be less than 100 characters" })
    .optional(),
  programName: z.string()
    .trim()
    .max(200, { message: "Program name must be less than 200 characters" }),
  membershipType: z.string()
    .trim()
    .max(100, { message: "Membership type must be less than 100 characters" }),
  templateId: z.string().optional()
})

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Authentication check
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      console.error('Missing authorization header')
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()

    if (userError || !user) {
      console.error('Authentication failed:', userError)
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse and validate input
    const body = await req.json()
    const validationResult = emailRequestSchema.safeParse(body)
    
    if (!validationResult.success) {
      console.error('Validation failed:', validationResult.error)
      return new Response(
        JSON.stringify({ 
          error: 'Invalid input', 
          details: validationResult.error.errors 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { email, firstName, lastName, programName, membershipType, templateId } = validationResult.data
    
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

    console.log("Creating/updating contact in GoHighLevel for user:", user.id)

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