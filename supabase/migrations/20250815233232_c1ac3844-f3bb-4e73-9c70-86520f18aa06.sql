-- Final security cleanup: Remove all problematic views and duplicate policies

-- 1. Drop all problematic views completely
DROP VIEW IF EXISTS public.safe_profiles CASCADE;
DROP VIEW IF EXISTS public.public_profiles CASCADE;
DROP VIEW IF EXISTS public.coaches_public CASCADE;

-- 2. Clean up all duplicate and problematic policies on profiles
DROP POLICY IF EXISTS "Safe profile view access" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can view limited community profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Family managers can view managed member profiles" ON public.profiles;
DROP POLICY IF EXISTS "Secure profile access" ON public.profiles;

-- 3. Create a single, clean set of security policies
CREATE POLICY "Users can view own profile"
ON public.profiles 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles"
ON public.profiles 
FOR SELECT 
TO authenticated
USING (public.is_current_user_admin());

CREATE POLICY "Family managers can view managed profiles"
ON public.profiles 
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.family_members fm
    WHERE fm.added_by = auth.uid() 
    AND fm.email = (SELECT email FROM auth.users WHERE id = profiles.user_id)
    AND fm.status = 'active'
  )
);

-- 4. Ensure RLS is properly enforced
ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;

-- 5. Create a simple view for community features without security_definer
-- This view only shows public-safe information
CREATE VIEW public.community_profiles AS
SELECT 
  user_id,
  display_name,
  avatar_url
FROM public.profiles
WHERE display_name IS NOT NULL;

-- 6. Grant access to the view
GRANT SELECT ON public.community_profiles TO authenticated;

-- 7. Final verification that we have clean policies
-- List current policies for verification
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    RAISE NOTICE 'Current policies on profiles table:';
    FOR policy_record IN 
        SELECT policyname, cmd 
        FROM pg_policies 
        WHERE tablename = 'profiles' 
        ORDER BY policyname
    LOOP
        RAISE NOTICE 'Policy: % (Command: %)', policy_record.policyname, policy_record.cmd;
    END LOOP;
END $$;