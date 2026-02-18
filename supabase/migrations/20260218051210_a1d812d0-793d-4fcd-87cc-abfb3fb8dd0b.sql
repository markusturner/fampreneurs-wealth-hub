-- Fix admin RLS policy for onboarding_responses (profiles.id should be profiles.user_id)
DROP POLICY IF EXISTS "Admins can view all onboarding" ON public.onboarding_responses;

CREATE POLICY "Admins and owners can view all onboarding"
ON public.onboarding_responses
FOR SELECT
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.is_admin = true
  )
  OR public.is_current_user_owner()
);

-- Drop the now-redundant user policy since the new one covers it
DROP POLICY IF EXISTS "Users can view own onboarding" ON public.onboarding_responses;