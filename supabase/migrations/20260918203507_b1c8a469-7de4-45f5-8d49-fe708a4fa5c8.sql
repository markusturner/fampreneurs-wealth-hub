CREATE POLICY "Admins and owners can update retention note entries"
ON public.client_retention_note_entries
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::member_role) OR has_role(auth.uid(), 'owner'::member_role))
WITH CHECK (has_role(auth.uid(), 'admin'::member_role) OR has_role(auth.uid(), 'owner'::member_role));