ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS partner_group_id uuid;
CREATE INDEX IF NOT EXISTS idx_profiles_partner_group_id ON public.profiles(partner_group_id);