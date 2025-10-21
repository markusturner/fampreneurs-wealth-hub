-- Add 'owner' to existing member_role enum if not exists
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'owner' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'member_role')) THEN
    ALTER TYPE public.member_role ADD VALUE 'owner';
  END IF;
END $$;