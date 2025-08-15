-- Final security fixes for remaining vulnerable tables

-- 1. Secure feedback_notifications table
ALTER TABLE public.feedback_notifications FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "System can manage feedback notifications for all users" ON public.feedback_notifications;
DROP POLICY IF EXISTS "Users can view their own feedback notifications" ON public.feedback_notifications;
DROP POLICY IF EXISTS "Users can view their own notification status" ON public.feedback_notifications;

-- Create secure feedback notification policies
CREATE POLICY "Users can view own feedback notifications"
ON public.feedback_notifications 
FOR SELECT 
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "System can manage feedback notifications"
ON public.feedback_notifications 
FOR ALL 
TO service_role;

-- 2. Secure weekly_checkin_notifications table
ALTER TABLE public.weekly_checkin_notifications FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "System can manage weekly checkin notifications for all users" ON public.weekly_checkin_notifications;
DROP POLICY IF EXISTS "Users can view their own weekly checkin notification status" ON public.weekly_checkin_notifications;
DROP POLICY IF EXISTS "Users can view their own weekly checkin notifications" ON public.weekly_checkin_notifications;

-- Create secure weekly checkin notification policies
CREATE POLICY "Users can view own weekly checkin notifications"
ON public.weekly_checkin_notifications 
FOR SELECT 
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "System can manage weekly checkin notifications"
ON public.weekly_checkin_notifications 
FOR ALL 
TO service_role;

-- 3. Secure user_roles table (most important - exposes admin/role info)
ALTER TABLE public.user_roles FORCE ROW LEVEL SECURITY;

-- Drop any existing overly permissive policies
DROP POLICY IF EXISTS "user_roles policy" ON public.user_roles;

-- Create secure user roles policies
CREATE POLICY "Users can view own roles"
ON public.user_roles 
FOR SELECT 
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admins can view all roles"
ON public.user_roles 
FOR SELECT 
TO authenticated
USING (public.is_current_user_admin());

CREATE POLICY "Admins can manage all roles"
ON public.user_roles 
FOR ALL 
TO authenticated
USING (public.is_current_user_admin())
WITH CHECK (public.is_current_user_admin());

-- 4. Remove any dangerous public grants on these tables
REVOKE ALL ON public.feedback_notifications FROM public;
REVOKE ALL ON public.weekly_checkin_notifications FROM public;
REVOKE ALL ON public.user_roles FROM public;

-- Grant only to authenticated users
GRANT SELECT ON public.feedback_notifications TO authenticated;
GRANT SELECT ON public.weekly_checkin_notifications TO authenticated;
GRANT SELECT ON public.user_roles TO authenticated;

-- 5. Final security audit log
INSERT INTO public.family_office_audit_logs (
  user_id,
  action,
  table_name,
  record_id,
  old_values,
  new_values,
  risk_level,
  metadata
) VALUES (
  auth.uid(),
  'final_security_fixes',
  'notification_and_role_tables',
  NULL,
  jsonb_build_object('status', 'publicly_exposed'),
  jsonb_build_object('status', 'secured', 'timestamp', now()),
  'high',
  jsonb_build_object(
    'description', 'Secured remaining vulnerable tables: feedback_notifications, weekly_checkin_notifications, user_roles',
    'tables_secured', ARRAY['feedback_notifications', 'weekly_checkin_notifications', 'user_roles'],
    'security_level', 'complete_database_lockdown'
  )
);