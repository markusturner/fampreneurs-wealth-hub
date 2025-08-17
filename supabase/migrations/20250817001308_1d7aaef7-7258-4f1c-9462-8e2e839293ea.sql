-- Ensure meeting_types inserts don't require referencing auth.users
DO $$
DECLARE
  constraint_name text;
BEGIN
  SELECT tc.constraint_name INTO constraint_name
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name 
   AND tc.table_schema = kcu.table_schema 
   AND tc.table_name = kcu.table_name
  WHERE tc.table_schema = 'public' 
    AND tc.table_name = 'meeting_types' 
    AND tc.constraint_type = 'FOREIGN KEY' 
    AND kcu.column_name = 'created_by'
  LIMIT 1;

  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.meeting_types DROP CONSTRAINT %I', constraint_name);
  END IF;
END$$;

-- Trigger to set defaults and created_by from auth.uid()
CREATE OR REPLACE FUNCTION public.set_meeting_types_defaults()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
  IF NEW.created_by IS NULL THEN
    NEW.created_by = auth.uid();
  END IF;
  IF NEW.created_at IS NULL THEN
    NEW.created_at = now();
  END IF;
  NEW.updated_at = now();
  IF NEW.is_active IS NULL THEN
    NEW.is_active = true;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_meeting_types_defaults ON public.meeting_types;
CREATE TRIGGER trg_meeting_types_defaults
BEFORE INSERT OR UPDATE ON public.meeting_types
FOR EACH ROW
EXECUTE FUNCTION public.set_meeting_types_defaults();