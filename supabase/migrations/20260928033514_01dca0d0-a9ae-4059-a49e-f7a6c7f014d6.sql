CREATE TABLE public.handoff_successors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  name text NOT NULL,
  email text NOT NULL,
  role text,
  deadline date NOT NULL,
  status text NOT NULL DEFAULT 'sent',
  progress integer NOT NULL DEFAULT 0,
  steps jsonb NOT NULL DEFAULT '{}'::jsonb,
  token uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  reminders_sent integer NOT NULL DEFAULT 0,
  last_reminder_at timestamptz,
  opened_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.handoff_successors TO authenticated;
GRANT ALL ON public.handoff_successors TO service_role;
ALTER TABLE public.handoff_successors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage their successors" ON public.handoff_successors FOR ALL TO authenticated
  USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE TRIGGER update_handoff_successors_updated_at BEFORE UPDATE ON public.handoff_successors
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();