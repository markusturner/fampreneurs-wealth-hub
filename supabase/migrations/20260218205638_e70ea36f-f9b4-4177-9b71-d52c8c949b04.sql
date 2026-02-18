
-- Create program_agreements table to track signed agreements
CREATE TABLE public.program_agreements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  program_name TEXT NOT NULL,
  full_name TEXT NOT NULL,
  mailing_address TEXT NOT NULL,
  agreement_date DATE NOT NULL DEFAULT CURRENT_DATE,
  signature_data TEXT NOT NULL,
  signed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.program_agreements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own agreements" ON public.program_agreements
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own agreements" ON public.program_agreements
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all agreements" ON public.program_agreements
  FOR SELECT USING (public.is_current_user_admin());

-- Add address fields to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS street_address TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS state TEXT,
  ADD COLUMN IF NOT EXISTS zip_code TEXT;
