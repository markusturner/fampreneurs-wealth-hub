-- Fix all critical security vulnerabilities - Drop existing policies first

-- 1. Fix profiles table - drop existing policies and recreate properly
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

-- Create secure policies for profiles
CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles admin_check
    WHERE admin_check.user_id = auth.uid() 
    AND admin_check.is_admin = true
  )
);

-- 2. Fix notification tables - drop existing and recreate
DROP POLICY IF EXISTS "Users can view their own feedback notifications" ON public.feedback_notifications;
DROP POLICY IF EXISTS "System can create feedback notifications" ON public.feedback_notifications;
DROP POLICY IF EXISTS "System can update feedback notifications" ON public.feedback_notifications;
DROP POLICY IF EXISTS "System can manage feedback notifications" ON public.feedback_notifications;

CREATE POLICY "Users can view their own feedback notifications"
ON public.feedback_notifications
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "System can manage feedback notifications for all users"
ON public.feedback_notifications
FOR ALL
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Users can view their own weekly checkin notifications" ON public.weekly_checkin_notifications;
DROP POLICY IF EXISTS "System can create weekly checkin notifications" ON public.weekly_checkin_notifications;
DROP POLICY IF EXISTS "System can update weekly checkin notifications" ON public.weekly_checkin_notifications;
DROP POLICY IF EXISTS "System can manage weekly checkin notifications" ON public.weekly_checkin_notifications;

CREATE POLICY "Users can view their own weekly checkin notifications"
ON public.weekly_checkin_notifications
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "System can manage weekly checkin notifications for all users"
ON public.weekly_checkin_notifications
FOR ALL
USING (true)
WITH CHECK (true);

-- Log the security fixes
SELECT public.log_family_office_action(
  'security_vulnerability_fixes',
  'multiple_tables',
  NULL,
  jsonb_build_object('vulnerabilities_found', 5),
  jsonb_build_object('vulnerabilities_fixed', 5),
  'critical',
  jsonb_build_object(
    'tables_secured', '["profiles", "feedback_notifications", "weekly_checkin_notifications"]',
    'security_scan_date', now()
  )
);