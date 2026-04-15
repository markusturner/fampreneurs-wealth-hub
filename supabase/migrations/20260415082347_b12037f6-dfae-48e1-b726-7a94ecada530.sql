
-- Fix: create_family_message_notification missing link field
CREATE OR REPLACE FUNCTION public.create_family_message_notification()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  sender_profile RECORD;
  family_member_record RECORD;
BEGIN
  SELECT display_name, first_name, last_name 
  INTO sender_profile
  FROM public.profiles 
  WHERE user_id = NEW.sender_id;
  
  FOR family_member_record IN 
    SELECT added_by FROM public.family_members 
    WHERE email = (SELECT email FROM auth.users WHERE id = NEW.sender_id)
  LOOP
    INSERT INTO public.notifications (
      user_id,
      sender_id,
      notification_type,
      title,
      message,
      reference_id,
      link
    ) VALUES (
      family_member_record.added_by,
      NEW.sender_id,
      'family_message',
      'New Family Message',
      COALESCE(
        sender_profile.display_name,
        CONCAT(sender_profile.first_name, ' ', sender_profile.last_name),
        'A family member'
      ) || ' sent you a message',
      NEW.id,
      '/messenger'
    );
    RAISE LOG 'notification: type=family_message recipient=% ref=%', family_member_record.added_by, NEW.id;
  END LOOP;
  
  RETURN NEW;
END;
$function$;
