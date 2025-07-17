import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.51.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Profile {
  user_id: string;
  display_name: string | null;
  first_name: string | null;
  last_name: string | null;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('Starting feedback notification process...');

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all active profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('user_id, display_name, first_name, last_name')
      .order('created_at', { ascending: true });

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      throw profilesError;
    }

    console.log(`Found ${profiles?.length || 0} profiles to check`);

    let notificationsSent = 0;
    let usersProcessed = 0;

    for (const profile of profiles || []) {
      usersProcessed++;
      
      // Check if user needs feedback notification using the database function
      const { data: needsNotification, error: checkError } = await supabase
        .rpc('user_needs_feedback_notification', { target_user_id: profile.user_id });

      if (checkError) {
        console.error(`Error checking notification status for user ${profile.user_id}:`, checkError);
        continue;
      }

      if (needsNotification) {
        console.log(`User ${profile.user_id} needs feedback notification`);
        
        // Insert or update notification record
        const { error: upsertError } = await supabase
          .from('feedback_notifications')
          .upsert({
            user_id: profile.user_id,
            last_notification_sent: new Date().toISOString(),
            notification_count: 1
          }, {
            onConflict: 'user_id'
          });

        if (upsertError) {
          console.error(`Error updating notification record for user ${profile.user_id}:`, upsertError);
          continue;
        }

        notificationsSent++;
        
        // Here you could integrate with an email service or push notification service
        // For now, we're just tracking in the database
        console.log(`Feedback notification sent to ${profile.display_name || profile.first_name || 'User'}`);
      } else {
        console.log(`User ${profile.user_id} does not need notification yet`);
      }
    }

    const result = {
      success: true,
      usersProcessed,
      notificationsSent,
      timestamp: new Date().toISOString()
    };

    console.log('Feedback notification process completed:', result);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });

  } catch (error) {
    console.error('Error in feedback notification function:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'An error occurred',
        timestamp: new Date().toISOString()
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );
  }
});