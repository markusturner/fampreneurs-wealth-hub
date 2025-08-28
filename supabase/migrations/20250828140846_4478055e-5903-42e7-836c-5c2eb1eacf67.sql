-- 1) Create a persistent roles catalog per user
CREATE TABLE IF NOT EXISTS public.office_roles_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID NOT NULL,
  name TEXT NOT NULL,
  services TEXT[] NOT NULL DEFAULT '{}',
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.office_roles_catalog ENABLE ROW LEVEL SECURITY;

-- Allow users to manage (select/insert/update/delete) their own roles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'office_roles_catalog' 
      AND policyname = 'Users can manage their own office roles'
  ) THEN
    CREATE POLICY "Users can manage their own office roles"
    ON public.office_roles_catalog
    FOR ALL
    TO authenticated
    USING (created_by = auth.uid())
    WITH CHECK (created_by = auth.uid());
  END IF;
END $$;

-- Allow admins to view all roles (optional convenience)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'office_roles_catalog' 
      AND policyname = 'Admins can view all office roles'
  ) THEN
    CREATE POLICY "Admins can view all office roles"
    ON public.office_roles_catalog
    FOR SELECT
    TO authenticated
    USING (public.is_current_user_admin());
  END IF;
END $$;

-- Update updated_at automatically
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_office_roles_catalog_updated_at'
  ) THEN
    CREATE TRIGGER update_office_roles_catalog_updated_at
    BEFORE UPDATE ON public.office_roles_catalog
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- 2) Add columns to family_members to store per-member selections
ALTER TABLE public.family_members
  ADD COLUMN IF NOT EXISTS office_role TEXT,
  ADD COLUMN IF NOT EXISTS office_services TEXT[] DEFAULT '{}'::text[];
