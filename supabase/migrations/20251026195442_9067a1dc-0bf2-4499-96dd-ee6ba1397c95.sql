-- Ensure admins can update all profile fields including membership_type
-- Drop existing restrictive policies if they exist
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;

-- Create comprehensive admin update policy
CREATE POLICY "Admins can update all profiles"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid()
    AND is_admin = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles  
    WHERE user_id = auth.uid()
    AND is_admin = true
  )
);