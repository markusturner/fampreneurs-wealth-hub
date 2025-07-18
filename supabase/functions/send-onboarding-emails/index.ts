import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.51.0"
import { Resend } from "npm:resend@2.0.0"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface OnboardingEmailRequest {
  user_id: string
  email: string
  first_name?: string
  payment_amount?: number
  subscription_tier?: string
}

const resend = new Resend(Deno.env.get('RESEND_API_KEY'))

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { user_id, email, first_name, payment_amount, subscription_tier }: OnboardingEmailRequest = await req.json()

    console.log('Processing onboarding email for user:', user_id)

    // Define onboarding email sequence
    const emailSequence = [
      {
        type: 'welcome',
        subject: 'Welcome to Fampreneurs! Your Journey Begins Now',
        content: `
          <h1>Welcome to Fampreneurs, ${first_name || 'Entrepreneur'}!</h1>
          <p>Thank you for joining our community of family entrepreneurs. We're excited to help you build a successful business while prioritizing your family.</p>
          
          <h2>What's Next?</h2>
          <ul>
            <li>Complete your profile setup</li>
            <li>Explore our course library</li>
            <li>Join our community discussions</li>
            <li>Schedule your first coaching call</li>
          </ul>
          
          <p>Payment confirmed: $${payment_amount || 0} for ${subscription_tier || 'Premium'} membership</p>
          
          <p>Ready to get started? <a href="${Deno.env.get('SUPABASE_URL')?.replace('.supabase.co', '')}/dashboard">Access Your Dashboard</a></p>
          
          <p>Best regards,<br>The Fampreneurs Team</p>
        `,
        delay: 0 // Send immediately
      },
      {
        type: 'getting_started',
        subject: 'Getting Started: Your First Week Action Plan',
        content: `
          <h1>Your First Week Action Plan</h1>
          <p>Hi ${first_name || 'there'},</p>
          
          <p>Welcome to your first week as a Fampreneur! Here's your action plan:</p>
          
          <h2>Week 1 Checklist:</h2>
          <ol>
            <li>Watch the "Getting Started" course</li>
            <li>Complete your business assessment</li>
            <li>Join our Facebook community</li>
            <li>Book your welcome coaching call</li>
          </ol>
          
          <p>Need help? Reply to this email or reach out in our community.</p>
          
          <p>Cheering you on,<br>The Fampreneurs Team</p>
        `,
        delay: 24 // 24 hours
      },
      {
        type: 'resources',
        subject: 'Essential Resources for Family Entrepreneurs',
        content: `
          <h1>Essential Resources Just for You</h1>
          <p>Hi ${first_name || 'Entrepreneur'},</p>
          
          <p>Here are some essential resources to help you succeed:</p>
          
          <ul>
            <li>📚 Family Business Planning Template</li>
            <li>💰 Financial Tracking Spreadsheet</li>
            <li>⏰ Time Management Toolkit</li>
            <li>👥 Networking Guide for Parents</li>
          </ul>
          
          <p><a href="${Deno.env.get('SUPABASE_URL')?.replace('.supabase.co', '')}/documents">Download Your Resources</a></p>
          
          <p>Happy building!<br>The Fampreneurs Team</p>
        `,
        delay: 72 // 3 days
      }
    ]

    // Send immediate welcome email
    const welcomeEmail = emailSequence[0]
    
    const { data: emailData, error: emailError } = await resend.emails.send({
      from: 'Fampreneurs <onboarding@resend.dev>',
      to: [email],
      subject: welcomeEmail.subject,
      html: welcomeEmail.content,
    })

    if (emailError) {
      console.error('Error sending welcome email:', emailError)
      throw emailError
    }

    console.log('Welcome email sent successfully:', emailData)

    // Log the email in the database
    const { error: logError } = await supabase
      .from('onboarding_emails')
      .insert({
        user_id,
        email_type: welcomeEmail.type,
        email_subject: welcomeEmail.subject,
        email_content: welcomeEmail.content,
        email_status: 'sent'
      })

    if (logError) {
      console.error('Error logging email:', logError)
    }

    // Schedule follow-up emails (in a real implementation, you'd use a job queue)
    // For now, we'll just log them as scheduled
    for (let i = 1; i < emailSequence.length; i++) {
      const email = emailSequence[i]
      const scheduledDate = new Date(Date.now() + (email.delay * 60 * 60 * 1000))
      
      await supabase
        .from('onboarding_emails')
        .insert({
          user_id,
          email_type: email.type,
          email_subject: email.subject,
          email_content: email.content,
          email_status: 'scheduled',
          sent_at: scheduledDate.toISOString()
        })
    }

    // Record revenue metric
    if (payment_amount) {
      await supabase
        .from('revenue_metrics')
        .insert({
          user_id,
          transaction_type: 'new_subscription',
          amount: payment_amount,
          subscription_tier: subscription_tier || 'Premium'
        })
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Onboarding email sequence initiated',
        emails_scheduled: emailSequence.length
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Error in onboarding email function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})