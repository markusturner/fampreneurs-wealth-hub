-- Allow admins to delete trust_submissions and trust_page_locks for any user
CREATE POLICY "Admins can delete trust_submissions"
ON public.trust_submissions
FOR DELETE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Admins can delete trust_page_locks"
ON public.trust_page_locks
FOR DELETE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
);