-- Fix the remaining function search path security issues

-- Fix all remaining functions that are missing SECURITY DEFINER and search_path

-- Update create_family_message_notification function
CREATE OR REPLACE FUNCTION public.create_family_message_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  sender_profile RECORD;
  family_member_record RECORD;
BEGIN
  -- Get sender profile info
  SELECT display_name, first_name, last_name 
  INTO sender_profile
  FROM public.profiles 
  WHERE user_id = NEW.sender_id;
  
  -- Find who should receive this notification (family head/admin)
  -- This would be the person who added the family members
  FOR family_member_record IN 
    SELECT added_by FROM public.family_members 
    WHERE email = (SELECT email FROM auth.users WHERE id = NEW.sender_id)
  LOOP
    -- Create notification for family head
    INSERT INTO public.notifications (
      user_id,
      sender_id,
      notification_type,
      title,
      message,
      reference_id
    ) VALUES (
      family_member_record.added_by,
      NEW.sender_id,
      'family_message',
      'New Family Message',
      COALESCE(
        sender_profile.display_name,
        CONCAT(sender_profile.first_name, ' ', sender_profile.last_name),
        'A family member'
      ) || ' sent you a message',
      NEW.id
    );
  END LOOP;
  
  RETURN NEW;
END;
$$;

-- Update create_message_notification function  
CREATE OR REPLACE FUNCTION public.create_message_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  sender_profile RECORD;
BEGIN
  -- Get sender profile info
  SELECT display_name, first_name, last_name 
  INTO sender_profile
  FROM public.profiles 
  WHERE user_id = NEW.sender_id;
  
  -- Create notification for recipient
  INSERT INTO public.notifications (
    user_id,
    sender_id,
    notification_type,
    title,
    message,
    reference_id
  ) VALUES (
    NEW.recipient_id,
    NEW.sender_id,
    'message',
    'New Message',
    COALESCE(
      sender_profile.display_name,
      CONCAT(sender_profile.first_name, ' ', sender_profile.last_name),
      'Someone'
    ) || ' sent you a message',
    NEW.id
  );
  
  RETURN NEW;
END;
$$;

-- Update create_post_notification function
CREATE OR REPLACE FUNCTION public.create_post_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  sender_profile RECORD;
  member_record RECORD;
BEGIN
  -- Get sender profile info
  SELECT display_name, first_name, last_name 
  INTO sender_profile
  FROM public.profiles 
  WHERE user_id = NEW.user_id;
  
  -- Create notifications for all users except the poster
  FOR member_record IN 
    SELECT DISTINCT user_id 
    FROM public.profiles 
    WHERE user_id != NEW.user_id
  LOOP
    INSERT INTO public.notifications (
      user_id,
      sender_id,
      notification_type,
      title,
      message,
      reference_id
    ) VALUES (
      member_record.user_id,
      NEW.user_id,
      'post',
      'New Community Post',
      COALESCE(
        sender_profile.display_name,
        CONCAT(sender_profile.first_name, ' ', sender_profile.last_name),
        'Someone'
      ) || ' shared a new post in the community',
      NEW.id
    );
  END LOOP;
  
  RETURN NEW;
END;
$$;

-- Update create_group_message_notification function
CREATE OR REPLACE FUNCTION public.create_group_message_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  sender_profile RECORD;
  member_record RECORD;
  group_info RECORD;
BEGIN
  -- Get sender profile and group info
  SELECT display_name, first_name, last_name 
  INTO sender_profile
  FROM public.profiles 
  WHERE user_id = NEW.user_id;
  
  SELECT name INTO group_info
  FROM public.community_groups 
  WHERE id = NEW.group_id;
  
  -- Create notifications for all group members except sender
  FOR member_record IN 
    SELECT user_id FROM public.group_memberships 
    WHERE group_id = NEW.group_id AND user_id != NEW.user_id
  LOOP
    INSERT INTO public.notifications (
      user_id,
      sender_id,
      notification_type,
      title,
      message,
      reference_id
    ) VALUES (
      member_record.user_id,
      NEW.user_id,
      'group_message',
      'New Group Message',
      COALESCE(
        sender_profile.display_name,
        CONCAT(sender_profile.first_name, ' ', sender_profile.last_name),
        'Someone'
      ) || ' posted in ' || COALESCE(group_info.name, 'a group'),
      NEW.id
    );
  END LOOP;
  
  RETURN NEW;
END;
$$;

-- Update auto_enroll_group_courses function
CREATE OR REPLACE FUNCTION public.auto_enroll_group_courses()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
  -- When a user joins a group, automatically enroll them in all group courses
  INSERT INTO public.course_enrollments (user_id, course_id)
  SELECT NEW.user_id, gc.course_id
  FROM public.group_courses gc
  WHERE gc.group_id = NEW.group_id
  AND NOT EXISTS (
    SELECT 1 FROM public.course_enrollments ce
    WHERE ce.user_id = NEW.user_id AND ce.course_id = gc.course_id
  );
  
  RETURN NEW;
END;
$$;