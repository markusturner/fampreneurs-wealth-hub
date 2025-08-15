-- Fix coaches table security vulnerability
-- Currently the coaches table may be publicly readable, we need to restrict access

-- First, let's check if RLS is enabled on coaches table and enable it if not
ALTER TABLE public.coaches ENABLE ROW LEVEL SECURITY;

-- Drop any existing overly permissive policies
DROP POLICY IF EXISTS "Coaches are publicly viewable" ON public.coaches;
DROP POLICY IF EXISTS "Public can view coaches" ON public.coaches;
DROP POLICY IF EXISTS "Anyone can view coaches" ON public.coaches;

-- Create secure policies for coaches table
-- Only authenticated users can view coaches (for booking purposes)
CREATE POLICY "Authenticated users can view coaches"
ON public.coaches
FOR SELECT
TO authenticated
USING (true);

-- Only admins can manage coaches
CREATE POLICY "Admins can manage coaches"
ON public.coaches
FOR ALL
TO authenticated
USING (public.is_current_user_admin())
WITH CHECK (public.is_current_user_admin());

-- Coaches can view and update their own profiles
CREATE POLICY "Coaches can view their own profile"
ON public.coaches
FOR SELECT
TO authenticated
USING (auth.uid()::text = id OR public.is_current_user_admin());

CREATE POLICY "Coaches can update their own profile"
ON public.coaches
FOR UPDATE
TO authenticated
USING (auth.uid()::text = id OR public.is_current_user_admin())
WITH CHECK (auth.uid()::text = id OR public.is_current_user_admin());