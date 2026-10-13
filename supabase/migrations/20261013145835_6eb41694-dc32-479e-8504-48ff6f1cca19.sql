CREATE OR REPLACE FUNCTION public.program_group_names(p_key text)
RETURNS text[] LANGUAGE sql IMMUTABLE SET search_path TO 'public' AS $$
  SELECT CASE
    WHEN p_key IN ('fbu','Family Business University','The Family Business University','Community')
      THEN ARRAY['Community','Family Business University','The Family Business University']
    WHEN p_key IN ('tfv','ttv','The Trust Vault','Trust Vault','The Family Vault')
      THEN ARRAY['The Trust Vault','The Family Vault']
    WHEN p_key IN ('tfba','pea','The Private Estate Accelerator','Private Estate Accelerator','The Family Business Accelerator')
      THEN ARRAY['The Private Estate Accelerator','The Family Business Accelerator']
    WHEN p_key IN ('tffm','tss','The Succession Society','Succession Society','The Family Fortune Mastermind')
      THEN ARRAY['The Succession Society','The Family Fortune Mastermind']
    WHEN p_key IN ('vip','The Family Legacy: VIP Weekend')
      THEN ARRAY['The Family Legacy: VIP Weekend']
    ELSE ARRAY[p_key]
  END
$$;

CREATE OR REPLACE FUNCTION public.program_display_name(p_code text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path TO 'public' AS $$
  SELECT CASE p_code
    WHEN 'fbu' THEN 'the Community'
    WHEN 'tfv' THEN 'The Trust Vault'
    WHEN 'tfba' THEN 'The Private Estate Accelerator'
    WHEN 'tffm' THEN 'The Succession Society'
    ELSE NULL END
$$;

CREATE OR REPLACE FUNCTION public.notify_community_post()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE
  poster_name TEXT; target_user RECORD; disp TEXT; nav_link TEXT;
BEGIN
  SELECT display_name INTO poster_name FROM public.profiles WHERE user_id = NEW.user_id;
  nav_link := '/workspace-community' || CASE WHEN NEW.program IS NOT NULL THEN '?program=' || NEW.program ELSE '' END;
  disp := public.program_display_name(NEW.program);

  IF disp IS NOT NULL THEN
    FOR target_user IN
      SELECT DISTINCT gm.user_id FROM public.group_memberships gm
      JOIN public.community_groups cg ON gm.group_id = cg.id
      JOIN auth.users u ON u.id = gm.user_id
      WHERE cg.name = ANY(public.program_group_names(NEW.program)) AND gm.user_id != NEW.user_id
    LOOP
      INSERT INTO public.notifications (user_id, sender_id, notification_type, title, message, reference_id, link)
      VALUES (target_user.user_id, NEW.user_id, 'community_post', 'New Post in ' || disp,
        COALESCE(poster_name, 'A member') || ' posted in ' || disp, NEW.id, nav_link);
    END LOOP;
  ELSE
    FOR target_user IN
      SELECT p.user_id FROM public.profiles p JOIN auth.users u ON u.id = p.user_id WHERE p.user_id != NEW.user_id
    LOOP
      INSERT INTO public.notifications (user_id, sender_id, notification_type, title, message, reference_id, link)
      VALUES (target_user.user_id, NEW.user_id, 'community_post', 'New Community Post',
        COALESCE(poster_name, 'A member') || ' posted in the community', NEW.id, nav_link);
    END LOOP;
  END IF;
  RETURN NEW;
END;
$function$;

-- Duplicate of notify_community_post (same recipients, second alert per post). Keep it but make it in-app only by matching current names.
CREATE OR REPLACE FUNCTION public.create_post_notification()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
BEGIN
  -- notify_community_post already notifies the same members; skip to avoid double pushes.
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.auto_assign_new_user_to_program_channel()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
BEGIN
  IF NEW.program_name IS NOT NULL THEN
    INSERT INTO public.group_memberships (group_id, user_id, role)
    SELECT id, NEW.user_id, 'member' FROM public.community_groups
    WHERE name = ANY(public.program_group_names(NEW.program_name))
    ON CONFLICT (group_id, user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.auto_assign_to_community_group()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $function$
DECLARE program_item text;
BEGIN
  IF NEW.program_name IS NULL OR btrim(NEW.program_name) = '' THEN RETURN NEW; END IF;
  FOR program_item IN SELECT btrim(p) FROM unnest(string_to_array(NEW.program_name, ',')) AS p LOOP
    IF program_item = '' THEN CONTINUE; END IF;
    INSERT INTO group_memberships (group_id, user_id, role)
    SELECT id, NEW.user_id, 'member' FROM community_groups
    WHERE name = ANY(public.program_group_names(program_item))
    ON CONFLICT (group_id, user_id) DO NOTHING;
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
         AND group_id IN (SELECT id FROM public.community_groups
                          WHERE name = ANY(public.program_group_names(OLD.program_name)));
    END IF;
    IF NEW.program_name IS NOT NULL THEN
      INSERT INTO public.group_memberships (group_id, user_id, role)
      SELECT id, NEW.user_id, 'member' FROM public.community_groups
      WHERE name = ANY(public.program_group_names(NEW.program_name))
      ON CONFLICT (group_id, user_id) DO NOTHING;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.auto_grant_channel_access()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE channel_id_to_grant UUID;
BEGIN
  IF NEW.program_name IS NULL THEN RETURN NEW; END IF;
  SELECT id INTO channel_id_to_grant FROM public.channels
  WHERE is_private = true
    AND name = ANY(public.program_group_names(NEW.program_name) || ARRAY[
      CASE WHEN 'The Trust Vault' = ANY(public.program_group_names(NEW.program_name)) THEN 'Family Vault' END,
      CASE WHEN 'The Private Estate Accelerator' = ANY(public.program_group_names(NEW.program_name)) THEN 'Family Business Accelerator' END,
      CASE WHEN 'The Succession Society' = ANY(public.program_group_names(NEW.program_name)) THEN 'Family Fortune Mastermind' END,
      CASE WHEN NEW.program_name = 'The Family Legacy: VIP Weekend' THEN 'Family Legacy VIP' END])
  LIMIT 1;
  IF channel_id_to_grant IS NOT NULL THEN
    INSERT INTO public.channel_members (channel_id, user_id, role)
    VALUES (channel_id_to_grant, NEW.user_id, 'member')
    ON CONFLICT (channel_id, user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$function$;