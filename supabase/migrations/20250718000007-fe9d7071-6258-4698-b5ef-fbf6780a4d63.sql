-- Create onboarding emails table
CREATE TABLE public.onboarding_emails (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  email_type TEXT NOT NULL,
  email_subject TEXT NOT NULL,
  email_content TEXT NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  email_status TEXT NOT NULL DEFAULT 'sent',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.onboarding_emails ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins can view all onboarding emails" 
ON public.onboarding_emails 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE profiles.user_id = auth.uid() 
  AND profiles.is_admin = true
));

CREATE POLICY "System can create onboarding emails" 
ON public.onboarding_emails 
FOR INSERT 
WITH CHECK (true);

-- Create revenue tracking table
CREATE TABLE public.revenue_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  transaction_type TEXT NOT NULL, -- 'new_subscription', 'renewal', 'upsell', 'cancellation'
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  transaction_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  subscription_tier TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.revenue_metrics ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins can manage revenue metrics" 
ON public.revenue_metrics 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE profiles.user_id = auth.uid() 
  AND profiles.is_admin = true
));

-- Create satisfaction scores table
CREATE TABLE public.satisfaction_scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  score INTEGER NOT NULL CHECK (score >= 1 AND score <= 10),
  feedback_type TEXT NOT NULL DEFAULT 'general',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.satisfaction_scores ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins can view all satisfaction scores" 
ON public.satisfaction_scores 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE profiles.user_id = auth.uid() 
  AND profiles.is_admin = true
));

CREATE POLICY "Users can create their own satisfaction scores" 
ON public.satisfaction_scores 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create coach assignments table
CREATE TABLE public.coach_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  coach_id UUID NOT NULL,
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.coach_assignments ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins can manage coach assignments" 
ON public.coach_assignments 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE profiles.user_id = auth.uid() 
  AND profiles.is_admin = true
));

-- Add indexes for performance
CREATE INDEX idx_onboarding_emails_user_id ON public.onboarding_emails(user_id);
CREATE INDEX idx_onboarding_emails_sent_at ON public.onboarding_emails(sent_at);
CREATE INDEX idx_revenue_metrics_user_id ON public.revenue_metrics(user_id);
CREATE INDEX idx_revenue_metrics_transaction_date ON public.revenue_metrics(transaction_date);
CREATE INDEX idx_satisfaction_scores_user_id ON public.satisfaction_scores(user_id);
CREATE INDEX idx_coach_assignments_user_id ON public.coach_assignments(user_id);
CREATE INDEX idx_coach_assignments_coach_id ON public.coach_assignments(coach_id);

-- Create triggers for updated_at
CREATE TRIGGER update_onboarding_emails_updated_at
BEFORE UPDATE ON public.onboarding_emails
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_revenue_metrics_updated_at
BEFORE UPDATE ON public.revenue_metrics
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_satisfaction_scores_updated_at
BEFORE UPDATE ON public.satisfaction_scores
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_coach_assignments_updated_at
BEFORE UPDATE ON public.coach_assignments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();