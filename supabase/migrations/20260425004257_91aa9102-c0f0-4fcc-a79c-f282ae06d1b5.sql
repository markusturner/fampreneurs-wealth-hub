
CREATE POLICY "Admins and owners can add memberships for any user"
ON public.group_memberships
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::member_role)
  OR public.has_role(auth.uid(), 'owner'::member_role)
);

CREATE POLICY "Admins and owners can remove any membership"
ON public.group_memberships
FOR DELETE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::member_role)
  OR public.has_role(auth.uid(), 'owner'::member_role)
);

CREATE POLICY "Admins and owners can view all memberships"
ON public.group_memberships
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::member_role)
  OR public.has_role(auth.uid(), 'owner'::member_role)
);
