-- Secure verification_codes table: create if missing, enable RLS, and restrict access
BEGIN;

-- 1) Create table (if it doesn't exist yet)
CREATE TABLE IF NOT EXISTS public.verification_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  phone_number text,
  code text NOT NULL,
  method text NOT NULL CHECK (method IN ('email','phone','sms','authenticator')),
  expires_at timestamptz NOT NULL,
  verified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Helpful indexes for lookups and cleanup
CREATE INDEX IF NOT EXISTS idx_verification_codes_email_method_code ON public.verification_codes (email, method, code);
CREATE INDEX IF NOT EXISTS idx_verification_codes_expires_at ON public.verification_codes (expires_at);

-- 2) Enable Row Level Security
ALTER TABLE public.verification_codes ENABLE ROW LEVEL SECURITY;

-- 3) Remove any existing permissive policies that might expose data
DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'verification_codes'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.verification_codes', pol.policyname);
  END LOOP;
END$$;

-- 4) Lock down privileges at the SQL level (RLS is the main protection, but this helps too)
REVOKE ALL ON TABLE public.verification_codes FROM PUBLIC;
REVOKE ALL ON TABLE public.verification_codes FROM anon;
REVOKE ALL ON TABLE public.verification_codes FROM authenticated;

-- 5) Minimal safe policy: allow authenticated users to read ONLY their own, still-active codes
-- Note: Edge functions use the service role and bypass RLS, so existing flows keep working
CREATE POLICY "Users can view their own active verification codes"
ON public.verification_codes
FOR SELECT
TO authenticated
USING (
  email IS NOT NULL
  AND current_setting('request.jwt.claim.email', true) = email
  AND verified = false
  AND expires_at > now()
);

COMMIT;