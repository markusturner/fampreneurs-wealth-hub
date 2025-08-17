-- Drop existing potentially vulnerable policies and recreate secure ones for profiles table
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own full profile" ON public.profiles;
DROP POLICY IF EXISTS "Family managers can view managed profiles" ON public.profiles;

-- Create secure function to check if user can view a profile
CREATE OR REPLACE FUNCTION public.can_view_profile(target_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
  SELECT 
    -- User can view their own profile
    auth.uid() = target_user_id
    OR
    -- Admins can view all profiles
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() AND is_admin = true
    )
    OR
    -- Family managers can view profiles of family members they manage
    EXISTS (
      SELECT 1 FROM public.family_members fm
      JOIN public.profiles p ON p.email = fm.email
      WHERE fm.added_by = auth.uid() 
      AND fm.status = 'active'
      AND p.user_id = target_user_id
    );
$$;

-- Create comprehensive SELECT policy for profiles
CREATE POLICY "Secure profile access"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.can_view_profile(user_id));

-- Ensure all other operations remain secure
CREATE POLICY "Users can update own profile only"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile only"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own profile only"
ON public.profiles
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Ensure no anonymous access whatsoever
DROP POLICY IF EXISTS "Enable read access for all users" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;