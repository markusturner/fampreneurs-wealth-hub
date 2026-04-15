
-- Step 1: Add link column to notifications table
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS link TEXT;

-- Step 2: Update all trigger functions to populate link + add logging

CREATE OR REPLACE FUNCTION public.notify_community_post()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  poster_name TEXT;
  target_user RECORD;
  target_group_name TEXT;
  nav_link TEXT;
BEGIN
  SELECT display_name INTO poster_name FROM public.profiles WHERE user_id = NEW.user_id;

  nav_link := '/workspace-community' || CASE WHEN NEW.program IS NOT NULL THEN '?program=' || NEW.program ELSE '' END;

  target_group_name := CASE NEW.program
    WHEN 'fbu' THEN 'Family Business University'
    WHEN 'tfv' THEN 'The Family Vault'
    WHEN 'tfba' THEN 'The Family Business Accelerator'
    WHEN 'tffm' THEN 'The Family Fortune Mastermind'
    ELSE NULL
  END;

  IF target_group_name IS NOT NULL THEN
    FOR target_user IN 
      SELECT DISTINCT gm.user_id 
      FROM public.group_memberships gm
      JOIN public.community_groups cg ON gm.group_id = cg.id
      JOIN auth.users u ON u.id = gm.user_id
      WHERE cg.name = target_group_name
        AND gm.user_id != NEW.user_id
    LOOP
      INSERT INTO public.notifications (user_id, sender_id, notification_type, title, message, reference_id, link)
      VALUES (
        target_user.user_id,
        NEW.user_id,
        'community_post',
        'New Post in ' || target_group_name,
        COALESCE(poster_name, 'A member') || ' posted in ' || target_group_name,
        NEW.id,
        nav_link
      );
      RAISE LOG 'notification: type=community_post recipient=% ref=%', target_user.user_id, NEW.id;
    END LOOP;
  ELSE
    FOR target_user IN 
      SELECT p.user_id FROM public.profiles p
      JOIN auth.users u ON u.id = p.user_id
      WHERE p.user_id != NEW.user_id
    LOOP
      INSERT INTO public.notifications (user_id, sender_id, notification_type, title, message, reference_id, link)
      VALUES (
        target_user.user_id,
        NEW.user_id,
        'community_post',
        'New Community Post',
        COALESCE(poster_name, 'A member') || ' posted in the community',
        NEW.id,
        nav_link
      );
      RAISE LOG 'notification: type=community_post recipient=% ref=%', target_user.user_id, NEW.id;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.notify_direct_message()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  sender_name TEXT;
BEGIN
  SELECT display_name INTO sender_name FROM public.profiles WHERE user_id = NEW.sender_id;
  
  INSERT INTO public.notifications (user_id, sender_id, notification_type, title, message, reference_id, link)
  VALUES (
    NEW.receiver_id,
    NEW.sender_id,
    'message',
    'New Message',
    COALESCE(sender_name, 'Someone') || ' sent you a message',
    NEW.id,
    '/messenger'
  );
  RAISE LOG 'notification: type=message recipient=% ref=%', NEW.receiver_id, NEW.id;
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.notify_group_message()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  sender_name TEXT;
  target_user RECORD;
BEGIN
  SELECT display_name INTO sender_name FROM public.profiles WHERE user_id = NEW.user_id;
  
  FOR target_user IN 
    SELECT gm.user_id FROM public.group_memberships gm 
    WHERE gm.group_id = NEW.group_id AND gm.user_id != NEW.user_id
  LOOP
    INSERT INTO public.notifications (user_id, sender_id, notification_type, title, message, reference_id, link)
    VALUES (
      target_user.user_id,
      NEW.user_id,
      'group_message',
      'New Group Message',
      COALESCE(sender_name, 'A member') || ' sent a message in the group',
      NEW.id,
      '/community'
    );
    RAISE LOG 'notification: type=group_message recipient=% ref=%', target_user.user_id, NEW.id;
  END LOOP;
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.notify_meeting_created()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  creator_name TEXT;
  target_user RECORD;
