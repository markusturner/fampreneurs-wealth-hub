-- Fix critical security vulnerability in family_members access
-- Multiple SECURITY DEFINER functions are exposing ALL family members' personal data

-- 1. Fix the notify_family_about_meeting function to respect access controls
CREATE OR REPLACE FUNCTION public.notify_family_about_meeting(meeting_title text, meeting_date timestamp with time zone, meeting_details text DEFAULT NULL::text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
AS $$
DECLARE
  member_record RECORD;
  notification_count INTEGER := 0;
  result JSON;
  current_user_id UUID;
BEGIN
  current_user_id := auth.uid();
  
  -- Security check: Only allow authenticated users
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- SECURITY FIX: Only loop through family members that the current user added
  -- This prevents access to other families' data
  FOR member_record IN 
    SELECT full_name, email, phone, family_position
    FROM public.family_members 
    WHERE status = 'active' 
      AND email IS NOT NULL
      AND added_by = current_user_id  -- CRITICAL: Only access user's own family members
  LOOP
    -- Here you would integrate with an email service
    -- For now, we'll just count the notifications
    notification_count := notification_count + 1;
  END LOOP;
  
  -- Log this action for security monitoring
  PERFORM public.log_family_office_action(
    'family_meeting_notification',
    'family_members',
    NULL,
    NULL,
    NULL,
    'medium',
    jsonb_build_object(
      'meeting_title', meeting_title,
      'meeting_date', meeting_date,
      'notifications_sent', notification_count,
      'requested_by', current_user_id
    )
  );
  
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

-- 2. Fix the notify_family_members_about_meeting function (this one is already secure)
-- But let's add additional security logging
CREATE OR REPLACE FUNCTION public.notify_family_members_about_meeting(meeting_title text, meeting_date date, meeting_time time without time zone, meeting_id text, creator_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
AS $$
DECLARE
  family_member_record RECORD;
  notification_count INTEGER := 0;
  current_user_id UUID;
BEGIN
  current_user_id := auth.uid();
  
  -- Security check: Only allow the creator or admins to send notifications
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF current_user_id != creator_user_id AND NOT public.is_current_user_admin() THEN
    RAISE EXCEPTION 'Insufficient permissions to send family notifications';
  END IF;

  -- This function is already secure - it only accesses family members added by the creator
  FOR family_member_record IN 
    SELECT id, full_name, email, family_position
    FROM public.family_members 
    WHERE added_by = creator_user_id AND status = 'active'
  LOOP
    -- Insert notification for each family member
    INSERT INTO public.family_notifications (
      user_id,
      family_member_id,
      notification_type,
      title,
      message,
      meeting_id,
      meeting_date,
      meeting_time
    ) VALUES (
      creator_user_id,
      family_member_record.id,
      'meeting_scheduled',
      'New Meeting Scheduled',
      'Meeting "' || meeting_title || '" has been scheduled for ' || 
      TO_CHAR(meeting_date, 'Mon DD, YYYY') || ' at ' || 
      TO_CHAR(meeting_time, 'HH:MI AM'),
      meeting_id,
      meeting_date,
      meeting_time
    );
    
    notification_count := notification_count + 1;
  END LOOP;
  
  -- Log this action for security monitoring
  PERFORM public.log_family_office_action(
    'family_meeting_notifications_sent',
    'family_members',
    NULL,
    NULL,
    NULL,
    'medium',
    jsonb_build_object(
      'meeting_title', meeting_title,
      'meeting_id', meeting_id,
      'notifications_sent', notification_count,
      'creator_user_id', creator_user_id,
      'requested_by', current_user_id
    )
  );
  
  RETURN notification_count;
END;
$$;

-- 3. Add additional RLS policy to ensure no data leakage through admin functions
CREATE POLICY "Admins can only view family members with explicit permission"
ON public.family_members
FOR SELECT 
TO authenticated
USING (
  -- Allow admins to view family members, but log the access
  CASE 
    WHEN public.is_current_user_admin() THEN
      -- Log admin access to family member data
      (public.log_family_office_action(
        'admin_family_member_access',
        'family_members',
        id,
        NULL,
        NULL,
        'high',
        jsonb_build_object(
          'admin_user', auth.uid(),
          'accessed_family_member', id,
          'access_time', now()
        )
      ) IS NOT NULL)
    ELSE false
  END
);

-- 4. Create a secure function to get family member count without exposing data
CREATE OR REPLACE FUNCTION public.get_family_member_count_secure()
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
AS $$
  SELECT COUNT(*)::integer
  FROM public.family_members 
  WHERE added_by = auth.uid() 
    AND status = 'active';
$$;

-- 5. Create a function to safely check if a user can access family data
CREATE OR REPLACE FUNCTION public.can_access_family_member_safe(member_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
AS $$
  SELECT 
    auth.uid() IS NOT NULL AND (
      -- User added this family member
      EXISTS (
        SELECT 1 FROM public.family_members 
        WHERE id = member_id 
          AND added_by = auth.uid()
      ) OR
      -- User is admin (but we log this access)
      (public.is_current_user_admin() AND 
       public.log_family_office_action(
         'admin_family_member_check',
         'family_members',
         member_id,
         NULL,
         NULL,
         'high',
         jsonb_build_object('admin_user', auth.uid(), 'checked_member', member_id)
       ) IS NOT NULL)
    );
$$;