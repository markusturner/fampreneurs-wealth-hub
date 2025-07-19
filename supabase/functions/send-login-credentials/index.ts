import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { Resend } from "npm:resend@2.0.0"

const resend = new Resend(Deno.env.get("RESEND_API_KEY"))

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

interface LoginCredentialsRequest {
  email: string
  firstName: string
  programName: string
  membershipType: string
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { email, firstName, programName, membershipType }: LoginCredentialsRequest = await req.json()

    const emailResponse = await resend.emails.send({
      from: "The Fampreneurs <noreply@thefampreneurs.com>",
      to: [email],
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
      `,
    })

    console.log("Login credentials email sent successfully:", emailResponse)

    return new Response(JSON.stringify(emailResponse), {
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