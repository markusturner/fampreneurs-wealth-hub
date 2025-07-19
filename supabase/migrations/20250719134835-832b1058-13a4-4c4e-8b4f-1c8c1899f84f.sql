-- Add status field to courses table for draft/published functionality
ALTER TABLE public.courses 
ADD COLUMN status text NOT NULL DEFAULT 'published';

-- Add check constraint for valid status values
ALTER TABLE public.courses 
ADD CONSTRAINT courses_status_check 
CHECK (status IN ('draft', 'published'));