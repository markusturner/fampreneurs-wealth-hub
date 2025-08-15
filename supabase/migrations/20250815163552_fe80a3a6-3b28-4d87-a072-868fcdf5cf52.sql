-- Fix remaining infinite recursion in profiles table
-- There seems to be a policy still causing recursion

-- Check for any remaining problematic policies and ensure we're using security definer functions properly
DROP POLICY IF EXISTS "Family managers can view managed profiles" ON public.profiles;

-- Recreate the family managers policy with better logic
CREATE POLICY "Family managers can view managed profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  -- Users can see their own profile
  auth.uid() = user_id
  OR
  -- Admins can see all profiles (using security definer function)
  public.is_current_user_admin()
  OR
  -- Family managers can see profiles of users they manage
  -- Using a more direct approach to avoid recursion
  EXISTS (
    SELECT 1 FROM public.family_members fm
    JOIN auth.users au ON au.email = fm.email
    WHERE fm.added_by = auth.uid() 
    AND au.id = profiles.user_id
    AND fm.status = 'active'
  )
);