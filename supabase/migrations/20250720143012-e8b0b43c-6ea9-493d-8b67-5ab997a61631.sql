-- Add columns to community_groups for storing associated courses and coaching calls
ALTER TABLE public.community_groups 
ADD COLUMN IF NOT EXISTS associated_courses UUID[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS associated_group_calls UUID[] DEFAULT '{}';