-- Create user roles table
CREATE TABLE public.user_roles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'member', 'accountability_partner')),
  assigned_by UUID REFERENCES auth.users(id),
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Add admin and accountability fields to profiles
ALTER TABLE public.profiles 
ADD COLUMN is_admin BOOLEAN DEFAULT false,
ADD COLUMN is_accountability_partner BOOLEAN DEFAULT false,
ADD COLUMN accountability_specialties TEXT[],
ADD COLUMN admin_permissions TEXT[];

-- Create policies for user_roles
CREATE POLICY "Users can view all roles"
ON public.user_roles
FOR SELECT
USING (true);

CREATE POLICY "Admins can manage roles"
ON public.user_roles
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.is_admin = true
  )
);

-- Create function to check admin status
CREATE OR REPLACE FUNCTION public.is_user_admin(user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id = $1
    AND profiles.is_admin = true
  );
$$;

-- Create function to assign admin role
CREATE OR REPLACE FUNCTION public.assign_admin_role(target_user_id UUID, assigner_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if assigner is admin or if this is the first admin (no admins exist)
  IF NOT public.is_user_admin(assigner_user_id) AND EXISTS (
    SELECT 1 FROM public.profiles WHERE is_admin = true
  ) THEN
    RAISE EXCEPTION 'Only admins can assign admin roles';
  END IF;

  -- Update profile to admin
  UPDATE public.profiles 
  SET is_admin = true,
      admin_permissions = ARRAY['manage_users', 'manage_groups', 'manage_settings']
  WHERE user_id = target_user_id;

  -- Insert role record
  INSERT INTO public.user_roles (user_id, role, assigned_by)
  VALUES (target_user_id, 'admin', assigner_user_id)
  ON CONFLICT (user_id, role) DO NOTHING;
END;
$$;

-- Create function to assign accountability partner role
CREATE OR REPLACE FUNCTION public.assign_accountability_role(
  target_user_id UUID, 
  assigner_user_id UUID,
  specialties TEXT[] DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if assigner is admin
  IF NOT public.is_user_admin(assigner_user_id) THEN
    RAISE EXCEPTION 'Only admins can assign accountability partner roles';
  END IF;

  -- Update profile
  UPDATE public.profiles 
  SET is_accountability_partner = true,
      accountability_specialties = COALESCE(specialties, ARRAY['general_support'])
  WHERE user_id = target_user_id;

  -- Insert role record
  INSERT INTO public.user_roles (user_id, role, assigned_by)
  VALUES (target_user_id, 'accountability_partner', assigner_user_id)
  ON CONFLICT (user_id, role) DO NOTHING;
END;
$$;

-- Insert a default admin (first user who signs up will be admin)
-- This trigger will make the first user an admin automatically
CREATE OR REPLACE FUNCTION public.handle_first_admin()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- If no admins exist, make this user an admin
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE is_admin = true) THEN
    NEW.is_admin = true;
    NEW.admin_permissions = ARRAY['manage_users', 'manage_groups', 'manage_settings'];
    
    -- Also insert into user_roles
    INSERT INTO public.user_roles (user_id, role, assigned_by)
    VALUES (NEW.user_id, 'admin', NEW.user_id);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for first admin
CREATE TRIGGER set_first_admin
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_first_admin();