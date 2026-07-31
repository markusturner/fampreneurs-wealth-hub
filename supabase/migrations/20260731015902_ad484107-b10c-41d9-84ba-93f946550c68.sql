ALTER TABLE public.connected_accounts ADD COLUMN IF NOT EXISTS owner_entity text;
ALTER TABLE public.family_members ADD COLUMN IF NOT EXISTS generation integer;

CREATE TABLE IF NOT EXISTS public.handoff_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  checkin_interval_days integer NOT NULL DEFAULT 30,
  grace_period_days integer NOT NULL DEFAULT 14,
  last_checkin_at timestamptz NOT NULL DEFAULT now(),
  successor_name text,
  successor_email text,
  successor_phone text,
  release_enabled boolean NOT NULL DEFAULT false,
  checklist jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.handoff_settings TO authenticated;
GRANT ALL ON public.handoff_settings TO service_role;

ALTER TABLE public.handoff_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own handoff settings"
ON public.handoff_settings FOR ALL TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_handoff_settings_updated_at
BEFORE UPDATE ON public.handoff_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();