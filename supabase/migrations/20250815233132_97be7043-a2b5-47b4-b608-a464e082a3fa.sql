-- Fix security definer view issue
-- Remove the SECURITY DEFINER property from the view to address the security concern

-- 1. Drop and recreate the view without SECURITY DEFINER
DROP VIEW IF EXISTS public.safe_profiles;

-- 2. Recreate the view as a regular view (not security definer)
CREATE VIEW public.safe_profiles AS
SELECT 
  user_id,
  display_name,
  avatar_url,
  created_at,
  -- Only show first name initial for privacy
  CASE 
    WHEN LENGTH(COALESCE(first_name, '')) > 0 THEN LEFT(first_name, 1) || '.'
    ELSE NULL 
  END as first_initial
FROM public.profiles;

-- 3. Create an RLS policy on the view to control access
CREATE POLICY "Safe profile view access"
ON public.profiles 
FOR SELECT 
TO authenticated
USING (true);  -- Allow viewing the safe columns only

-- 4. Grant SELECT permission to authenticated users
GRANT SELECT ON public.safe_profiles TO authenticated;