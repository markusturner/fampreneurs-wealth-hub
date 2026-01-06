-- Fix remaining overly permissive RLS policies

-- 4. Fix meetings - scribes update policy 
DROP POLICY IF EXISTS "Scribes can add notes to meetings" ON public.meetings;
CREATE POLICY "Users can update their meetings"
ON public.meetings
FOR UPDATE
TO authenticated
USING (auth.uid() = created_by OR public.is_current_user_admin())
WITH CHECK (auth.uid() = created_by OR public.is_current_user_admin());

-- 5. Fix notifications - scope to user
DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;
CREATE POLICY "Authenticated can create notifications"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id OR auth.uid() = sender_id OR public.is_current_user_admin());

-- 6. Fix onboarding_emails - admin only
DROP POLICY IF EXISTS "System can create onboarding emails" ON public.onboarding_emails;
CREATE POLICY "Admins can create onboarding emails"
ON public.onboarding_emails
FOR INSERT
TO authenticated
WITH CHECK (public.is_current_user_admin());

-- 7. Fix page_views - use visitor_id
DROP POLICY IF EXISTS "Anyone can insert page views" ON public.page_views;
CREATE POLICY "Anyone can insert page views"
ON public.page_views
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);