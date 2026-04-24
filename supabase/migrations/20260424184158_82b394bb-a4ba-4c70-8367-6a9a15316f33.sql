
-- 1) Replace single-program trigger function with a multi-program aware one
CREATE OR REPLACE FUNCTION public.auto_assign_to_community_group()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
    program_item text;
    mapped_name text;
    target_group_id uuid;
BEGIN
    IF NEW.program_name IS NULL OR btrim(NEW.program_name) = '' THEN
        RETURN NEW;
    END IF;

    -- Iterate each comma-separated program in program_name
    FOR program_item IN
        SELECT btrim(p) FROM unnest(string_to_array(NEW.program_name, ',')) AS p
    LOOP
        IF program_item = '' THEN CONTINUE; END IF;

        mapped_name := CASE program_item
            WHEN 'The Family Business University' THEN 'Family Business University'
            WHEN 'The Family Vault' THEN 'The Family Vault'
            WHEN 'The Family Business Accelerator' THEN 'The Family Business Accelerator'
            WHEN 'The Family Legacy: VIP Weekend' THEN 'The Family Legacy: VIP Weekend'
            WHEN 'The Family Fortune Mastermind' THEN 'The Family Fortune Mastermind'
            ELSE program_item
        END;

        SELECT id INTO target_group_id
          FROM community_groups
         WHERE name = mapped_name
         LIMIT 1;

        IF target_group_id IS NOT NULL THEN
            INSERT INTO group_memberships (group_id, user_id, role)
            VALUES (target_group_id, NEW.user_id, 'member')
            ON CONFLICT (group_id, user_id) DO NOTHING;
        END IF;
    END LOOP;

    RETURN NEW;
END;
$function$;

-- 2) Backfill: insert any missing program-based memberships for ALL users
WITH program_map(program_key, community_name) AS (
  VALUES
    ('The Family Business University', 'Family Business University'),
    ('The Family Vault', 'The Family Vault'),
    ('The Family Business Accelerator', 'The Family Business Accelerator'),
    ('The Family Legacy: VIP Weekend', 'The Family Legacy: VIP Weekend'),
    ('The Family Fortune Mastermind', 'The Family Fortune Mastermind')
),
expanded AS (
  SELECT p.user_id, btrim(prog) AS program_key
  FROM profiles p,
       LATERAL unnest(string_to_array(coalesce(p.program_name, ''), ',')) AS prog
  WHERE coalesce(p.program_name, '') <> ''
),
desired AS (
  SELECT DISTINCT e.user_id, cg.id AS group_id
  FROM expanded e
  JOIN program_map pm ON pm.program_key = e.program_key
  JOIN community_groups cg ON cg.name = pm.community_name
)
INSERT INTO group_memberships (user_id, group_id, role)
SELECT d.user_id, d.group_id, 'member'
FROM desired d
ON CONFLICT (user_id, group_id) DO NOTHING;
