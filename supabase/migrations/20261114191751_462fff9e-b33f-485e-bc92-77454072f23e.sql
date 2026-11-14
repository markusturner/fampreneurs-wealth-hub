CREATE TABLE public.markus_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  plan text NOT NULL,
  asset_range text,
  biggest_concern text,
  ghl_contact_id text,
  ghl_error text,
  stripe_session_id text,
  paid_at timestamptz,
  user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.markus_leads TO authenticated;
GRANT ALL ON public.markus_leads TO service_role;
ALTER TABLE public.markus_leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can view Markus leads" ON public.markus_leads FOR SELECT TO authenticated USING ((SELECT public.is_current_user_staff()));

INSERT INTO public.community_groups (name, description, is_private, order_index, created_by)
SELECT 'Markus AI Members', 'Private community for Markus AI members.', true, 6, 'be40b593-93de-4edc-baae-99d8b1c6757e'
WHERE NOT EXISTS (SELECT 1 FROM public.community_groups WHERE name = 'Markus AI Members');

CREATE OR REPLACE FUNCTION public.program_group_names(p_key text)
 RETURNS text[] LANGUAGE sql IMMUTABLE SET search_path TO 'public'
AS $function$
  SELECT CASE
    WHEN p_key IN ('fbu','Community') THEN ARRAY['Community']
    WHEN p_key IN ('tfv','ttv','The Trust Vault','Trust Vault','The Family Vault') THEN ARRAY['The Trust Vault']
    WHEN p_key IN ('tfba','pea','The Private Estate Accelerator','Private Estate Accelerator','The Family Business Accelerator') THEN ARRAY['The Private Estate Accelerator','The Family Business Accelerator']
    WHEN p_key IN ('tffm','tss','The Legacy InnerCircle','Legacy InnerCircle','The Succession Society','Succession Society','The Family Fortune Mastermind') THEN ARRAY['The Legacy InnerCircle']
    WHEN p_key IN ('vip','The Family Legacy: VIP Weekend') THEN ARRAY['The Family Legacy: VIP Weekend']
    WHEN p_key IN ('markusai','Markus AI','Markus AI Members') THEN ARRAY['Markus AI Members']
    ELSE ARRAY[p_key] END $function$;

CREATE OR REPLACE FUNCTION public.current_user_community_programs()
 RETURNS text[] LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  WITH tiers AS (
    SELECT public.community_program_tier(cg.name) AS t
      FROM public.group_memberships gm JOIN public.community_groups cg ON cg.id = gm.group_id
     WHERE gm.user_id = auth.uid()
    UNION ALL
    SELECT public.community_program_tier(regexp_replace(btrim(x), '\s*\([^)]*\)\s*$', ''))
      FROM public.profiles p, unnest(string_to_array(p.program_name, ',')) AS x
     WHERE p.user_id = auth.uid()
    UNION ALL
    SELECT 0 FROM public.subscribers s WHERE s.user_id = auth.uid() AND s.subscribed IS TRUE
      AND NOT EXISTS (SELECT 1 FROM public.profiles p2 WHERE p2.user_id = auth.uid() AND p2.program_name ILIKE '%markus ai%')
  ), top AS (SELECT max(t) AS m FROM tiers)
  SELECT COALESCE(
    (SELECT (ARRAY['fbu','tfv','tfba','tffm'])[1:(top.m + 1)] FROM top WHERE top.m IS NOT NULL), ARRAY[]::text[])
    || CASE WHEN EXISTS (
         SELECT 1 FROM public.group_memberships gm JOIN public.community_groups cg ON cg.id = gm.group_id
          WHERE gm.user_id = auth.uid() AND cg.name = ANY(public.program_group_names('vip'))
       ) THEN ARRAY['vip'] ELSE ARRAY[]::text[] END
    || CASE WHEN EXISTS (
         SELECT 1 FROM public.group_memberships gm JOIN public.community_groups cg ON cg.id = gm.group_id
          WHERE gm.user_id = auth.uid() AND cg.name = 'Markus AI Members'
       ) OR EXISTS (
         SELECT 1 FROM public.profiles p WHERE p.user_id = auth.uid() AND p.program_name ILIKE '%markus ai%'
       ) THEN ARRAY['markusai'] ELSE ARRAY[]::text[] END
$function$;