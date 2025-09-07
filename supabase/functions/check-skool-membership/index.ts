import { serve } from "https://deno.land/std@0.190.0/http/server.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

interface SkoolMembershipRequest {
  email: string
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { email }: SkoolMembershipRequest = await req.json()
    
    const apiKey = Deno.env.get("SKOOL_API_KEY")
    
    if (!apiKey) {
      throw new Error("Skool API key not configured")
    }

    console.log("Checking Skool membership for email:", email)

    // Check Fampreneurs Skool community membership
    const response = await fetch(`https://api.skool.com/communities/members`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      }
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("Error checking Skool membership:", errorText)
      throw new Error(`Failed to check membership: ${response.status} ${errorText}`)
    }

    const membersData = await response.json()
    console.log("Skool API response:", membersData)

    // Find member by email
    const member = membersData.members?.find((m: any) => 
      m.email?.toLowerCase() === email.toLowerCase()
    )

    if (member) {
      console.log("Member found in Skool community:", member)
      return new Response(JSON.stringify({
        success: true,
        is_member: true,
        member_data: {
          id: member.id,
          name: member.name,
          email: member.email,
          joined_at: member.joined_at,
          status: member.status
        },
        message: "Member found in Fampreneurs community"
      }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      })
    } else {
      console.log("Member not found in Skool community for email:", email)
      return new Response(JSON.stringify({
        success: true,
        is_member: false,
        member_data: null,
        message: "Email not found in Fampreneurs community"
      }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      })
    }

  } catch (error: any) {
    console.error("Error in check-skool-membership function:", error)
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message,
        is_member: false,
        member_data: null
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    )
  }
}

serve(handler)