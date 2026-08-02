GRANT SELECT, UPDATE ON public.community_manager_settings TO authenticated;
GRANT ALL ON public.community_manager_settings TO service_role;

CREATE POLICY "Admins update community manager settings"
ON public.community_manager_settings
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::member_role) OR public.has_role(auth.uid(), 'owner'::member_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::member_role) OR public.has_role(auth.uid(), 'owner'::member_role));