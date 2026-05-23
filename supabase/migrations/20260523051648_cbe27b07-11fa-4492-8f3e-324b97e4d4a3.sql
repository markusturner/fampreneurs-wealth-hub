
-- 1) SOPs program tags
ALTER TABLE public.sops
  ADD COLUMN IF NOT EXISTS program_tags text[] NOT NULL DEFAULT '{}'::text[];

-- 2) SOP ↔ Lesson links
CREATE TABLE IF NOT EXISTS public.sop_lesson_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sop_id uuid NOT NULL REFERENCES public.sops(id) ON DELETE CASCADE,
  lesson_id uuid NOT NULL REFERENCES public.course_videos(id) ON DELETE CASCADE,
  link_type text NOT NULL DEFAULT 'auto',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (sop_id, lesson_id)
);

ALTER TABLE public.sop_lesson_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone authenticated can view sop_lesson_links" ON public.sop_lesson_links;
CREATE POLICY "Anyone authenticated can view sop_lesson_links"
  ON public.sop_lesson_links FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admins/owners can manage sop_lesson_links" ON public.sop_lesson_links;
CREATE POLICY "Admins/owners can manage sop_lesson_links"
  ON public.sop_lesson_links FOR ALL TO authenticated
  USING (public.is_current_user_admin() OR public.is_current_user_owner())
  WITH CHECK (public.is_current_user_admin() OR public.is_current_user_owner());

CREATE INDEX IF NOT EXISTS idx_sop_lesson_links_sop ON public.sop_lesson_links(sop_id);
CREATE INDEX IF NOT EXISTS idx_sop_lesson_links_lesson ON public.sop_lesson_links(lesson_id);

-- 3) Per-program locking on modules and lessons
ALTER TABLE public.course_modules
  ADD COLUMN IF NOT EXISTS required_programs text[] NOT NULL DEFAULT '{}'::text[];
ALTER TABLE public.course_videos
  ADD COLUMN IF NOT EXISTS required_programs text[] NOT NULL DEFAULT '{}'::text[];

-- 4) Rename FFM community group to "The Succession Society"
UPDATE public.community_groups
SET name = 'The Succession Society'
WHERE name = 'The Family Fortune Mastermind';

-- Update auto-assign triggers' program → group name mapping so 'The Family Fortune Mastermind' still maps to the new group
CREATE OR REPLACE FUNCTION public.auto_assign_to_community_group()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $function$
DECLARE
    program_item text;
    mapped_name text;
    target_group_id uuid;
BEGIN
    IF NEW.program_name IS NULL OR btrim(NEW.program_name) = '' THEN
        RETURN NEW;
    END IF;
    FOR program_item IN SELECT btrim(p) FROM unnest(string_to_array(NEW.program_name, ',')) AS p LOOP
        IF program_item = '' THEN CONTINUE; END IF;
        mapped_name := CASE program_item
            WHEN 'The Family Business University' THEN 'Family Business University'
            WHEN 'The Family Vault' THEN 'The Family Vault'
            WHEN 'The Family Business Accelerator' THEN 'The Family Business Accelerator'
            WHEN 'The Family Legacy: VIP Weekend' THEN 'The Family Legacy: VIP Weekend'
            WHEN 'The Family Fortune Mastermind' THEN 'The Succession Society'
            WHEN 'The Succession Society' THEN 'The Succession Society'
            ELSE program_item
        END;
        SELECT id INTO target_group_id FROM community_groups WHERE name = mapped_name LIMIT 1;
        IF target_group_id IS NOT NULL THEN
            INSERT INTO group_memberships (group_id, user_id, role)
            VALUES (target_group_id, NEW.user_id, 'member')
            ON CONFLICT (group_id, user_id) DO NOTHING;
        END IF;
    END LOOP;
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.auto_assign_user_to_program_channel()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
BEGIN
  IF OLD.program_name IS DISTINCT FROM NEW.program_name THEN
    IF OLD.program_name IS NOT NULL THEN
      DELETE FROM public.group_memberships
       WHERE user_id = NEW.user_id
         AND group_id IN (
           SELECT id FROM public.community_groups
           WHERE name = CASE OLD.program_name
             WHEN 'The Family Business University' THEN 'Family Business University'
             WHEN 'The Family Vault' THEN 'The Family Vault'
             WHEN 'The Family Business Accelerator' THEN 'The Family Business Accelerator'
             WHEN 'The Family Legacy: VIP Weekend' THEN 'The Family Legacy: VIP Weekend'
             WHEN 'The Family Fortune Mastermind' THEN 'The Succession Society'
             ELSE OLD.program_name
           END
         );
    END IF;
    IF NEW.program_name IS NOT NULL THEN
      INSERT INTO public.group_memberships (group_id, user_id, role)
      SELECT id, NEW.user_id, 'member'
      FROM public.community_groups
      WHERE name = CASE NEW.program_name
        WHEN 'The Family Business University' THEN 'Family Business University'
        WHEN 'The Family Vault' THEN 'The Family Vault'
        WHEN 'The Family Business Accelerator' THEN 'The Family Business Accelerator'
        WHEN 'The Family Legacy: VIP Weekend' THEN 'The Family Legacy: VIP Weekend'
        WHEN 'The Family Fortune Mastermind' THEN 'The Succession Society'
        ELSE NEW.program_name
      END
      ON CONFLICT (group_id, user_id) DO NOTHING;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.auto_assign_new_user_to_program_channel()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
BEGIN
  IF NEW.program_name IS NOT NULL THEN
    INSERT INTO public.group_memberships (group_id, user_id, role)
    SELECT id, NEW.user_id, 'member'
    FROM public.community_groups
    WHERE name = CASE NEW.program_name
      WHEN 'The Family Business University' THEN 'Family Business University'
      WHEN 'The Family Vault' THEN 'The Family Vault'
      WHEN 'The Family Business Accelerator' THEN 'The Family Business Accelerator'
      WHEN 'The Family Legacy: VIP Weekend' THEN 'The Family Legacy: VIP Weekend'
      WHEN 'The Family Fortune Mastermind' THEN 'The Succession Society'
      ELSE NEW.program_name
    END
    ON CONFLICT (group_id, user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$function$;

-- 5) Lock Legacy Launchpad modules 7–10 to Succession Society (tffm)
UPDATE public.course_modules
SET required_programs = ARRAY['tffm']::text[]
WHERE course_id = 'da97fe97-07c7-4454-a60e-718a0c091053'
  AND order_index IN (7, 8, 9, 10);
