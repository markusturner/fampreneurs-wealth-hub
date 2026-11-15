ALTER TABLE public.markus_skills ADD COLUMN IF NOT EXISTS owner_user_id uuid;
ALTER TABLE public.markus_skills DROP CONSTRAINT IF EXISTS markus_skills_slug_key;
CREATE UNIQUE INDEX IF NOT EXISTS markus_skills_inherited_slug_key ON public.markus_skills (slug) WHERE owner_user_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS markus_skills_personal_slug_key ON public.markus_skills (owner_user_id, slug) WHERE owner_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS markus_skills_owner_user_idx ON public.markus_skills (owner_user_id);

DROP POLICY IF EXISTS markus_skills_read ON public.markus_skills;
DROP POLICY IF EXISTS markus_skills_owner_insert ON public.markus_skills;
DROP POLICY IF EXISTS markus_skills_owner_update ON public.markus_skills;
DROP POLICY IF EXISTS markus_skills_owner_delete ON public.markus_skills;

CREATE POLICY markus_skills_read ON public.markus_skills FOR SELECT TO authenticated
  USING ((owner_user_id IS NULL AND (is_active OR public.is_current_user_owner())) OR owner_user_id = auth.uid());
CREATE POLICY markus_skills_insert ON public.markus_skills FOR INSERT TO authenticated
  WITH CHECK ((owner_user_id IS NULL AND public.is_current_user_owner()) OR owner_user_id = auth.uid());
CREATE POLICY markus_skills_update ON public.markus_skills FOR UPDATE TO authenticated
  USING ((owner_user_id IS NULL AND public.is_current_user_owner()) OR owner_user_id = auth.uid())
  WITH CHECK ((owner_user_id IS NULL AND public.is_current_user_owner()) OR owner_user_id = auth.uid());
CREATE POLICY markus_skills_delete ON public.markus_skills FOR DELETE TO authenticated
  USING ((owner_user_id IS NULL AND public.is_current_user_owner()) OR owner_user_id = auth.uid());

-- Members can keep up to 50 of their own skills.
CREATE OR REPLACE FUNCTION public.limit_personal_markus_skills()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.owner_user_id IS NOT NULL AND (SELECT count(*) FROM public.markus_skills WHERE owner_user_id = NEW.owner_user_id) >= 50 THEN
    RAISE EXCEPTION 'You can save up to 50 of your own skills';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS limit_personal_markus_skills ON public.markus_skills;
CREATE TRIGGER limit_personal_markus_skills BEFORE INSERT ON public.markus_skills FOR EACH ROW EXECUTE FUNCTION public.limit_personal_markus_skills();

CREATE TABLE IF NOT EXISTS public.markus_memory_settings (
  user_id uuid PRIMARY KEY,
  memory_enabled boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.markus_memory_settings TO authenticated;
GRANT ALL ON public.markus_memory_settings TO service_role;
ALTER TABLE public.markus_memory_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members manage their memory setting" ON public.markus_memory_settings FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);