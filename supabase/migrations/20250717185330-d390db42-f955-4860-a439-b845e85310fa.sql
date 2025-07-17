-- Create financial_advisors table
CREATE TABLE public.financial_advisors (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  added_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  company TEXT,
  title TEXT,
  email TEXT,
  phone TEXT,
  specialties TEXT[],
  license_number TEXT,
  years_experience INTEGER,
  hourly_rate DECIMAL(10,2),
  bio TEXT,
  website TEXT,
  linkedin_url TEXT,
  is_active BOOLEAN DEFAULT true,
  preferred_contact_method TEXT CHECK (preferred_contact_method IN ('email', 'phone', 'both')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.financial_advisors ENABLE ROW LEVEL SECURITY;

-- Create policies for financial_advisors
CREATE POLICY "Users can view all financial advisors"
ON public.financial_advisors
FOR SELECT
USING (true);

CREATE POLICY "Users can add financial advisors"
ON public.financial_advisors
FOR INSERT
WITH CHECK (auth.uid() = added_by);

CREATE POLICY "Users can update advisors they added"
ON public.financial_advisors
FOR UPDATE
USING (auth.uid() = added_by);

CREATE POLICY "Admins can manage all financial advisors"
ON public.financial_advisors
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.is_admin = true
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_financial_advisors_updated_at
  BEFORE UPDATE ON public.financial_advisors
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();