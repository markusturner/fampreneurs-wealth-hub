
-- Create onboarding_responses table
CREATE TABLE public.onboarding_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  full_name TEXT NOT NULL,
  tshirt_size TEXT NOT NULL,
  mailing_address TEXT NOT NULL,
  first_touchpoint TEXT NOT NULL,
  decision_reason TEXT NOT NULL,
  investment_reason TEXT NOT NULL,
  join_elaboration TEXT NOT NULL,
  time_to_decide TEXT NOT NULL,
  improvement_suggestion TEXT NOT NULL,
  why_markus TEXT NOT NULL,
  final_push TEXT NOT NULL,
  pre_call_conviction TEXT NOT NULL,
  biggest_hesitation TEXT NOT NULL,
  why_choose_me TEXT NOT NULL,
  specific_content TEXT NOT NULL,
  anything_else TEXT,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.onboarding_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own onboarding"
  ON public.onboarding_responses FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own onboarding"
  ON public.onboarding_responses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own onboarding"
  ON public.onboarding_responses FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all onboarding"
  ON public.onboarding_responses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE UNIQUE INDEX idx_onboarding_user_id ON public.onboarding_responses (user_id);

CREATE TRIGGER update_onboarding_responses_updated_at
  BEFORE UPDATE ON public.onboarding_responses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
