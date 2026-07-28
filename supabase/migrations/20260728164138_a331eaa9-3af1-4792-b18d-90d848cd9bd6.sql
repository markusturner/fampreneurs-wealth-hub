ALTER TABLE public.community_events
  ADD COLUMN IF NOT EXISTS recurrence text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS recurrence_end_date date;
ALTER TABLE public.community_events
  DROP CONSTRAINT IF EXISTS community_events_recurrence_check;
ALTER TABLE public.community_events
  ADD CONSTRAINT community_events_recurrence_check
  CHECK (recurrence IN ('none','daily','weekly','biweekly','monthly'));