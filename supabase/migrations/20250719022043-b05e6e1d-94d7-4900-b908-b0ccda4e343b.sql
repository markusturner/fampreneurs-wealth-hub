-- Create connected accounts table for persistent storage
CREATE TABLE public.connected_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_name TEXT NOT NULL,
  account_type TEXT NOT NULL CHECK (account_type IN ('bank', 'brokerage', 'crypto', 'business')),
  provider TEXT NOT NULL,
  external_account_id TEXT,
  balance NUMERIC DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  last_sync TIMESTAMP WITH TIME ZONE DEFAULT now(),
  status TEXT DEFAULT 'connected' CHECK (status IN ('connected', 'disconnected', 'syncing', 'error')),
  plaid_access_token TEXT,
  plaid_item_id TEXT,
  google_sheet_id TEXT,
  credentials JSONB,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.connected_accounts ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own connected accounts" 
ON public.connected_accounts 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own connected accounts" 
ON public.connected_accounts 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own connected accounts" 
ON public.connected_accounts 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own connected accounts" 
ON public.connected_accounts 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create transactions table for real-time transaction data
CREATE TABLE public.account_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES public.connected_accounts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  transaction_id TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  currency TEXT DEFAULT 'USD',
  description TEXT,
  category TEXT,
  transaction_type TEXT CHECK (transaction_type IN ('debit', 'credit', 'transfer')),
  merchant_name TEXT,
  pending BOOLEAN DEFAULT false,
  transaction_date DATE NOT NULL,
  authorized_date DATE,
  location JSONB,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(account_id, transaction_id)
);

-- Enable RLS for transactions
ALTER TABLE public.account_transactions ENABLE ROW LEVEL SECURITY;

-- Create policies for transactions
CREATE POLICY "Users can view their own transactions" 
ON public.account_transactions 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own transactions" 
ON public.account_transactions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_connected_accounts_user_id ON public.connected_accounts(user_id);
CREATE INDEX idx_connected_accounts_status ON public.connected_accounts(status);
CREATE INDEX idx_account_transactions_user_id ON public.account_transactions(user_id);
CREATE INDEX idx_account_transactions_account_id ON public.account_transactions(account_id);
CREATE INDEX idx_account_transactions_date ON public.account_transactions(transaction_date);

-- Create trigger for updating timestamps
CREATE TRIGGER update_connected_accounts_updated_at
  BEFORE UPDATE ON public.connected_accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_account_transactions_updated_at
  BEFORE UPDATE ON public.account_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();