-- Create bank_statement_transactions table
CREATE TABLE public.bank_statement_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  bank_statement_id UUID REFERENCES public.bank_statement_uploads(id) ON DELETE CASCADE,
  transaction_date DATE NOT NULL,
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  category TEXT DEFAULT 'Uncategorized',
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('debit', 'credit')),
  balance_after NUMERIC,
  reference_number TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.bank_statement_transactions ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own bank statement transactions" 
ON public.bank_statement_transactions 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own bank statement transactions" 
ON public.bank_statement_transactions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own bank statement transactions" 
ON public.bank_statement_transactions 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own bank statement transactions" 
ON public.bank_statement_transactions 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
NEW.updated_at = now();
RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_bank_statement_transactions_updated_at
BEFORE UPDATE ON public.bank_statement_transactions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for better performance
CREATE INDEX idx_bank_statement_transactions_user_id ON public.bank_statement_transactions(user_id);
CREATE INDEX idx_bank_statement_transactions_date ON public.bank_statement_transactions(transaction_date);
CREATE INDEX idx_bank_statement_transactions_statement_id ON public.bank_statement_transactions(bank_statement_id);