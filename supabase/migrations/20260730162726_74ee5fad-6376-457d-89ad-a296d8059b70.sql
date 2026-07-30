ALTER TABLE public.session_attendance ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
CREATE INDEX IF NOT EXISTS idx_session_attendance_deleted_at ON public.session_attendance (deleted_at);