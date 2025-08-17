-- Hardening access to profiles and related RPCs to prevent public data exposure

-- 1) Explicitly restrict table privileges
REVOKE SELECT ON TABLE public.profiles FROM anon;
-- Keep authenticated access; RLS still governs row visibility
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.profiles TO authenticated;

-- 2) Restrict RPC execution to authenticated users only (remove PUBLIC/anon)
REVOKE ALL ON FUNCTION public.get_public_profile(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_public_profile(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.get_safe_profile_info(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_safe_profile_info(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.get_community_profiles() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_community_profiles() TO authenticated;

REVOKE ALL ON FUNCTION public.get_community_profile(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_community_profile(uuid) TO authenticated;

-- 3) Safety check: confirm RLS is enabled (no-op if already enabled)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 4) Optional: ensure no permissive SELECT policies for anonymous users exist (defensive)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'profiles'
      AND roles @> ARRAY['anon']::name[] AND cmd = 'SELECT'
  ) THEN
    RAISE EXCEPTION 'Found anon SELECT policy on profiles; please remove manually.';
  END IF;
END$$;