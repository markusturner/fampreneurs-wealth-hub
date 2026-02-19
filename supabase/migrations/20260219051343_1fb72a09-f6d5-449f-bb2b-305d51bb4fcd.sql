
-- Add mailing_address and truheirs_access columns to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS mailing_address text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS truheirs_access boolean NOT NULL DEFAULT true;
