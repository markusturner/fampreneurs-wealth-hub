DROP INDEX IF EXISTS public.session_attendance_user_external_ref_key;
ALTER TABLE public.session_attendance
  ADD CONSTRAINT session_attendance_user_external_ref_key UNIQUE (user_id, external_ref);