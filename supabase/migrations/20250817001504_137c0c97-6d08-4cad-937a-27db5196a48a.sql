-- Make created_by nullable since it will be set by the trigger
ALTER TABLE public.meeting_types ALTER COLUMN created_by DROP NOT NULL;