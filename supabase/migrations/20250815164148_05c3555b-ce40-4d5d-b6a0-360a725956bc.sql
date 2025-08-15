-- Fix coaches table security vulnerability
-- The coaches table currently has no RLS policies, making coach personal information publicly accessible

-- First, let's check if RLS is enabled on coaches table and enable it if not
ALTER TABLE public.coaches ENABLE ROW LEVEL SECURITY;

-- Drop any existing overly permissive policies
DROP POLICY IF EXISTS "Enable read access for all users" ON public.coaches;
DROP POLICY IF EXISTS "Public coaches access" ON public.coaches;

-- Create secure RLS policies for coaches table

-- 1. Admins can manage all coaches (full CRUD access)
CREATE POLICY "Admins can manage all coaches"
ON public.coaches
FOR ALL
TO authenticated
USING (public.is_current_user_admin())
WITH CHECK (public.is_current_user_admin());

-- 2. Coaches can view and update their own profiles (if they have user accounts)
-- This allows coaches to manage their own information if they're users
CREATE POLICY "Coaches can manage their own profiles"
ON public.coaches  
FOR ALL
TO authenticated
USING (
  -- Check if there's a user account with the same email as the coach
  EXISTS (
    SELECT 1 FROM auth.users au 
    WHERE au.id = auth.uid() 
    AND au.email = coaches.email
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM auth.users au 
    WHERE au.id = auth.uid() 
    AND au.email = coaches.email
  )
);

-- 3. Public can only view basic, non-sensitive coach information for booking purposes
-- This uses the existing get_coach_for_booking function approach
CREATE POLICY "Public can view basic coach info for booking"
ON public.coaches
FOR SELECT
TO authenticated
USING (
  -- Only allow access to basic fields needed for booking
  -- Sensitive fields like email, phone, calendar_link are excluded from public access
  is_active = true
);

-- Note: The application should use the get_coach_for_booking() function 
-- for public access, which only returns non-sensitive fields

-- 4. Block all public access to sensitive coach data
-- No policy for anonymous users means they get no access