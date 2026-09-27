ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS software_only boolean NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS truheirs_paid_until date;

CREATE OR REPLACE FUNCTION public.expire_ended_programs()
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.profiles
  SET truheirs_access = false
  WHERE truheirs_access = true
    AND COALESCE(is_admin,false) = false
    AND COALESCE(contract_extension_date, contract_due_date) < current_date
    AND (truheirs_paid_until IS NULL OR truheirs_paid_until < current_date)
    AND NOT EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = profiles.user_id AND r.role IN ('admin','owner'));
$$;

CREATE EXTENSION IF NOT EXISTS pg_cron;
SELECT cron.schedule('expire-ended-programs', '15 5 * * *', $$SELECT public.expire_ended_programs();$$);