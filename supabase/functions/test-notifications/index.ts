import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.51.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Authenticate the calling user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid authentication' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const userId = user.id;
    console.log(`[TEST-NOTIF] Starting notification test for user: ${userId}`);

    const notifications = [
      {
        notification_type: 'message',
        title: '💬 New Direct Message',
        message: 'Test: You received a new direct message from a community member.',
        link: '/messenger',
        delay: 0,
      },
      {
        notification_type: 'community_post',
        title: '📢 New Community Post',
        message: 'Test: Someone posted in Family Business University.',
        link: '/community',
        delay: 12,
      },
      {
        notification_type: 'group_message',
        title: '👥 New Group Message',
        message: 'Test: A new message was posted in The Family Vault group.',
        link: '/community',
        delay: 24,
      },
      {
        notification_type: 'meeting_scheduled',
        title: '📅 Meeting Scheduled',
        message: 'Test: A new family meeting has been scheduled for next week.',
        link: '/calendar',
        delay: 36,
      },
      {
        notification_type: 'tutorial_reminder',
        title: '🎓 Watch Your Tutorial',
        message: 'Test: Complete your tutorial video to get the most out of TruHeirs.',
        link: '/tutorial-videos',
        delay: 48,
      },
    ];

    const results: any[] = [];

    for (const notif of notifications) {
      if (notif.delay > 0) {
        console.log(`[TEST-NOTIF] Waiting ${notif.delay}s before sending: ${notif.notification_type}`);
        await new Promise(resolve => setTimeout(resolve, notif.delay * 1000));
      }

      console.log(`[TEST-NOTIF] Inserting notification: type=${notif.notification_type} user=${userId}`);

      const { data, error } = await supabase
        .from('notifications')
        .insert({
          user_id: userId,
          sender_id: userId,
          notification_type: notif.notification_type,
          title: notif.title,
          message: notif.message,
          is_read: false,
          link: notif.link,
        })
        .select()
        .single();

      if (error) {
        console.error(`[TEST-NOTIF] ERROR inserting ${notif.notification_type}:`, error);
        results.push({ type: notif.notification_type, success: false, error: error.message });
      } else {
        console.log(`[TEST-NOTIF] SUCCESS: ${notif.notification_type} id=${data.id}`);
        results.push({ type: notif.notification_type, success: true, id: data.id });
      }
    }

    console.log(`[TEST-NOTIF] All done. Results:`, JSON.stringify(results));

    return new Response(JSON.stringify({ success: true, user_id: userId, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[TEST-NOTIF] Fatal error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
