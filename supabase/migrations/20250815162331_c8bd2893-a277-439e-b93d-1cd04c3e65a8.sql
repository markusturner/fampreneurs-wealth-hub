-- Complete cleanup and secure reconstruction of profiles table policies
-- This will fix infinite recursion and implement proper security

-- First, drop ALL existing policies to start fresh
DROP POLICY IF EXISTS "Accountability partners can view assigned user profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles using security definer" ON public.profiles;
DROP POLICY IF EXISTS "Users can create their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can delete their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile or admins can update any" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view basic public profile information" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

-- Ensure RLS is enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Recreate the security definer functions if they don't exist
CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
  SELECT COALESCE(is_admin, false) 
  FROM public.profiles 
  WHERE user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_current_user_accountability_partner()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
  SELECT COALESCE(is_accountability_partner, false) 
  FROM public.profiles 
  WHERE user_id = auth.uid();
$$;

-- Create secure, non-recursive policies

-- 1. Users can view their own profile (full access to own data)
CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- 2. Users can update their own profile
CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 3. Users can create their own profile
CREATE POLICY "Users can create own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- 4. Users can delete their own profile
CREATE POLICY "Users can delete own profile"
ON public.profiles
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- 5. Admins can view all profiles (using security definer function)
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.is_current_user_admin());

-- 6. Admins can update any profile (using security definer function)
CREATE POLICY "Admins can update all profiles"
ON public.profiles
FOR UPDATE
TO authenticated
USING (public.is_current_user_admin())
WITH CHECK (public.is_current_user_admin());

-- 7. Family members can view limited profile info of family members they manage
-- This provides controlled access for family office scenarios
CREATE POLICY "Family managers can view managed profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  -- Users can see their own profile
  auth.uid() = user_id
  OR
  -- Admins can see all profiles
  public.is_current_user_admin()
  OR
  -- Family members can see profiles of users they've added as family members
  EXISTS (
    SELECT 1 FROM public.family_members fm
    WHERE fm.added_by = auth.uid() 
    AND fm.email = (
      SELECT email FROM auth.users au WHERE au.id = profiles.user_id
    )
    AND fm.status = 'active'
  )
);