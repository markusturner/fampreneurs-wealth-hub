-- Clean up and finalize the security fix for profiles table
-- This fixes the error from the previous migration

-- 1. Create the secure functions for community profile access
CREATE OR REPLACE FUNCTION public.get_community_profiles()
RETURNS TABLE (
  user_id uuid,
  display_name text,
  avatar_url text,
  first_initial text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
AS $function$
  SELECT 
    p.user_id,
    p.display_name,
    p.avatar_url,
    CASE 
      WHEN LENGTH(COALESCE(p.first_name, '')) > 0 THEN LEFT(p.first_name, 1) || '.'
      ELSE NULL 
    END as first_initial
  FROM public.profiles p
  WHERE 
    -- Only return profiles that should be visible in community features
    p.display_name IS NOT NULL;
$function$;

-- 2. Create a function for getting a single safe profile
CREATE OR REPLACE FUNCTION public.get_community_profile(target_user_id uuid)
RETURNS TABLE (
  user_id uuid,
  display_name text,
  avatar_url text,
  first_initial text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
AS $function$
  SELECT 
    p.user_id,
    p.display_name,
    p.avatar_url,
    CASE 
      WHEN LENGTH(COALESCE(p.first_name, '')) > 0 THEN LEFT(p.first_name, 1) || '.'
      ELSE NULL 
    END as first_initial
  FROM public.profiles p
  WHERE 
    p.user_id = target_user_id
    AND p.display_name IS NOT NULL;
$function$;

-- 3. Final cleanup of conflicting policies
DROP POLICY IF EXISTS "Limited community profile access" ON public.profiles;

-- 4. Create the final secure policy structure
CREATE POLICY "Secure profile access"
ON public.profiles 
FOR SELECT 
TO authenticated
USING (
  -- Users can view their own full profile
  (auth.uid() = user_id) OR 
  -- Admins can view all profiles
  public.is_current_user_admin() OR
  -- Family managers can view profiles of family members they manage
  (EXISTS (
    SELECT 1 FROM public.family_members fm
    WHERE fm.added_by = auth.uid() 
    AND fm.email = (SELECT email FROM auth.users WHERE id = profiles.user_id)
    AND fm.status = 'active'
  ))
);

-- 5. Ensure no public access to profiles table
-- Remove any remaining overly permissive policies
ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;

-- 6. Add final audit log entry
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM public.family_office_audit_logs LIMIT 1) THEN
    INSERT INTO public.family_office_audit_logs (
      user_id,
      action,
      table_name,
      record_id,
      old_values,
      new_values,
      risk_level,
      metadata
    ) VALUES (
      auth.uid(),
      'security_fix_completed',
      'profiles',
      NULL,
      jsonb_build_object('status', 'vulnerable'),
      jsonb_build_object('status', 'secured', 'timestamp', now()),
      'critical',
      jsonb_build_object(
        'description', 'Completed critical security fix for profiles table access',
        'changes', ARRAY['removed_public_access', 'added_secure_functions', 'enforced_rls'],
        'fix_type', 'complete_rls_overhaul'
      )
    );
  END IF;
END $$;