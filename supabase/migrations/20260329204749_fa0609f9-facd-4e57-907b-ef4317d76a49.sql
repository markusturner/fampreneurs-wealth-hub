ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS program_contract_value numeric DEFAULT NULL,
ADD COLUMN IF NOT EXISTS program_cash_collected numeric DEFAULT NULL,
ADD COLUMN IF NOT EXISTS stripe_subscription_id text DEFAULT NULL;