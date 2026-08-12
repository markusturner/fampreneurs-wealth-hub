
-- Backfill community memberships based on program tier
WITH tiers AS (
  SELECT p.user_id,
         CASE
           WHEN p.program_name ILIKE '%Succession Society%' OR p.program_name ILIKE '%Family Fortune Mastermind%' THEN 4
           WHEN p.program_name ILIKE '%Private Estate Accelerator%' OR p.program_name ILIKE '%Family Business Accelerator%' THEN 3
           WHEN p.program_name ILIKE '%Family Vault%' THEN 2
           WHEN p.program_name ILIKE '%Business University%' THEN 1
           ELSE 0
         END AS tier
  FROM public.profiles p
),
targets AS (
  SELECT t.user_id, g.id AS group_id
  FROM tiers t
  JOIN public.community_groups g ON (
    g.name = 'Community'
    OR (g.name = 'The Family Vault' AND t.tier >= 2)
    OR (g.name = 'The Private Estate Accelerator' AND t.tier >= 3)
    OR (g.name = 'The Succession Society' AND t.tier >= 4)
  )
  WHERE t.tier > 0
)
INSERT INTO public.group_memberships (user_id, group_id, role)
SELECT user_id, group_id, 'member' FROM targets
ON CONFLICT DO NOTHING;

-- Grant TruHeirs access to paid program members
UPDATE public.profiles
SET truheirs_access = true
WHERE truheirs_access IS DISTINCT FROM true
  AND (program_name ILIKE '%Family Vault%'
    OR program_name ILIKE '%Private Estate Accelerator%'
    OR program_name ILIKE '%Family Business Accelerator%'
    OR program_name ILIKE '%Succession Society%'
    OR program_name ILIKE '%Family Fortune Mastermind%');
