-- Fix the remaining 2 functions missing search_path security setting

-- 1. Fix assign_accountability_role function
CREATE OR REPLACE FUNCTION public.assign_accountability_role(target_user_id uuid, assigner_user_id uuid, specialties text[] DEFAULT NULL::text[])
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
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
$function$;

-- 2. Fix assign_admin_role function  
CREATE OR REPLACE FUNCTION public.assign_admin_role(target_user_id uuid, assigner_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
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
$function$;