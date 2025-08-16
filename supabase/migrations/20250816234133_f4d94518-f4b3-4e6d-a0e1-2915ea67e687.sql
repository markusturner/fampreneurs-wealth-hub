-- Fix search path for the update function
DROP FUNCTION IF EXISTS public.update_meeting_types_updated_at();

CREATE OR REPLACE FUNCTION public.update_meeting_types_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path TO 'public', 'pg_temp';