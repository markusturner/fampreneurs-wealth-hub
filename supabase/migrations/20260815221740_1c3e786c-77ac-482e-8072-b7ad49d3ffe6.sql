CREATE OR REPLACE FUNCTION public.notify_trust_created()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  creator_name TEXT;
  target_user RECORD;
  t_name TEXT;
BEGIN
  SELECT display_name INTO creator_name FROM public.profiles WHERE user_id = NEW.user_id;

  t_name := COALESCE(
    NULLIF(NEW.form_data->>'trust_name', ''),
    NULLIF(NEW.form_data->>'trustName', ''),
    'Untitled Trust'
  );

  INSERT INTO public.community_posts (content, user_id, program, category)
  VALUES 
    ('🏛️ ' || COALESCE(creator_name, 'A member') || ' just created a new trust: ' || t_name || '! Congratulations! 🎉', NEW.user_id, 'tfv', 'wins'),
    ('🏛️ ' || COALESCE(creator_name, 'A member') || ' just created a new trust: ' || t_name || '! Congratulations! 🎉', NEW.user_id, 'tfba', 'wins');

  FOR target_user IN 
    SELECT user_id FROM public.profiles WHERE user_id != NEW.user_id
  LOOP
    INSERT INTO public.notifications (user_id, sender_id, notification_type, title, message, reference_id, link)
    VALUES (
      target_user.user_id,
      NEW.user_id,
      'trust_created',
      'New Trust Created',
      COALESCE(creator_name, 'A member') || ' created a new trust',
      NEW.id,
      '/workspace-community?program=tfv'
    );
  END LOOP;

  RETURN NEW;
END;
$function$;