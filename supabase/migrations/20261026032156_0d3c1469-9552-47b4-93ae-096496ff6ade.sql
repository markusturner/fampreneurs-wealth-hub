CREATE OR REPLACE FUNCTION public.guard_recording_source_post()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
 IF auth.role() IN ('anon','authenticated') AND pg_trigger_depth() = 1 THEN
  IF TG_OP = 'INSERT' THEN
   IF NEW.recording_source_post_id IS NOT NULL THEN
    RAISE EXCEPTION 'Recording copies are managed automatically';
   END IF;
  ELSE
   IF NEW.recording_source_post_id IS DISTINCT FROM OLD.recording_source_post_id THEN
    RAISE EXCEPTION 'Recording copies are managed automatically';
   END IF;
   IF OLD.recording_source_post_id IS NOT NULL
      AND NOT (COALESCE(public.is_current_user_admin(), false) OR COALESCE(public.is_current_user_owner(), false)) THEN
    RAISE EXCEPTION 'Recording copies are managed automatically';
   END IF;
  END IF;
 END IF;
 RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.guard_recording_source_post() FROM PUBLIC, anon, authenticated;

CREATE POLICY "Admins and owners can update copied recordings"
ON public.community_posts
FOR UPDATE TO authenticated
USING (recording_source_post_id IS NOT NULL AND (public.is_current_user_admin() OR public.is_current_user_owner()))
WITH CHECK (recording_source_post_id IS NOT NULL AND (public.is_current_user_admin() OR public.is_current_user_owner()));