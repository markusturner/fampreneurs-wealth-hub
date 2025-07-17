-- Fix Function Search Path Mutable warnings by explicitly setting search_path
-- This adds SET search_path = '' to all functions that need it

-- Update is_group_member function
CREATE OR REPLACE FUNCTION public.is_group_member(group_id uuid, user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.group_memberships
    WHERE group_memberships.group_id = $1 
    AND group_memberships.user_id = $2
  );
$$;

-- Update can_join_group function
CREATE OR REPLACE FUNCTION public.can_join_group(group_id uuid, user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.community_groups
    WHERE community_groups.id = $1 
    AND NOT community_groups.is_private
  ) OR EXISTS (
    SELECT 1 FROM public.group_memberships
    WHERE group_memberships.group_id = $1
    AND group_memberships.user_id = $2
    AND group_memberships.role IN ('admin', 'moderator')
  );
$$;

-- Update is_user_admin function
CREATE OR REPLACE FUNCTION public.is_user_admin(user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id = $1
    AND profiles.is_admin = true
  );
$$;

-- Update assign_admin_role function
CREATE OR REPLACE FUNCTION public.assign_admin_role(target_user_id uuid, assigner_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Check if assigner is admin or if this is the first admin (no admins exist)
  IF NOT public.is_user_admin(assigner_user_id) AND EXISTS (
    SELECT 1 FROM public.profiles WHERE is_admin = true
  ) THEN
    RAISE EXCEPTION 'Only admins can assign admin roles';
  END IF;

  -- Update profile to admin
  UPDATE public.profiles 
  SET is_admin = true,
      admin_permissions = ARRAY['manage_users', 'manage_groups', 'manage_settings']
  WHERE user_id = target_user_id;

  -- Insert role record
  INSERT INTO public.user_roles (user_id, role, assigned_by)
  VALUES (target_user_id, 'admin', assigner_user_id)
  ON CONFLICT (user_id, role) DO NOTHING;
END;
$$;

-- Update assign_accountability_role function
CREATE OR REPLACE FUNCTION public.assign_accountability_role(target_user_id uuid, assigner_user_id uuid, specialties text[] DEFAULT NULL::text[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Check if assigner is admin
  IF NOT public.is_user_admin(assigner_user_id) THEN
    RAISE EXCEPTION 'Only admins can assign accountability partner roles';
  END IF;

  -- Update profile
  UPDATE public.profiles 
  SET is_accountability_partner = true,
      accountability_specialties = COALESCE(specialties, ARRAY['general_support'])
  WHERE user_id = target_user_id;

  -- Insert role record
  INSERT INTO public.user_roles (user_id, role, assigned_by)
  VALUES (target_user_id, 'accountability_partner', assigner_user_id)
  ON CONFLICT (user_id, role) DO NOTHING;
END;
$$;

-- Update handle_first_admin function
CREATE OR REPLACE FUNCTION public.handle_first_admin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- If no admins exist, make this user an admin
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE is_admin = true) THEN
    NEW.is_admin = true;
    NEW.admin_permissions = ARRAY['manage_users', 'manage_groups', 'manage_settings'];
    
    -- Also insert into user_roles
    INSERT INTO public.user_roles (user_id, role, assigned_by)
    VALUES (NEW.user_id, 'admin', NEW.user_id);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Update notify_family_about_meeting function
CREATE OR REPLACE FUNCTION public.notify_family_about_meeting(meeting_title text, meeting_date timestamp with time zone, meeting_details text DEFAULT NULL::text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  member_record RECORD;
  notification_count INTEGER := 0;
  result JSON;
BEGIN
  -- Loop through all active family members
  FOR member_record IN 
    SELECT full_name, email, phone, family_position
    FROM public.family_members 
    WHERE status = 'active' AND email IS NOT NULL
  LOOP
    -- Here you would integrate with an email service
    -- For now, we'll just count the notifications
    notification_count := notification_count + 1;
  END LOOP;
  
  -- Return result
  result := json_build_object(
    'success', true,
    'notifications_sent', notification_count,
    'meeting_title', meeting_title,
    'meeting_date', meeting_date
  );
  
  RETURN result;
END;
$$;

-- Update user_has_premium_subscription function
CREATE OR REPLACE FUNCTION public.user_has_premium_subscription(user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.subscribers
    WHERE subscribers.user_id = $1 
    AND subscribers.subscribed = true
    AND (subscribers.subscription_end IS NULL OR subscribers.subscription_end > now())
  );
$$;

-- Update user_needs_feedback_notification function
CREATE OR REPLACE FUNCTION public.user_needs_feedback_notification(target_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE(
    (
      SELECT last_notification_sent < (now() - INTERVAL '2 weeks')
      FROM public.feedback_notifications 
      WHERE user_id = target_user_id
    ), 
    true -- If no record exists, user needs notification
  );
$$;

-- Update auto_enroll_group_courses function
CREATE OR REPLACE FUNCTION public.auto_enroll_group_courses()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
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

-- Update update_session_participant_count function
CREATE OR REPLACE FUNCTION public.update_session_participant_count()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.group_coaching_sessions 
    SET current_participants = current_participants + 1
    WHERE id = NEW.session_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.group_coaching_sessions 
    SET current_participants = GREATEST(current_participants - 1, 0)
    WHERE id = OLD.session_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- Update update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;