-- Create transaction categories table with category types
CREATE TABLE public.transaction_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category_type TEXT NOT NULL CHECK (category_type IN ('expense', 'income', 'transfer', 'investment')),
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(name, created_by)
);

-- Enable RLS
ALTER TABLE public.transaction_categories ENABLE ROW LEVEL SECURITY;

-- RLS Policies for transaction categories
CREATE POLICY "Users can view their own transaction categories" 
ON public.transaction_categories 
FOR SELECT 
USING (auth.uid() = created_by OR created_by IS NULL);

CREATE POLICY "Users can create their own transaction categories" 
ON public.transaction_categories 
FOR INSERT 
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own transaction categories" 
ON public.transaction_categories 
FOR UPDATE 
USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own transaction categories" 
ON public.transaction_categories 
FOR DELETE 
USING (auth.uid() = created_by);

-- Insert default transaction categories (system-wide, created_by = NULL)
INSERT INTO public.transaction_categories (name, category_type, created_by) VALUES 
  -- Expense categories
  ('Food & Dining', 'expense', NULL),
  ('Transportation', 'expense', NULL),
  ('Shopping', 'expense', NULL),
  ('Utilities', 'expense', NULL),
  ('Healthcare', 'expense', NULL),
  ('Entertainment', 'expense', NULL),
  ('Rent', 'expense', NULL),
  ('Mortgage', 'expense', NULL),
  ('Insurance', 'expense', NULL),
  ('Education', 'expense', NULL),
  ('Travel', 'expense', NULL),
  ('Personal Care', 'expense', NULL),
  ('Home Improvement', 'expense', NULL),
  ('Subscriptions', 'expense', NULL),
  ('Business Expenses', 'expense', NULL),
  
  -- Income categories  
  ('Salary', 'income', NULL),
  ('Business Income', 'income', NULL),
  ('Investment Returns', 'income', NULL),
  ('Dividends', 'income', NULL),
  ('Interest', 'income', NULL),
  ('Rental Income', 'income', NULL),
  ('Freelance', 'income', NULL),
  ('Bonus', 'income', NULL),
  ('Gifts Received', 'income', NULL),
  
  -- Transfer categories
  ('Account Transfer', 'transfer', NULL),
  ('Internal Transfer', 'transfer', NULL),
  ('Savings Transfer', 'transfer', NULL),
  
  -- Investment categories
  ('Stock Purchase', 'investment', NULL),
  ('Bond Purchase', 'investment', NULL),
  ('Mutual Fund', 'investment', NULL),
  ('Real Estate Investment', 'investment', NULL),
  ('Crypto Purchase', 'investment', NULL),
  ('401k Contribution', 'investment', NULL),
  ('IRA Contribution', 'investment', NULL);

-- Create trigger for updated_at
CREATE TRIGGER update_transaction_categories_updated_at
  BEFORE UPDATE ON public.transaction_categories
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();