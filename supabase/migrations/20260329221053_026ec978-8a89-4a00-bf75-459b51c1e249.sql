ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS contract_start_date date,
  ADD COLUMN IF NOT EXISTS contract_due_date date,
  ADD COLUMN IF NOT EXISTS contract_extension_date date;