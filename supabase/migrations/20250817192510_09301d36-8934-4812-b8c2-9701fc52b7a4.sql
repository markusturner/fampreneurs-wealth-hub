-- Harden admin policies on subscribers to use SECURITY DEFINER function and avoid table references in policies

-- Replace admin SELECT policy to use function
DROP POLICY IF EXISTS "admins_can_view_all_subscriptions" ON public.subscribers;
CREATE POLICY "admins_can_view_all_subscriptions" ON public.subscribers
FOR SELECT 
TO authenticated
USING (public.is_current_user_admin());

-- Replace admin UPDATE policy to use function
DROP POLICY IF EXISTS "admins_can_update_all_subscriptions" ON public.subscribers;
CREATE POLICY "admins_can_update_all_subscriptions" ON public.subscribers
FOR UPDATE 
TO authenticated
USING (public.is_current_user_admin())
WITH CHECK (public.is_current_user_admin());