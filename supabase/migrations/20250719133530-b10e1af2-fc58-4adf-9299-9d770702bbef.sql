-- Create family_member_roles enum
CREATE TYPE public.family_member_role AS ENUM ('family_office_only');

-- Add login_credentials table for family members
CREATE TABLE public.family_member_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_member_id UUID NOT NULL REFERENCES public.family_members(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role family_member_role NOT NULL DEFAULT 'family_office_only',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_login TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  UNIQUE(email)
);

-- Enable RLS
ALTER TABLE public.family_member_credentials ENABLE ROW LEVEL SECURITY;

-- Create policies for family_member_credentials
CREATE POLICY "Family members can view their own credentials"
ON public.family_member_credentials
FOR SELECT
USING (
  email = auth.email()
  OR EXISTS (
    SELECT 1 FROM public.family_members fm
    WHERE fm.id = family_member_credentials.family_member_id
    AND fm.added_by = auth.uid()
  )
);

CREATE POLICY "Family creators can manage family member credentials"
ON public.family_member_credentials
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.family_members fm
    WHERE fm.id = family_member_credentials.family_member_id
    AND fm.added_by = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.family_members fm
    WHERE fm.id = family_member_credentials.family_member_id
    AND fm.added_by = auth.uid()
  )
);

-- Add updated_at trigger
CREATE TRIGGER update_family_member_credentials_updated_at
BEFORE UPDATE ON public.family_member_credentials
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add a function to check if user is family member with restricted access
CREATE OR REPLACE FUNCTION public.is_family_office_only_user(user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.family_member_credentials fmc
    WHERE fmc.email = (SELECT email FROM auth.users WHERE id = user_id)
    AND fmc.role = 'family_office_only'
    AND fmc.is_active = true
  );
$$;