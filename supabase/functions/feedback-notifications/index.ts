import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.51.0";
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

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
    // Validate input
    const RequestSchema = z.object({
      sendToAllUsers: z.boolean().optional().default(false)
    });
    
    const body = await req.json().catch(() => ({}));
    const validation = RequestSchema.safeParse(body);
    
    if (!validation.success) {
      return new Response(
        JSON.stringify({ 
          error: 'Invalid input', 
          details: validation.error.flatten() 
        }), 
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    const { sendToAllUsers } = validation.data;
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Verify admin authorization
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }), 
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }), 
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    // Check if user has admin role
    const { data: isAdmin, error: roleError } = await supabase.rpc('has_role', {
      _user_id: user.id,
      _role: 'admin'
    });
    
    if (roleError || !isAdmin) {
      return new Response(
        JSON.stringify({ error: 'Insufficient permissions - admin required' }), 
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

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
      
      // If sendToAllUsers is true, send to everyone regardless of timing
      let needsNotification = sendToAllUsers;
      
      if (!sendToAllUsers) {
        // Check if user needs feedback notification using the database function
        const { data: checkResult, error: checkError } = await supabase
          .rpc('user_needs_feedback_notification', { target_user_id: profile.user_id });

        if (checkError) {
          console.error(`Error checking notification status for user ${profile.user_id}:`, checkError);
          continue;
        }
        
        needsNotification = checkResult;
      }

      if (needsNotification) {
        console.log(`User ${profile.user_id} ${sendToAllUsers ? '(admin-triggered)' : 'needs feedback notification'}`);
        
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

        // Create actual notification for the user
        const { error: userNotificationError } = await supabase
          .from('family_notifications')
          .insert({
            user_id: profile.user_id,
            notification_type: 'satisfaction_survey',
            title: 'Satisfaction Survey Reminder',
            message: 'Please complete your satisfaction survey to help us improve our coaching, curriculum, calls, and processes.',
            is_read: false
          });

        if (userNotificationError) {
          console.error(`Failed to create user notification for user ${profile.user_id}:`, userNotificationError);
          continue;
        }

        notificationsSent++;
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