BEGIN
  SELECT display_name INTO creator_name FROM public.profiles WHERE user_id = NEW.created_by;
  
  FOR target_user IN 
    SELECT user_id FROM public.profiles WHERE user_id != NEW.created_by
  LOOP
    INSERT INTO public.notifications (user_id, sender_id, notification_type, title, message, reference_id, link)
    VALUES (
      target_user.user_id,
      NEW.created_by,
      'meeting_scheduled',
      'New Event: ' || NEW.title,
      COALESCE(creator_name, 'Someone') || ' created a new event',
      NEW.id,
      '/workspace-calendar'
    );
    RAISE LOG 'notification: type=meeting_scheduled recipient=% ref=%', target_user.user_id, NEW.id;
  END LOOP;
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.notify_course_created()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  creator_name TEXT;
  target_user RECORD;
BEGIN
  SELECT display_name INTO creator_name FROM public.profiles WHERE user_id = NEW.created_by;
  
  FOR target_user IN 
    SELECT user_id FROM public.profiles WHERE user_id != NEW.created_by
  LOOP
    INSERT INTO public.notifications (user_id, sender_id, notification_type, title, message, reference_id, link)
    VALUES (
      target_user.user_id,
      NEW.created_by,
      'course_created',
      'New Course: ' || NEW.title,
      COALESCE(creator_name, 'An admin') || ' added a new course',
      NEW.id,
      '/classroom'
    );
    RAISE LOG 'notification: type=course_created recipient=% ref=%', target_user.user_id, NEW.id;
  END LOOP;
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.notify_new_member()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  target_user RECORD;
BEGIN
  FOR target_user IN 
    SELECT user_id FROM public.profiles WHERE user_id != NEW.user_id
  LOOP
    INSERT INTO public.notifications (user_id, sender_id, notification_type, title, message, reference_id, link)
    VALUES (
      target_user.user_id,
      NEW.user_id,
      'new_member',
      'New Member Joined',
      COALESCE(NEW.display_name, 'A new member') || ' has joined the community',
      NULL,
      '/workspace-members'
    );
    RAISE LOG 'notification: type=new_member recipient=% sender=%', target_user.user_id, NEW.user_id;
  END LOOP;
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.notify_trust_created()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  creator_name TEXT;
  target_user RECORD;
BEGIN
  SELECT display_name INTO creator_name FROM public.profiles WHERE user_id = NEW.user_id;
  
  INSERT INTO public.community_posts (content, user_id, program, category)
  VALUES 
    ('🏛️ ' || COALESCE(creator_name, 'A member') || ' just created a new trust: ' || COALESCE(NEW.trust_name, 'Untitled Trust') || '! Congratulations! 🎉', NEW.user_id, 'tfv', 'wins'),
    ('🏛️ ' || COALESCE(creator_name, 'A member') || ' just created a new trust: ' || COALESCE(NEW.trust_name, 'Untitled Trust') || '! Congratulations! 🎉', NEW.user_id, 'tfba', 'wins');
  
  FOR target_user IN 
    SELECT user_id FROM public.profiles WHERE user_id != NEW.user_id
  LOOP
    INSERT INTO public.notifications (user_id, sender_id, notification_type, title, message, reference_id, link)
    VALUES (
      target_user.user_id,
      NEW.user_id,
      'trust_created',
      'New Trust Created',
      COALESCE(creator_name, 'A member') || ' created a new trust',
      NEW.id,
      '/workspace-community?program=tfv'
    );
    RAISE LOG 'notification: type=trust_created recipient=% ref=%', target_user.user_id, NEW.id;
  END LOOP;
  
  RETURN NEW;
END;
$function$;

-- Step 3: Update push notification trigger to include link
CREATE OR REPLACE FUNCTION public.trigger_push_notification()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  BEGIN
    PERFORM net.http_post(
      url := 'https://tbofkvyezmpovoezjyyl.supabase.co/functions/v1/send-push-notification',
      body := jsonb_build_object(
        'user_id', NEW.user_id,
        'title', NEW.title,
        'message', NEW.message,
        'notification_type', NEW.notification_type,
        'reference_id', NEW.reference_id,
        'link', NEW.link
      ),
      params := '{}'::jsonb,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRib2Zrdnllem1wb3ZvZXpqeXlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2OTc0NTYsImV4cCI6MjA2ODI3MzQ1Nn0.vsJykXf_N7myBg4iKUJevbXl8FBne4rbv-ruJuuz288'
      ),
      timeout_milliseconds := 5000
    );
    RAISE LOG 'push_dispatch: user=% type=% ref=%', NEW.user_id, NEW.notification_type, NEW.reference_id;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Push notification dispatch skipped: %', SQLERRM;
  END;

  RETURN NEW;
END;
$function$;
