-- Fix circular dependency issues with RLS policies by dropping dependent policies first

-- Drop all policies that depend on is_current_user_admin function
DROP POLICY IF EXISTS "Admins can view all coaches" ON public.coaches;
DROP POLICY IF EXISTS "Admins can view all financial accounts" ON public.connected_accounts;
DROP POLICY IF EXISTS "Admins can manage all financial accounts" ON public.connected_accounts;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view family members they manage" ON public.family_members;
DROP POLICY IF EXISTS "Admins can manage all family members" ON public.family_members;

-- Now drop the problematic function
DROP FUNCTION IF EXISTS public.is_current_user_admin();

-- Create cleaner family_members policies without circular dependency
CREATE POLICY "Users can view family members they added"
ON public.family_members FOR SELECT
TO authenticated
USING (added_by = auth.uid());

CREATE POLICY "Users can insert family members"
ON public.family_members FOR INSERT
TO authenticated
WITH CHECK (added_by = auth.uid());

CREATE POLICY "Users can update family members they added"
ON public.family_members FOR UPDATE
TO authenticated
USING (added_by = auth.uid())
WITH CHECK (added_by = auth.uid());

CREATE POLICY "Users can delete family members they added"
ON public.family_members FOR DELETE
TO authenticated
USING (added_by = auth.uid());

-- Create simple profiles policies without circular dependency
CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own profile"
ON public.profiles FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Recreate simple admin function that won't cause circular dependency
CREATE OR REPLACE FUNCTION public.is_user_admin(user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
  SELECT COALESCE(is_admin, false)
  FROM public.profiles 
  WHERE profiles.user_id = $1;
$$;

-- Family office members policies (clean them up too)
DROP POLICY IF EXISTS "Users can manage their own family office members" ON public.family_office_members;

CREATE POLICY "Users can view their family office members"
ON public.family_office_members FOR SELECT
TO authenticated
USING (added_by = auth.uid());

CREATE POLICY "Users can insert family office members"
ON public.family_office_members FOR INSERT
TO authenticated
WITH CHECK (added_by = auth.uid());

CREATE POLICY "Users can update their family office members"
ON public.family_office_members FOR UPDATE
TO authenticated
USING (added_by = auth.uid())
WITH CHECK (added_by = auth.uid());

CREATE POLICY "Users can delete their family office members"
ON public.family_office_members FOR DELETE
TO authenticated
USING (added_by = auth.uid());