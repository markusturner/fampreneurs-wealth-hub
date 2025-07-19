import { serve } from "https://deno.land/std@0.190.0/http/server.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

interface LoginCredentialsRequest {
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
    const { email, firstName, lastName, programName, membershipType, templateId }: LoginCredentialsRequest = await req.json()
    
    const apiKey = Deno.env.get("GOHIGHLEVEL_API_KEY")
    const locationId = Deno.env.get("GOHIGHLEVEL_LOCATION_ID")
    
    if (!apiKey || !locationId) {
      throw new Error("GoHighLevel API key or Location ID not configured")
    }

    // First, create or update the contact in GoHighLevel
    const contactData = {
      firstName: firstName,
      lastName: lastName || "",
      email: email,
      source: "Fampreneurs Platform",
      tags: [programName, membershipType, "New User"],
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

    // Send welcome email using GoHighLevel (either template or direct email)
    let emailResult = null
    
    if (templateId) {
      // Use template if provided
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
        console.error("Error sending template email:", errorText)
        throw new Error(`Failed to send template email: ${emailResponse.status} ${errorText}`)
      }

      emailResult = await emailResponse.json()
    } else {
      // Send direct email without template
      const emailData = {
        locationId: locationId,
        contactId: contactResult.contact?.id,
        from: "noreply@thefampreneurs.com",
        fromName: "The Fampreneurs Team",
        subject: "Welcome to The Fampreneurs - Your Login Credentials",
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Welcome to The Fampreneurs</title>
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #290a52; margin-bottom: 10px;">Welcome to The Fampreneurs!</h1>
              <div style="width: 50px; height: 3px; background-color: #ffb500; margin: 0 auto;"></div>
            </div>
            
            <div style="background-color: #f8f9fa; padding: 25px; border-radius: 10px; margin-bottom: 25px;">
              <h2 style="color: #290a52; margin-top: 0;">Hello ${firstName}!</h2>
              <p style="margin-bottom: 15px;">
                Congratulations on joining <strong>${programName}</strong>! We're excited to have you as part of our family business community.
              </p>
              
              <div style="background-color: white; padding: 20px; border-radius: 8px; border-left: 4px solid #ffb500;">
                <h3 style="color: #290a52; margin-top: 0;">Your Account Details:</h3>
                <p><strong>Email:</strong> ${email}</p>
                <p><strong>Program:</strong> ${programName}</p>
                <p><strong>Membership Type:</strong> ${membershipType}</p>
              </div>
            </div>
            
            <div style="background-color: #290a52; color: white; padding: 25px; border-radius: 10px; text-align: center; margin-bottom: 25px;">
              <h3 style="margin-top: 0; color: white;">Next Steps:</h3>
              <ol style="text-align: left; padding-left: 20px;">
                <li style="margin-bottom: 10px;">Log in to your account using your email address</li>
                <li style="margin-bottom: 10px;">Complete your profile setup (including uploading a profile photo)</li>
                <li style="margin-bottom: 10px;">Explore your program materials and community channels</li>
                <li style="margin-bottom: 10px;">Join upcoming coaching sessions and group calls</li>
              </ol>
            </div>
            
            <div style="text-align: center; margin-bottom: 25px;">
              <a href="${Deno.env.get('FRONTEND_URL') || 'https://app.thefampreneurs.com'}" 
                 style="background-color: #ffb500; color: #290a52; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
                Access Your Account
              </a>
            </div>
            
            <div style="border-top: 1px solid #eee; padding-top: 20px; font-size: 14px; color: #666;">
              <p><strong>Need Help?</strong></p>
              <p>If you have any questions or need assistance, please don't hesitate to reach out to our support team or ask in the community channels.</p>
              
              <p style="margin-top: 20px;">
                Welcome to the family!<br>
                <strong>The Fampreneurs Team</strong>
              </p>
            </div>
          </body>
          </html>
        `
      }

      console.log("Sending direct email via GoHighLevel:", emailData)

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
        console.error("Error sending direct email:", errorText)
        throw new Error(`Failed to send direct email: ${emailResponse.status} ${errorText}`)
      }

      emailResult = await emailResponse.json()
    }

    console.log("Login credentials email sent successfully via GoHighLevel:", emailResult)

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
  } catch (error: any) {
    console.error("Error in send-login-credentials function:", error)
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