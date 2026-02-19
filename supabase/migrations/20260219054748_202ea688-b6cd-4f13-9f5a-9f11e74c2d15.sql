
-- Create notification triggers for various events

-- 1. Trigger for community posts → notify all users
CREATE OR REPLACE FUNCTION public.notify_community_post()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  poster_name TEXT;
  target_user RECORD;
BEGIN
  SELECT display_name INTO poster_name FROM public.profiles WHERE user_id = NEW.user_id;
  
  FOR target_user IN 
    SELECT user_id FROM public.profiles WHERE user_id != NEW.user_id
  LOOP
    INSERT INTO public.notifications (user_id, sender_id, notification_type, title, message, reference_id)
    VALUES (
      target_user.user_id,
      NEW.user_id,
      'community_post',
      'New Community Post',
      COALESCE(poster_name, 'A member') || ' posted in the community',
      NEW.id
    );
  END LOOP;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_community_post_created
AFTER INSERT ON public.community_posts
FOR EACH ROW
EXECUTE FUNCTION public.notify_community_post();

-- 2. Trigger for direct messages → notify recipient
CREATE OR REPLACE FUNCTION public.notify_direct_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  sender_name TEXT;
BEGIN
  SELECT display_name INTO sender_name FROM public.profiles WHERE user_id = NEW.sender_id;
  
  INSERT INTO public.notifications (user_id, sender_id, notification_type, title, message, reference_id)
  VALUES (
    NEW.receiver_id,
    NEW.sender_id,
    'message',
    'New Message',
    COALESCE(sender_name, 'Someone') || ' sent you a message',
    NEW.id
  );
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_direct_message_created
AFTER INSERT ON public.direct_messages
FOR EACH ROW
EXECUTE FUNCTION public.notify_direct_message();

-- 3. Trigger for calendar events (meetings) → notify all users
CREATE OR REPLACE FUNCTION public.notify_meeting_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  creator_name TEXT;
  target_user RECORD;
BEGIN
  SELECT display_name INTO creator_name FROM public.profiles WHERE user_id = NEW.created_by;
  
  FOR target_user IN 
    SELECT user_id FROM public.profiles WHERE user_id != NEW.created_by
  LOOP
    INSERT INTO public.notifications (user_id, sender_id, notification_type, title, message, reference_id)
    VALUES (
      target_user.user_id,
      NEW.created_by,
      'meeting_scheduled',
      'New Event: ' || NEW.title,
      COALESCE(creator_name, 'Someone') || ' created a new event',
      NEW.id
    );
  END LOOP;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_meeting_created
AFTER INSERT ON public.meetings
FOR EACH ROW
EXECUTE FUNCTION public.notify_meeting_created();

-- 4. Trigger for new courses → notify all users
CREATE OR REPLACE FUNCTION public.notify_course_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  creator_name TEXT;
  target_user RECORD;
BEGIN
  SELECT display_name INTO creator_name FROM public.profiles WHERE user_id = NEW.created_by;
  
  FOR target_user IN 
    SELECT user_id FROM public.profiles WHERE user_id != NEW.created_by
  LOOP
    INSERT INTO public.notifications (user_id, sender_id, notification_type, title, message, reference_id)
    VALUES (
      target_user.user_id,
      NEW.created_by,
      'course_created',
      'New Course: ' || NEW.title,
      COALESCE(creator_name, 'An admin') || ' added a new course',
      NEW.id
    );
  END LOOP;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_course_created
AFTER INSERT ON public.courses
FOR EACH ROW
EXECUTE FUNCTION public.notify_course_created();

-- 5. Trigger for new members (profiles) → notify all existing users
CREATE OR REPLACE FUNCTION public.notify_new_member()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  target_user RECORD;
BEGIN
  FOR target_user IN 
    SELECT user_id FROM public.profiles WHERE user_id != NEW.user_id
  LOOP
    INSERT INTO public.notifications (user_id, sender_id, notification_type, title, message, reference_id)
    VALUES (
      target_user.user_id,
      NEW.user_id,
      'new_member',
      'New Member Joined',
      COALESCE(NEW.display_name, 'A new member') || ' has joined the community',
      NULL
    );
  END LOOP;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_new_member_joined
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.notify_new_member();

-- 6. Trigger for trust creation → auto-post in TFV & TFBA communities and notify
CREATE OR REPLACE FUNCTION public.notify_trust_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  creator_name TEXT;
  target_user RECORD;
BEGIN
  SELECT display_name INTO creator_name FROM public.profiles WHERE user_id = NEW.user_id;
  
  -- Create community posts in TFV and TFBA
  INSERT INTO public.community_posts (content, user_id, program, category)
  VALUES 
    ('🏛️ ' || COALESCE(creator_name, 'A member') || ' just created a new trust: ' || COALESCE(NEW.trust_name, 'Untitled Trust') || '! Congratulations! 🎉', NEW.user_id, 'tfv', 'wins'),
    ('🏛️ ' || COALESCE(creator_name, 'A member') || ' just created a new trust: ' || COALESCE(NEW.trust_name, 'Untitled Trust') || '! Congratulations! 🎉', NEW.user_id, 'tfba', 'wins');
  
  -- Notify all users
  FOR target_user IN 
    SELECT user_id FROM public.profiles WHERE user_id != NEW.user_id
  LOOP
    INSERT INTO public.notifications (user_id, sender_id, notification_type, title, message, reference_id)
    VALUES (
      target_user.user_id,
      NEW.user_id,
      'trust_created',
      'New Trust Created',
      COALESCE(creator_name, 'A member') || ' created a new trust',
      NEW.id
    );
  END LOOP;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_trust_created
AFTER INSERT ON public.trust_submissions
FOR EACH ROW
EXECUTE FUNCTION public.notify_trust_created();

-- 7. Trigger for group messages → notify group members  
CREATE OR REPLACE FUNCTION public.notify_group_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  sender_name TEXT;
  target_user RECORD;
BEGIN
  SELECT display_name INTO sender_name FROM public.profiles WHERE user_id = NEW.user_id;
  
  FOR target_user IN 
    SELECT gm.user_id FROM public.group_memberships gm 
    WHERE gm.group_id = NEW.group_id AND gm.user_id != NEW.user_id
  LOOP
    INSERT INTO public.notifications (user_id, sender_id, notification_type, title, message, reference_id)
    VALUES (
      target_user.user_id,
      NEW.user_id,
      'group_message',
      'New Group Message',
      COALESCE(sender_name, 'A member') || ' sent a message in the group',
      NEW.id
    );
  END LOOP;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_group_message_created
AFTER INSERT ON public.group_messages
FOR EACH ROW
EXECUTE FUNCTION public.notify_group_message();
