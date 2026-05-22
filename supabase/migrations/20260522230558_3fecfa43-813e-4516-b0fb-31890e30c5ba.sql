CREATE POLICY "Admins and owners can view all completions"
ON public.lesson_completions
FOR SELECT
TO authenticated
USING (public.is_current_user_admin() OR public.is_current_user_owner());