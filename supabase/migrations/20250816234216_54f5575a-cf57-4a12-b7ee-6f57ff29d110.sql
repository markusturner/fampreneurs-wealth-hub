-- Drop the trigger first, then recreate function with proper search path
DROP TRIGGER IF EXISTS update_meeting_types_updated_at ON public.meeting_types;
DROP FUNCTION IF EXISTS public.update_meeting_types_updated_at();

-- Recreate function with proper search path
CREATE OR REPLACE FUNCTION public.update_meeting_types_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path TO 'public', 'pg_temp';

-- Recreate the trigger
CREATE TRIGGER update_meeting_types_updated_at
  BEFORE UPDATE ON public.meeting_types
  FOR EACH ROW
  EXECUTE FUNCTION public.update_meeting_types_updated_at();