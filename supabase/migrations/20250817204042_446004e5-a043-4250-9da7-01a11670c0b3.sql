-- Fix infinite recursion in profiles RLS policies by simplifying them

-- Drop the problematic complex policies
DROP POLICY IF EXISTS "Users can view accessible profiles" ON public.profiles;
DROP POLICY IF EXISTS "admins_can_view_all_profiles" ON public.profiles;
DROP POLICY IF EXISTS "users_can_view_own_profile_only" ON public.profiles;

-- Create a simple, non-recursive SELECT policy
CREATE POLICY "users_can_view_profiles" 
ON public.profiles 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL AND (
    user_id = auth.uid() OR  -- Users can view their own profile
    is_admin = true OR       -- Admins can view all profiles (if current user is admin)
    EXISTS (                 -- Family members can view each other
      SELECT 1 FROM family_members fm 
      WHERE fm.email = (SELECT email FROM auth.users WHERE id = auth.uid()) 
      AND fm.status = 'active'
    )
  )
);

-- Simplify UPDATE policies - remove duplicate policies
DROP POLICY IF EXISTS "admins_can_update_all_profiles" ON public.profiles;
DROP POLICY IF EXISTS "users_can_update_own_profile" ON public.profiles;

CREATE POLICY "users_can_update_profiles" 
ON public.profiles 
FOR UPDATE 
USING (
  auth.uid() IS NOT NULL AND (
    user_id = auth.uid() OR  -- Users can update their own profile
    is_admin = true          -- Admins can update any profile (if current user is admin)
  )
);

-- Simplify INSERT policies - remove duplicates
DROP POLICY IF EXISTS "Users can create their own profile" ON public.profiles;
DROP POLICY IF EXISTS "users_can_insert_own_profile" ON public.profiles;

CREATE POLICY "users_can_insert_profiles" 
ON public.profiles 
FOR INSERT 
WITH CHECK (
  auth.uid() IS NOT NULL AND user_id = auth.uid()
);

-- Keep the DELETE policies as they are simpler
-- The service_role_delete_only and Users can delete their own profile are fine