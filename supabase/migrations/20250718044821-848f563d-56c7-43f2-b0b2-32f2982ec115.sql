-- Add profile photo field to coaches table
ALTER TABLE public.coaches ADD COLUMN avatar_url TEXT;

-- Create storage bucket for coach photos
INSERT INTO storage.buckets (id, name, public) VALUES ('coach-photos', 'coach-photos', true);

-- Create storage policies for coach photos
CREATE POLICY "Coach photos are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'coach-photos');

CREATE POLICY "Authenticated users can upload coach photos" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'coach-photos' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update coach photos" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'coach-photos' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete coach photos" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'coach-photos' AND auth.role() = 'authenticated');

-- Create table for tracking user session quotas per program
CREATE TABLE public.user_session_quotas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  program_id UUID,
  monthly_complimentary_sessions INTEGER NOT NULL DEFAULT 0,
  complimentary_sessions_used INTEGER NOT NULL DEFAULT 0,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, program_id, period_start)
);

-- Enable RLS on user_session_quotas
ALTER TABLE public.user_session_quotas ENABLE ROW LEVEL SECURITY;

-- Create policies for user_session_quotas
CREATE POLICY "Admins can manage all session quotas" 
ON public.user_session_quotas 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.is_admin = true
  )
);

CREATE POLICY "Users can view their own session quotas" 
ON public.user_session_quotas 
FOR SELECT 
USING (auth.uid() = user_id);

-- Create table for paid session transactions
CREATE TABLE public.paid_session_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  session_id UUID,
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  stripe_payment_intent_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on paid_session_transactions
ALTER TABLE public.paid_session_transactions ENABLE ROW LEVEL SECURITY;

-- Create policies for paid_session_transactions
CREATE POLICY "Admins can manage all paid session transactions" 
ON public.paid_session_transactions 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.is_admin = true
  )
);

CREATE POLICY "Users can view their own paid session transactions" 
ON public.paid_session_transactions 
FOR SELECT 
USING (auth.uid() = user_id);

-- Create trigger for updated_at columns
CREATE TRIGGER update_user_session_quotas_updated_at
BEFORE UPDATE ON public.user_session_quotas
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_paid_session_transactions_updated_at
BEFORE UPDATE ON public.paid_session_transactions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();