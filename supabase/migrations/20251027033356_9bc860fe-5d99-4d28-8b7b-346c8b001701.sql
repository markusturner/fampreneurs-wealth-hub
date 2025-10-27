-- Create role permissions table
CREATE TABLE IF NOT EXISTS public.role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role TEXT NOT NULL,
  permission_key TEXT NOT NULL,
  permission_name TEXT NOT NULL,
  permission_description TEXT,
  is_granted BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(role, permission_key)
);

-- Enable RLS
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

-- Only owners can manage role permissions
CREATE POLICY "Owners can manage all role permissions"
ON public.role_permissions
FOR ALL
USING (has_role(auth.uid(), 'owner'::member_role))
WITH CHECK (has_role(auth.uid(), 'owner'::member_role));

-- Everyone can view role permissions (needed for access control checks)
CREATE POLICY "Everyone can view role permissions"
ON public.role_permissions
FOR SELECT
USING (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_role_permissions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_role_permissions_updated_at
BEFORE UPDATE ON public.role_permissions
FOR EACH ROW
EXECUTE FUNCTION public.update_role_permissions_updated_at();

-- Insert default permissions for different roles
INSERT INTO public.role_permissions (role, permission_key, permission_name, permission_description, is_granted) VALUES
-- Admin permissions
('admin', 'view_all_users', 'View All Users', 'Can view all user accounts and profiles', true),
('admin', 'manage_users', 'Manage Users', 'Can edit and delete user accounts', true),
('admin', 'send_notifications', 'Send Notifications', 'Can send mass notifications to users', true),
('admin', 'view_analytics', 'View Analytics', 'Can view platform analytics and metrics', true),
('admin', 'manage_meetings', 'Manage Meetings', 'Can manage all meetings and sessions', true),
('admin', 'access_admin_panel', 'Access Admin Panel', 'Can access the admin panel', true),

-- Trustee permissions
('trustee', 'view_dashboard', 'View Dashboard', 'Can access main dashboard', true),
('trustee', 'manage_family', 'Manage Family', 'Can manage family members and governance', true),
('trustee', 'view_documents', 'View Documents', 'Can access family documents', true),
('trustee', 'manage_investments', 'Manage Investments', 'Can manage investment accounts', true),
('trustee', 'view_calendar', 'View Calendar', 'Can access family calendar', true),
('trustee', 'create_meetings', 'Create Meetings', 'Can schedule family meetings', true),

-- Family Member permissions
('family_member', 'view_announcements', 'View Announcements', 'Can view family announcements', true),
('family_member', 'view_contacts', 'View Contacts', 'Can view family contact information', true),
('family_member', 'request_documents', 'Request Documents', 'Can request access to documents', true),
('family_member', 'view_calendar', 'View Calendar', 'Can view family calendar (read-only)', true),

-- Owner permissions (all permissions)
('owner', 'view_all_users', 'View All Users', 'Can view all user accounts and profiles', true),
('owner', 'manage_users', 'Manage Users', 'Can edit and delete user accounts', true),
('owner', 'send_notifications', 'Send Notifications', 'Can send mass notifications to users', true),
('owner', 'view_analytics', 'View Analytics', 'Can view platform analytics and metrics', true),
('owner', 'manage_meetings', 'Manage Meetings', 'Can manage all meetings and sessions', true),
('owner', 'access_admin_panel', 'Access Admin Panel', 'Can access the admin panel', true),
('owner', 'manage_roles', 'Manage Roles', 'Can manage role permissions', true),
('owner', 'zapier_integration', 'Zapier Integration', 'Can access Zapier integration', true),
('owner', 'full_system_access', 'Full System Access', 'Complete control over all platform features', true)
ON CONFLICT (role, permission_key) DO NOTHING;