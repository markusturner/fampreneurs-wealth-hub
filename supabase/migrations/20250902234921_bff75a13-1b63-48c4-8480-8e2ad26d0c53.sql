-- Add missing columns for family office member functionality
ALTER TABLE public.family_members 
ADD COLUMN company text,
ADD COLUMN department text, 
ADD COLUMN access_level text;