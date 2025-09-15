-- Add investment-specific fields to connected_accounts table to support both regular and investment accounts
ALTER TABLE public.connected_accounts 
ADD COLUMN IF NOT EXISTS account_subtype text,
ADD COLUMN IF NOT EXISTS investment_type text,
ADD COLUMN IF NOT EXISTS holdings jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS total_shares numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS avg_cost_basis numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS day_change numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS day_change_percent numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS manual_balance_override boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS manual_balance_amount numeric;

-- Add comments to document the new fields
COMMENT ON COLUMN public.connected_accounts.account_subtype IS 'Investment subtypes: 401k, IRA, Roth_IRA, Brokerage, HSA, etc.';
COMMENT ON COLUMN public.connected_accounts.investment_type IS 'Investment categories: stocks, bonds, mutual_funds, etf, crypto, real_estate, etc.';
COMMENT ON COLUMN public.connected_accounts.holdings IS 'JSON array of holdings with symbol, shares, price, etc.';
COMMENT ON COLUMN public.connected_accounts.total_shares IS 'Total number of shares across all holdings';
COMMENT ON COLUMN public.connected_accounts.avg_cost_basis IS 'Average cost basis for all holdings';
COMMENT ON COLUMN public.connected_accounts.day_change IS 'Daily change in account value in dollars';
COMMENT ON COLUMN public.connected_accounts.day_change_percent IS 'Daily change in account value as percentage';
COMMENT ON COLUMN public.connected_accounts.manual_balance_override IS 'Whether to use manual balance instead of API balance';
COMMENT ON COLUMN public.connected_accounts.manual_balance_amount IS 'Manually entered balance amount';

-- Update the account_type enum to include investment types if needed
-- Note: We'll keep the existing types and use account_subtype for more granular classification