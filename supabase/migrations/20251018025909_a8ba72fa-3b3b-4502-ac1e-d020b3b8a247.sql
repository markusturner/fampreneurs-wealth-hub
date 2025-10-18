-- Create member role enum if not exists
DO $$ BEGIN
  CREATE TYPE public.member_role AS ENUM ('admin', 'trustee', 'family_office_member', 'family_member', 'member');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create user_roles table if not exists
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role member_role NOT NULL,
  assigned_by UUID,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user_roles
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;
CREATE POLICY "Admins can manage all roles" ON public.user_roles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() 
      AND is_admin = true
    )
  );

DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
CREATE POLICY "Users can view their own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

-- Make markusturner94@gmail.com an admin
UPDATE public.profiles 
SET is_admin = true 
WHERE email = 'markusturner94@gmail.com';

-- Insert admin role for markusturner94@gmail.com
INSERT INTO public.user_roles (user_id, role, assigned_by)
SELECT user_id, 'admin', user_id
FROM public.profiles
WHERE email = 'markusturner94@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;