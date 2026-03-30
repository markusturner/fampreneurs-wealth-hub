
CREATE POLICY "Admins can view all family members"
  ON public.family_members FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
