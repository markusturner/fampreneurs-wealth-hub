-- Fix ALL remaining functions missing search_path security setting

-- Fix assign_default_member_role
CREATE OR REPLACE FUNCTION public.assign_default_member_role()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  -- Insert default 'member' role for new users
  INSERT INTO public.user_roles (user_id, role, assigned_by)
  VALUES (NEW.user_id, 'member', NEW.user_id)
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN NEW;
END;
$function$;

-- Fix assign_moderator_role
CREATE OR REPLACE FUNCTION public.assign_moderator_role(target_user_id uuid, assigner_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
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
$function$;

-- Fix assign_user_role
CREATE OR REPLACE FUNCTION public.assign_user_role(target_user_id uuid, new_role member_role, assigner_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
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
$function$;

-- Fix audit_family_members_changes
CREATE OR REPLACE FUNCTION public.audit_family_members_changes()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.log_family_office_action(
      'create',
      'family_members',
      NEW.id,
      NULL,
      to_jsonb(NEW),
      'medium',
      jsonb_build_object('trigger', 'automatic')
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM public.log_family_office_action(
      'update',
      'family_members',
      NEW.id,
      to_jsonb(OLD),
      to_jsonb(NEW),
      'medium',
      jsonb_build_object('trigger', 'automatic')
    );
    
    -- Update access tracking
    NEW.last_accessed = now();
    NEW.access_count = COALESCE(OLD.access_count, 0) + 1;
    
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.log_family_office_action(
      'delete',
      'family_members',
      OLD.id,
      to_jsonb(OLD),
      NULL,
      'high',
      jsonb_build_object('trigger', 'automatic')
    );
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$function$;