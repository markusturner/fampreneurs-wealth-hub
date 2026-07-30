ALTER TABLE public.session_attendance
  ALTER COLUMN session_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS manual_session_title text,
  ADD COLUMN IF NOT EXISTS manual_coach_name text,
  ADD COLUMN IF NOT EXISTS manual_session_date date,
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'auto',
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS logged_by uuid;