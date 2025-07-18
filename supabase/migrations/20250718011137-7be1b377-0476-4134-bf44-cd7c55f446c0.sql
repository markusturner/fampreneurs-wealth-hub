-- Create table for individual coaching sessions (1-on-1)
CREATE TABLE public.individual_coaching_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  coach_id UUID REFERENCES public.financial_advisors(id) ON DELETE CASCADE,
  client_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_date DATE NOT NULL,
  session_time TIME NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  meeting_type TEXT NOT NULL DEFAULT 'zoom',
  meeting_url TEXT NOT NULL,
  meeting_id TEXT,
  meeting_password TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled',
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.individual_coaching_sessions ENABLE ROW LEVEL SECURITY;

-- Create policies for individual coaching sessions
CREATE POLICY "Users can view their own individual sessions"
ON public.individual_coaching_sessions
FOR SELECT
USING (auth.uid() = client_id OR auth.uid() = created_by OR EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE user_id = auth.uid() AND is_admin = true
));

CREATE POLICY "Admins can create individual sessions"
ON public.individual_coaching_sessions
FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE user_id = auth.uid() AND is_admin = true
));

CREATE POLICY "Admins can update individual sessions"
ON public.individual_coaching_sessions
FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE user_id = auth.uid() AND is_admin = true
));

CREATE POLICY "Admins can delete individual sessions"
ON public.individual_coaching_sessions
FOR DELETE
USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE user_id = auth.uid() AND is_admin = true
));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_individual_coaching_sessions_updated_at
BEFORE UPDATE ON public.individual_coaching_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();