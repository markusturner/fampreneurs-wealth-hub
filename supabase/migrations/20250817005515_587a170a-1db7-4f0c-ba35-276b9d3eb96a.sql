-- Add email column to profiles (to avoid referencing auth.users in RLS)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS email text;

-- Backfill email from auth.users for existing profiles
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.user_id = u.id
  AND (p.email IS NULL OR p.email <> u.email);

-- Update handle_new_user trigger function to also store email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
  INSERT INTO public.profiles (
    user_id,
    email,
    first_name,
    last_name,
    display_name,
    occupation,
    avatar_url
  )
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data ->> 'first_name',
    NEW.raw_user_meta_data ->> 'last_name',
    COALESCE(
      NEW.raw_user_meta_data ->> 'display_name',
      CONCAT(NEW.raw_user_meta_data ->> 'first_name', ' ', NEW.raw_user_meta_data ->> 'last_name')
    ),
    NEW.raw_user_meta_data ->> 'occupation',
    NEW.raw_user_meta_data ->> 'avatar_url'
  );
  RETURN NEW;
END;
$$;

-- Replace problematic profiles policy that referenced auth.users
DROP POLICY IF EXISTS "Family managers can view managed profiles" ON public.profiles;

CREATE POLICY "Family managers can view managed profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.family_members fm
    WHERE fm.added_by = auth.uid()
      AND fm.email = public.profiles.email
      AND fm.status = 'active'
  )
);
