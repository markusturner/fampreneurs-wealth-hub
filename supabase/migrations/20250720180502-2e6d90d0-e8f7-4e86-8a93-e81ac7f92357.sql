-- Create function to assign default member role to new users
CREATE OR REPLACE FUNCTION public.assign_default_member_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Insert default 'member' role for new users
  INSERT INTO public.user_roles (user_id, role, assigned_by)
  VALUES (NEW.user_id, 'member', NEW.user_id)
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Create trigger to automatically assign member role when a new profile is created
CREATE TRIGGER on_profile_created_assign_member_role
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.assign_default_member_role();