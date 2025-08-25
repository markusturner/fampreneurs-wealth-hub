-- Secure the subscribers table RLS to prevent data leakage and privilege escalation
-- 1) Remove overly-permissive policies that allowed broad INSERT/DELETE and self-UPDATE
DROP POLICY IF EXISTS "service_role_insert_only" ON public.subscribers;
DROP POLICY IF EXISTS "service_role_delete_only" ON public.subscribers;
DROP POLICY IF EXISTS "users_can_update_own_subscription_only" ON public.subscribers;

-- 2) Ensure admin can manage all (insert/update/delete) while regular users can only read their own
-- Admin insert policy (edge functions also bypass RLS via service role)
CREATE POLICY "admins_can_insert_subscriptions"
ON public.subscribers
FOR INSERT
WITH CHECK (public.is_current_user_admin());

-- Keep existing admin update policy (already present), but ensure it exists; recreate idempotently
DROP POLICY IF EXISTS "admins_can_update_all_subscriptions" ON public.subscribers;
CREATE POLICY "admins_can_update_all_subscriptions"
ON public.subscribers
FOR UPDATE
USING (public.is_current_user_admin())
WITH CHECK (public.is_current_user_admin());

-- Admin delete policy
CREATE POLICY "admins_can_delete_subscriptions"
ON public.subscribers
FOR DELETE
USING (public.is_current_user_admin());

-- 3) Read access remains: users can read only their own row; admins can read all
-- Recreate to be explicit and avoid duplicates
DROP POLICY IF EXISTS "users_can_view_own_subscription_only" ON public.subscribers;
CREATE POLICY "users_can_view_own_subscription_only"
ON public.subscribers
FOR SELECT
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "admins_can_view_all_subscriptions" ON public.subscribers;
CREATE POLICY "admins_can_view_all_subscriptions"
ON public.subscribers
FOR SELECT
USING (public.is_current_user_admin());

-- Optional: Keep a deny-all for anonymous (safety belt) — RLS denies by default without a policy match
DROP POLICY IF EXISTS "Block anonymous access to subscribers" ON public.subscribers;
CREATE POLICY "require_authenticated_for_any_access"
ON public.subscribers
FOR ALL
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);
