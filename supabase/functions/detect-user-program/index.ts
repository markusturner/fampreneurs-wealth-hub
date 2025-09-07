import { serve } from "https://deno.land/std@0.190.0/http/server.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

interface ProgramDetectionRequest {
  email: string
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { email }: ProgramDetectionRequest = await req.json()
    
    const apiKey = Deno.env.get("GOHIGHLEVEL_API_KEY")
    const locationId = Deno.env.get("GOHIGHLEVEL_LOCATION_ID")
    
    if (!apiKey || !locationId) {
      throw new Error("GoHighLevel API key or Location ID not configured")
    }

    console.log("Detecting program for email:", email)

    // Search for contact by email in GoHighLevel
    const searchResponse = await fetch(`https://services.leadconnectorhq.com/contacts/search/duplicate?email=${encodeURIComponent(email)}&locationId=${locationId}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Version": "2021-07-28"
      }
    })

    if (!searchResponse.ok) {
      const errorText = await searchResponse.text()
      console.error("Error searching GoHighLevel contact:", errorText)
      throw new Error(`Failed to search contact: ${searchResponse.status} ${errorText}`)
    }

    const searchResult = await searchResponse.json()
    console.log("GoHighLevel search result:", searchResult)

    if (!searchResult.contact) {
      console.log("No contact found in GoHighLevel for email:", email)
      return new Response(JSON.stringify({
        success: true,
        program_detected: false,
        program_name: null,
        message: "No program enrollment found"
      }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      })
    }

    const contact = searchResult.contact
    console.log("Contact found:", contact)

    // Extract program from tags or custom fields
    let detectedProgram = null

    // Check tags first
    if (contact.tags && contact.tags.length > 0) {
      for (const tag of contact.tags) {
        if (tag.includes("Family Vault")) {
          detectedProgram = "The Family Vault"
          break
        } else if (tag.includes("Family Business Accelerator")) {
          detectedProgram = "The Family Business Accelerator"
          break
        } else if (tag.includes("Family Legacy")) {
          detectedProgram = "The Family Legacy: VIP Weekend"
          break
        }
      }
    }

    // Check custom fields if no program found in tags
    if (!detectedProgram && contact.customFields) {
      for (const field of contact.customFields) {
        if (field.key === "program_name" && field.value) {
          const programValue = field.value.toLowerCase()
          if (programValue.includes("family vault")) {
            detectedProgram = "The Family Vault"
          } else if (programValue.includes("family business accelerator")) {
            detectedProgram = "The Family Business Accelerator"
          } else if (programValue.includes("family legacy")) {
            detectedProgram = "The Family Legacy: VIP Weekend"
          }
          break
        }
      }
    }

    // Map GoHighLevel names to signup form names if needed
    if (detectedProgram === "The Family Legacy") {
      detectedProgram = "The Family Legacy: VIP Weekend"
    }

    console.log("Detected program:", detectedProgram)

    return new Response(JSON.stringify({
      success: true,
      program_detected: !!detectedProgram,
      program_name: detectedProgram,
      contact_data: {
        id: contact.id,
        firstName: contact.firstName,
        lastName: contact.lastName,
        email: contact.email,
        tags: contact.tags,
        customFields: contact.customFields
      },
      message: detectedProgram ? `Program detected: ${detectedProgram}` : "No program enrollment found"
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    })

  } catch (error: any) {
    console.error("Error in detect-user-program function:", error)
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message,
        program_detected: false,
        program_name: null
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    )
  }
}

serve(handler)