-- Add governance_branch column to family_members table
ALTER TABLE public.family_members 
ADD COLUMN IF NOT EXISTS governance_branch TEXT 
CHECK (governance_branch IN ('family_council', 'council_elders', 'family_assembly'));