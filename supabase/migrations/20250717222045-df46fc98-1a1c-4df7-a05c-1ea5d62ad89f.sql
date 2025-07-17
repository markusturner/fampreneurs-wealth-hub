-- Add moderator role support to profiles table
ALTER TABLE public.profiles 
ADD COLUMN is_moderator boolean DEFAULT false;

-- Add moderator to user_roles enum if it doesn't exist
-- (Note: We can't alter enum types in migrations, so we'll handle this in code)

-- Create function to assign moderator role
CREATE OR REPLACE FUNCTION public.assign_moderator_role(target_user_id uuid, assigner_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  -- Check if assigner is admin
  IF NOT public.is_user_admin(assigner_user_id) THEN
    RAISE EXCEPTION 'Only admins can assign moderator roles';
  END IF;

  -- Update profile
  UPDATE public.profiles 
  SET is_moderator = true
  WHERE user_id = target_user_id;

  -- Insert role record
  INSERT INTO public.user_roles (user_id, role, assigned_by)
  VALUES (target_user_id, 'moderator', assigner_user_id)
  ON CONFLICT (user_id, role) DO NOTHING;
END;
$$;