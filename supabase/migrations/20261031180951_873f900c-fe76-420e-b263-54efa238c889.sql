GRANT INSERT ON public.privacy_requests TO authenticated;
GRANT UPDATE ON public.privacy_requests TO authenticated;
CREATE POLICY "Members request their own export or deletion" ON public.privacy_requests FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND request_type IN ('export', 'delete') AND status IN ('pending', 'completed'));
CREATE POLICY "Admins update privacy requests" ON public.privacy_requests FOR UPDATE TO authenticated
  USING (public.is_current_user_admin() OR public.is_current_user_owner())
  WITH CHECK (public.is_current_user_admin() OR public.is_current_user_owner());