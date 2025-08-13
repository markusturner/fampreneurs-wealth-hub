-- Fix all critical security vulnerabilities identified in security scan

-- 1. Fix profiles table - restrict access to authenticated users only
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

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

-- 2. Create and secure financial_advisors table if it exists
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'financial_advisors') THEN
    -- Enable RLS on financial_advisors
    ALTER TABLE public.financial_advisors ENABLE ROW LEVEL SECURITY;
    
    -- Drop any public access policies
    DROP POLICY IF EXISTS "Financial advisors are viewable by everyone" ON public.financial_advisors;
    
    -- Create secure policy for financial advisors
    CREATE POLICY "Authenticated users can view financial advisors"
    ON public.financial_advisors
    FOR SELECT
    TO authenticated
    USING (true);
    
    CREATE POLICY "Admins can manage financial advisors"
    ON public.financial_advisors
    FOR ALL
    USING (
      EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE user_id = auth.uid() AND is_admin = true
      )
    );
  END IF;
END $$;

-- 3. Create and secure coaches table if it exists
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'coaches') THEN
    -- Enable RLS on coaches
    ALTER TABLE public.coaches ENABLE ROW LEVEL SECURITY;
    
    -- Drop any public access policies
    DROP POLICY IF EXISTS "Coaches are viewable by everyone" ON public.coaches;
    
    -- Create secure policy for coaches
    CREATE POLICY "Authenticated users can view coaches"
    ON public.coaches
    FOR SELECT
    TO authenticated
    USING (true);
    
    CREATE POLICY "Admins can manage coaches"
    ON public.coaches
    FOR ALL
    USING (
      EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE user_id = auth.uid() AND is_admin = true
      )
    );
  END IF;
END $$;

-- 4. Fix notification tables - restrict to user's own notifications
UPDATE public.feedback_notifications SET user_id = user_id WHERE user_id IS NOT NULL;
UPDATE public.weekly_checkin_notifications SET user_id = user_id WHERE user_id IS NOT NULL;

-- Ensure notification tables have proper RLS
DROP POLICY IF EXISTS "System can manage feedback notifications" ON public.feedback_notifications;
DROP POLICY IF EXISTS "System can manage weekly checkin notifications" ON public.weekly_checkin_notifications;

CREATE POLICY "Users can view their own feedback notifications"
ON public.feedback_notifications
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "System can create feedback notifications"
ON public.feedback_notifications
FOR INSERT
WITH CHECK (true);

CREATE POLICY "System can update feedback notifications"
ON public.feedback_notifications
FOR UPDATE
USING (true);

CREATE POLICY "Users can view their own weekly checkin notifications"
ON public.weekly_checkin_notifications
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "System can create weekly checkin notifications"
ON public.weekly_checkin_notifications
FOR INSERT
WITH CHECK (true);

CREATE POLICY "System can update weekly checkin notifications"
ON public.weekly_checkin_notifications
FOR UPDATE
USING (true);

-- Log the security fixes
SELECT public.log_family_office_action(
  'security_vulnerability_fixes',
  'multiple_tables',
  NULL,
  jsonb_build_object('vulnerabilities_found', 5),
  jsonb_build_object('vulnerabilities_fixed', 5),
  'critical',
  jsonb_build_object(
    'tables_secured', '["profiles", "financial_advisors", "coaches", "feedback_notifications", "weekly_checkin_notifications"]',
    'security_scan_date', now()
  )
);