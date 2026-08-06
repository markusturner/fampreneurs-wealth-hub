ALTER TABLE public.invite_links
  ADD COLUMN IF NOT EXISTS access_mode text NOT NULL DEFAULT 'signup',
  ADD COLUMN IF NOT EXISTS direct_email text,
  ADD COLUMN IF NOT EXISTS access_pin_hash text,
  ADD COLUMN IF NOT EXISTS failed_attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS locked_until timestamptz;