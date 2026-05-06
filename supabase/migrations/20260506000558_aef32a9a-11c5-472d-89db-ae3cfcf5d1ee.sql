CREATE POLICY "Admins and moderators can delete any post"
ON public.community_posts
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid()
      AND (p.is_admin = true OR p.is_moderator = true)
  )
);