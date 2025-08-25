-- Create governance_onboarding table to store user progress
CREATE TABLE public.governance_onboarding (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  data jsonb NOT NULL DEFAULT '{}',
  completed boolean NOT NULL DEFAULT false,
  completed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.governance_onboarding ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can manage their own governance onboarding"
ON public.governance_onboarding
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_governance_onboarding_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_governance_onboarding_updated_at
  BEFORE UPDATE ON public.governance_onboarding
  FOR EACH ROW
  EXECUTE FUNCTION public.update_governance_onboarding_updated_at();