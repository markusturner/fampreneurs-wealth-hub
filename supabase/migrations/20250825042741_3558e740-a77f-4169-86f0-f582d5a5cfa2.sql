-- Final security fixes: address the last 2 function search_path issues
-- Use DROP and CREATE to avoid parameter default conflicts

-- 1. Fix notify_family_about_meeting (has default parameter)
DROP FUNCTION IF EXISTS public.notify_family_about_meeting(text, timestamp with time zone, text);
CREATE FUNCTION public.notify_family_about_meeting(meeting_title text, meeting_date timestamp with time zone, meeting_details text DEFAULT NULL::text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
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
$function$;

-- 2. Fix remove_user_role (has enum parameter)
CREATE OR REPLACE FUNCTION public.remove_user_role(target_user_id uuid, role_to_remove member_role, remover_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  -- Check if remover has permission
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = remover_user_id 
    AND (p.is_admin = true OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = remover_user_id 
      AND ur.role IN ('billing_manager', 'group_owner')
    ))
  ) THEN
    RAISE EXCEPTION 'Insufficient permissions to remove roles';
  END IF;

  -- Remove role
  DELETE FROM public.user_roles 
  WHERE user_id = target_user_id AND role = role_to_remove;
END;
$function$;