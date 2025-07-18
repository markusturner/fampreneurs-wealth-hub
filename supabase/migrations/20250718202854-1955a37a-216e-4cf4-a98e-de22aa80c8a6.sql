-- Add associations for channels to group calls and courses
ALTER TABLE public.channels ADD COLUMN associated_group_calls UUID[] DEFAULT '{}';
ALTER TABLE public.channels ADD COLUMN associated_courses UUID[] DEFAULT '{}';