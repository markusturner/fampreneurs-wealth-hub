-- Make family_position nullable since it's optional in the form
ALTER TABLE public.family_members 
ALTER COLUMN family_position DROP NOT NULL;