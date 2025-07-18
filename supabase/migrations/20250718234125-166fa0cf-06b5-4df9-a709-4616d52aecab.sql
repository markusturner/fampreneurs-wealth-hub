-- Add program field to profiles table
ALTER TABLE public.profiles 
ADD COLUMN program_name TEXT,
ADD COLUMN membership_type TEXT DEFAULT 'free';

-- Add default member role assignment function
CREATE OR REPLACE FUNCTION public.assign_default_member_role()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert default 'member' role for new users
  INSERT INTO public.user_roles (user_id, role, assigned_by)
  VALUES (NEW.user_id, 'member', NEW.user_id)
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically assign member role on profile creation
CREATE TRIGGER assign_member_role_on_signup
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_default_member_role();