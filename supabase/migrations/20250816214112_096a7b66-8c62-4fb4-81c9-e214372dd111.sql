-- Fix circular dependency issues with RLS policies

-- Drop problematic admin function that causes circular dependency
DROP FUNCTION IF EXISTS public.is_current_user_admin();

-- Create a simpler admin check that doesn't cause circular dependency
CREATE OR REPLACE FUNCTION public.is_user_admin(user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = $1 
    AND profiles.is_admin = true
  );
$$;

-- Drop and recreate RLS policies for profiles table to fix circular dependency
DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Family managers can view managed profiles" ON public.profiles;

-- Create simpler profiles policies without circular dependency
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

-- Fix family_members policies to remove admin function dependency
DROP POLICY IF EXISTS "Admins can manage all family members" ON public.family_members;

-- Create cleaner family_members policies
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

-- Family office members policies are already correct, but let's make sure they're clean
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