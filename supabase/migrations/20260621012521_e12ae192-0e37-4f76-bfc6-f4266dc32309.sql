
DROP POLICY IF EXISTS "Admins manage attendance" ON public.session_attendance;
CREATE POLICY "Admins manage attendance" ON public.session_attendance
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'owner'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'owner'));
