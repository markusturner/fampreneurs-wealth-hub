
CREATE TABLE public.invite_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text NOT NULL UNIQUE,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  invite_type text NOT NULL DEFAULT 'temporary' CHECK (invite_type IN ('temporary', 'permanent')),
  expires_at timestamptz,
  max_uses integer,
  uses_count integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  role text NOT NULL DEFAULT 'family_member',
  program_name text,
  truheirs_access boolean NOT NULL DEFAULT true,
  plan_type text NOT NULL DEFAULT 'free' CHECK (plan_type IN ('free','paid_in_full','payment_plan')),
  total_amount numeric,
  installment_amount numeric,
  installment_frequency text,
  payment_start_date date,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.invite_links TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invite_links TO authenticated;
GRANT ALL ON public.invite_links TO service_role;

ALTER TABLE public.invite_links ENABLE ROW LEVEL SECURITY;

-- Public can look up an active link by token to accept it
CREATE POLICY "Public can read active invite links"
  ON public.invite_links FOR SELECT
  USING (is_active = true);

-- Admins/owners manage
CREATE POLICY "Admins can insert invite links"
  ON public.invite_links FOR INSERT TO authenticated
  WITH CHECK (public.is_current_user_admin() OR public.is_current_user_owner());

CREATE POLICY "Admins can update invite links"
  ON public.invite_links FOR UPDATE TO authenticated
  USING (public.is_current_user_admin() OR public.is_current_user_owner())
  WITH CHECK (public.is_current_user_admin() OR public.is_current_user_owner());

CREATE POLICY "Admins can delete invite links"
  ON public.invite_links FOR DELETE TO authenticated
  USING (public.is_current_user_admin() OR public.is_current_user_owner());

CREATE TRIGGER update_invite_links_updated_at
BEFORE UPDATE ON public.invite_links
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_invite_links_token ON public.invite_links(token);
