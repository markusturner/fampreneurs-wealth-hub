CREATE POLICY "Owners can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.is_current_user_owner());