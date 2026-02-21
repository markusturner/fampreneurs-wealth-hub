
ALTER TABLE public.meetings
ADD COLUMN IF NOT EXISTS duration_minutes integer DEFAULT 60,
ADD COLUMN IF NOT EXISTS timezone text DEFAULT 'America/New_York',
ADD COLUMN IF NOT EXISTS location_link text,
ADD COLUMN IF NOT EXISTS is_recurring boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS recurring_pattern jsonb,
ADD COLUMN IF NOT EXISTS remind_email boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS parent_meeting_id uuid REFERENCES public.meetings(id) ON DELETE CASCADE;
