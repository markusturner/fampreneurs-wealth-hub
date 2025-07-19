import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.51.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Starting weekly check-in notification process...');

    // Get all user profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('user_id, display_name, first_name, last_name')
      .not('user_id', 'is', null);

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      throw profilesError;
    }

    console.log(`Found ${profiles?.length || 0} profiles to notify`);

    let notificationsSent = 0;
    const usersProcessed = profiles?.length || 0;

    // Send notification to each user
    if (profiles) {
      for (const profile of profiles) {
        try {
          // Insert or update weekly check-in notification record
          const { error: notificationError } = await supabase
            .from('weekly_checkin_notifications')
            .upsert({
              user_id: profile.user_id,
              last_notification_sent: new Date().toISOString(),
              notification_count: 1
            }, {
              onConflict: 'user_id'
            });

          if (notificationError) {
            console.error(`Failed to create notification record for user ${profile.user_id}:`, notificationError);
            continue;
          }

          // Here you could integrate with an actual notification system
          // For now, we'll just log and count successful notifications
          console.log(`Weekly check-in notification sent to user ${profile.user_id}`);
          notificationsSent++;

        } catch (error) {
          console.error(`Error processing user ${profile.user_id}:`, error);
        }
      }
    }

    const result = {
      success: true,
      usersProcessed,
      notificationsSent,
      timestamp: new Date().toISOString()
    };

    console.log('Weekly check-in notification process completed:', result);

    return new Response(JSON.stringify(result), {
      headers: { 
        'Content-Type': 'application/json',
        ...corsHeaders 
      },
    });

  } catch (error) {
    console.error('Error in weekly check-in notifications function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      {
        status: 500,
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders 
        },
      }
    );
  }
});