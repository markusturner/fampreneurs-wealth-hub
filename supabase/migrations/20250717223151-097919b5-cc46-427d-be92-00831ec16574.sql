-- Create enhanced user roles system
CREATE TYPE public.member_role AS ENUM ('member', 'billing_manager', 'admin', 'moderator', 'group_owner');

-- Drop the old app_role if it exists and recreate user_roles with new structure
DROP TABLE IF EXISTS public.user_roles CASCADE;
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role member_role NOT NULL DEFAULT 'member',
  assigned_by UUID,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view all roles"
  ON public.user_roles FOR SELECT
  USING (true);

CREATE POLICY "Admins and billing managers can manage roles"
  ON public.user_roles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid() 
      AND (p.is_admin = true OR EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid() 
        AND ur.role IN ('billing_manager', 'group_owner')
      ))
    )
  );

-- Create fulfillment stages table
CREATE TABLE public.fulfillment_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#3b82f6',
  stage_order INTEGER NOT NULL DEFAULT 0,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.fulfillment_stages ENABLE ROW LEVEL SECURITY;

-- Create policies for fulfillment stages
CREATE POLICY "Admins can manage fulfillment stages"
  ON public.fulfillment_stages FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid() 
      AND (p.is_admin = true OR EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid() 
        AND ur.role IN ('admin', 'billing_manager', 'group_owner')
      ))
    )
  );

CREATE POLICY "Users can view fulfillment stages"
  ON public.fulfillment_stages FOR SELECT
  USING (true);

-- Create user fulfillment progress table
CREATE TABLE public.user_fulfillment_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  stage_id UUID NOT NULL REFERENCES public.fulfillment_stages(id) ON DELETE CASCADE,
  moved_to_stage_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  moved_by UUID,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, stage_id)
);

-- Enable RLS
ALTER TABLE public.user_fulfillment_progress ENABLE ROW LEVEL SECURITY;

-- Create policies for user fulfillment progress
CREATE POLICY "Admins can manage user progress"
  ON public.user_fulfillment_progress FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid() 
      AND (p.is_admin = true OR EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid() 
        AND ur.role IN ('admin', 'billing_manager', 'group_owner')
      ))
    )
  );

CREATE POLICY "Users can view their own progress"
  ON public.user_fulfillment_progress FOR SELECT
  USING (auth.uid() = user_id);

-- Create platform settings table
CREATE TABLE public.platform_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT UNIQUE NOT NULL,
  setting_value TEXT,
  description TEXT,
  updated_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

-- Create policies for platform settings
CREATE POLICY "Admins can manage platform settings"
  ON public.platform_settings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid() 
      AND (p.is_admin = true OR EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid() 
        AND ur.role IN ('admin', 'billing_manager', 'group_owner')
      ))
    )
  );

-- Insert default platform settings
INSERT INTO public.platform_settings (setting_key, setting_value, description) VALUES
('platform_name', 'Fampreneurs', 'The name of the platform'),
('admin_email', 'admin@fampreneurs.com', 'Primary admin email address'),
('enable_user_registration', 'true', 'Allow new user registrations'),
('require_email_verification', 'true', 'Require email verification for new users');

-- Insert default fulfillment stages
INSERT INTO public.fulfillment_stages (name, description, color, stage_order, created_by) VALUES
('New Member', 'Recently joined the program', '#10b981', 0, '00000000-0000-0000-0000-000000000000'),
('Onboarding', 'Completing initial setup', '#3b82f6', 1, '00000000-0000-0000-0000-000000000000'),
('Active Learning', 'Actively participating in courses', '#8b5cf6', 2, '00000000-0000-0000-0000-000000000000'),
('Implementation', 'Applying learned concepts', '#f59e0b', 3, '00000000-0000-0000-0000-000000000000'),
('Success', 'Achieved program goals', '#ef4444', 4, '00000000-0000-0000-0000-000000000000');

-- Create functions for role management
CREATE OR REPLACE FUNCTION public.assign_user_role(target_user_id UUID, new_role member_role, assigner_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Check if assigner has permission
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = assigner_user_id 
    AND (p.is_admin = true OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = assigner_user_id 
      AND ur.role IN ('billing_manager', 'group_owner')
    ))
  ) THEN
    RAISE EXCEPTION 'Insufficient permissions to assign roles';
  END IF;

  -- Insert or update role
  INSERT INTO public.user_roles (user_id, role, assigned_by)
  VALUES (target_user_id, new_role, assigner_user_id)
  ON CONFLICT (user_id, role) DO UPDATE SET
    assigned_by = EXCLUDED.assigned_by,
    assigned_at = now();
END;
$$;

CREATE OR REPLACE FUNCTION public.remove_user_role(target_user_id UUID, role_to_remove member_role, remover_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Check if remover has permission
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = remover_user_id 
    AND (p.is_admin = true OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = remover_user_id 
      AND ur.role IN ('billing_manager', 'group_owner')
    ))
  ) THEN
    RAISE EXCEPTION 'Insufficient permissions to remove roles';
  END IF;

  -- Remove role
  DELETE FROM public.user_roles 
  WHERE user_id = target_user_id AND role = role_to_remove;
END;
$$;

-- Update trigger for updated_at columns
CREATE TRIGGER update_fulfillment_stages_updated_at
  BEFORE UPDATE ON public.fulfillment_stages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_fulfillment_progress_updated_at
  BEFORE UPDATE ON public.user_fulfillment_progress
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_platform_settings_updated_at
  BEFORE UPDATE ON public.platform_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();