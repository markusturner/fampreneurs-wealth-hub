
-- 1) Sync existing admin/moderator flags into user_roles so nothing breaks
INSERT INTO public.user_roles (user_id, role)
SELECT user_id, 'admin'::member_role FROM public.profiles WHERE is_admin = true
ON CONFLICT (user_id, role) DO NOTHING;

INSERT INTO public.user_roles (user_id, role)
SELECT user_id, 'moderator'::member_role FROM public.profiles WHERE is_moderator = true
ON CONFLICT (user_id, role) DO NOTHING;

-- 2) is_current_user_admin now reads ONLY from user_roles
CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'::member_role
  )
$$;

-- 3) Trigger preventing non-admins from changing privilege columns on profiles
CREATE OR REPLACE FUNCTION public.prevent_profile_privilege_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF public.is_current_user_admin() THEN
    RETURN NEW;
  END IF;
  IF NEW.is_admin IS DISTINCT FROM OLD.is_admin
     OR NEW.is_moderator IS DISTINCT FROM OLD.is_moderator
     OR NEW.is_accountability_partner IS DISTINCT FROM OLD.is_accountability_partner
     OR NEW.admin_permissions IS DISTINCT FROM OLD.admin_permissions THEN
    RAISE EXCEPTION 'Not allowed to modify privilege fields on profile';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_profile_privilege_escalation_trg ON public.profiles;
CREATE TRIGGER prevent_profile_privilege_escalation_trg
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.prevent_profile_privilege_escalation();

-- 4) Replace recursive admin policy on profiles with one using user_roles
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
CREATE POLICY "Admins can update all profiles"
ON public.profiles
FOR UPDATE
TO authenticated
USING (public.is_current_user_admin())
WITH CHECK (public.is_current_user_admin());

-- 5) Remove anon-readable course modules policy
DROP POLICY IF EXISTS "Course modules are viewable by everyone" ON public.course_modules;

-- 6) Tighten platform_settings policy
DROP POLICY IF EXISTS "Admins can manage platform settings" ON public.platform_settings;
CREATE POLICY "Admins can manage platform settings"
ON public.platform_settings
FOR ALL
TO authenticated
USING (public.is_current_user_admin())
WITH CHECK (public.is_current_user_admin());
