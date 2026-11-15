CREATE TABLE public.markus_onboarding (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  completed_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.markus_onboarding TO authenticated;
GRANT ALL ON public.markus_onboarding TO service_role;
ALTER TABLE public.markus_onboarding ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read own Markus onboarding" ON public.markus_onboarding FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.is_current_user_staff());
CREATE POLICY "Members create own Markus onboarding" ON public.markus_onboarding FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Members update own Markus onboarding" ON public.markus_onboarding FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);