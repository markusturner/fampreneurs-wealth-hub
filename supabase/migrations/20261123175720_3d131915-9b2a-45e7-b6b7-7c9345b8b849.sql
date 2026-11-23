-- Members can read but not change their own paid subscription record
DROP POLICY IF EXISTS "Users can manage own subscription" ON public.subscribers;

-- Members can only create alerts for themselves; staff can create alerts for anyone
DROP POLICY IF EXISTS "Authenticated can create notifications" ON public.notifications;
CREATE POLICY "Members create own alerts, staff create any"
ON public.notifications FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id OR public.is_current_user_staff());

-- Role changes must come from a signed-in admin/owner, never from a typed-in id
CREATE OR REPLACE FUNCTION public.assign_admin_role(target_user_id uuid, assigner_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_current_user_staff() THEN
    RAISE EXCEPTION 'Only admins can assign admin roles';
  END IF;
  UPDATE public.profiles
     SET is_admin = true,
         admin_permissions = ARRAY['manage_users', 'manage_groups', 'manage_settings']
   WHERE user_id = target_user_id;
  INSERT INTO public.user_roles (user_id, role, assigned_by)
  VALUES (target_user_id, 'admin', auth.uid())
  ON CONFLICT (user_id, role) DO NOTHING;
END;
$$;

CREATE OR REPLACE FUNCTION public.assign_moderator_role(target_user_id uuid, assigner_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_current_user_staff() THEN
    RAISE EXCEPTION 'Only admins can assign moderator roles';
  END IF;
  UPDATE public.profiles SET is_moderator = true WHERE user_id = target_user_id;
  INSERT INTO public.user_roles (user_id, role, assigned_by)
  VALUES (target_user_id, 'moderator', auth.uid())
  ON CONFLICT (user_id, role) DO NOTHING;
END;
$$;

CREATE OR REPLACE FUNCTION public.assign_accountability_role(target_user_id uuid, assigner_user_id uuid, specialties text[] DEFAULT NULL::text[])
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_current_user_staff() THEN
    RAISE EXCEPTION 'Only admins can assign accountability partner roles';
  END IF;
  UPDATE public.profiles
     SET is_accountability_partner = true,
         accountability_specialties = COALESCE(specialties, ARRAY['general_support'])
   WHERE user_id = target_user_id;
  INSERT INTO public.user_roles (user_id, role, assigned_by)
  VALUES (target_user_id, 'accountability_partner', auth.uid())
  ON CONFLICT (user_id, role) DO NOTHING;
END;
$$;

CREATE OR REPLACE FUNCTION public.assign_user_role(target_user_id uuid, new_role member_role, assigner_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_current_user_staff() THEN
    RAISE EXCEPTION 'Insufficient permissions to assign roles';
  END IF;
  IF new_role = 'owner'::member_role AND NOT public.is_current_user_owner() THEN
    RAISE EXCEPTION 'Only owners can assign the owner role';
  END IF;
  INSERT INTO public.user_roles (user_id, role, assigned_by)
  VALUES (target_user_id, new_role, auth.uid())
  ON CONFLICT (user_id, role) DO UPDATE SET assigned_by = EXCLUDED.assigned_by, assigned_at = now();
END;
$$;

CREATE OR REPLACE FUNCTION public.remove_user_role(target_user_id uuid, role_to_remove member_role, remover_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_current_user_staff() THEN
    RAISE EXCEPTION 'Insufficient permissions to remove roles';
  END IF;
  IF role_to_remove = 'owner'::member_role AND NOT public.is_current_user_owner() THEN
    RAISE EXCEPTION 'Only owners can remove the owner role';
  END IF;
  DELETE FROM public.user_roles WHERE user_id = target_user_id AND role = role_to_remove;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.assign_admin_role(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.assign_moderator_role(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.assign_accountability_role(uuid, uuid, text[]) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.assign_user_role(uuid, member_role, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.remove_user_role(uuid, member_role, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.assign_admin_role(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.assign_moderator_role(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.assign_accountability_role(uuid, uuid, text[]) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.assign_user_role(uuid, member_role, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.remove_user_role(uuid, member_role, uuid) TO authenticated, service_role;