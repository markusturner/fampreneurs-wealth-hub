
-- Update create_post_notification to filter out orphaned users
CREATE OR REPLACE FUNCTION public.create_post_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sender_profile RECORD;
  member_record RECORD;
  target_group_name TEXT;
BEGIN
  SELECT display_name, first_name, last_name 
  INTO sender_profile
  FROM public.profiles 
  WHERE user_id = NEW.user_id;

  target_group_name := CASE NEW.program
    WHEN 'fbu' THEN 'Family Business University'
    WHEN 'tfv' THEN 'The Family Vault'
    WHEN 'tfba' THEN 'The Family Business Accelerator'
    WHEN 'tffm' THEN 'The Family Fortune Mastermind'
    ELSE NULL
  END;

  IF target_group_name IS NOT NULL THEN
    FOR member_record IN 
      SELECT DISTINCT gm.user_id 
      FROM public.group_memberships gm
      JOIN public.community_groups cg ON gm.group_id = cg.id
      JOIN auth.users u ON u.id = gm.user_id
      WHERE cg.name = target_group_name
        AND gm.user_id != NEW.user_id
    LOOP
      INSERT INTO public.notifications (
        user_id, sender_id, notification_type, title, message, reference_id
      ) VALUES (
        member_record.user_id,
        NEW.user_id,
        'post',
        'New Community Post',
        COALESCE(
          sender_profile.display_name,
          CONCAT(sender_profile.first_name, ' ', sender_profile.last_name),
          'Someone'
        ) || ' shared a new post in ' || target_group_name,
        NEW.id
      );
    END LOOP;
  ELSE
    FOR member_record IN 
      SELECT DISTINCT p.user_id FROM public.profiles p
      JOIN auth.users u ON u.id = p.user_id
      WHERE p.user_id != NEW.user_id
    LOOP
      INSERT INTO public.notifications (
        user_id, sender_id, notification_type, title, message, reference_id
      ) VALUES (
        member_record.user_id,
        NEW.user_id,
        'post',
        'New Community Post',
        COALESCE(
          sender_profile.display_name,
          CONCAT(sender_profile.first_name, ' ', sender_profile.last_name),
          'Someone'
        ) || ' shared a new post in the community',
        NEW.id
      );
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_community_post()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  poster_name TEXT;
  target_user RECORD;
  target_group_name TEXT;
BEGIN
  SELECT display_name INTO poster_name FROM public.profiles WHERE user_id = NEW.user_id;

  target_group_name := CASE NEW.program
    WHEN 'fbu' THEN 'Family Business University'
    WHEN 'tfv' THEN 'The Family Vault'
    WHEN 'tfba' THEN 'The Family Business Accelerator'
    WHEN 'tffm' THEN 'The Family Fortune Mastermind'
    ELSE NULL
  END;

  IF target_group_name IS NOT NULL THEN
    FOR target_user IN 
      SELECT DISTINCT gm.user_id 
      FROM public.group_memberships gm
      JOIN public.community_groups cg ON gm.group_id = cg.id
      JOIN auth.users u ON u.id = gm.user_id
      WHERE cg.name = target_group_name
        AND gm.user_id != NEW.user_id
    LOOP
      INSERT INTO public.notifications (user_id, sender_id, notification_type, title, message, reference_id)
      VALUES (
        target_user.user_id,
        NEW.user_id,
        'community_post',
        'New Post in ' || target_group_name,
        COALESCE(poster_name, 'A member') || ' posted in ' || target_group_name,
        NEW.id
      );
    END LOOP;
  ELSE
    FOR target_user IN 
      SELECT p.user_id FROM public.profiles p
      JOIN auth.users u ON u.id = p.user_id
      WHERE p.user_id != NEW.user_id
    LOOP
      INSERT INTO public.notifications (user_id, sender_id, notification_type, title, message, reference_id)
      VALUES (
        target_user.user_id,
        NEW.user_id,
        'community_post',
        'New Community Post',
        COALESCE(poster_name, 'A member') || ' posted in the community',
        NEW.id
      );
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$;
