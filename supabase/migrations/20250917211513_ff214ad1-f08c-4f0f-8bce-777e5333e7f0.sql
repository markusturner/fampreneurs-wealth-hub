-- Create notification trigger for family_messages table
CREATE OR REPLACE FUNCTION public.create_family_message_notification()
RETURNS TRIGGER AS $$
DECLARE
  sender_profile RECORD;
  family_member_record RECORD;
BEGIN
  -- Get sender profile info
  SELECT display_name, first_name, last_name 
  INTO sender_profile
  FROM public.profiles 
  WHERE user_id = NEW.sender_id;
  
  -- Find who should receive this notification (family head/admin)
  -- This would be the person who added the family members
  FOR family_member_record IN 
    SELECT added_by FROM public.family_members 
    WHERE email = (SELECT email FROM auth.users WHERE id = NEW.sender_id)
  LOOP
    -- Create notification for family head
    INSERT INTO public.notifications (
      user_id,
      sender_id,
      notification_type,
      title,
      message,
      reference_id
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
      NEW.id
    );
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create notification trigger for group_messages table
CREATE OR REPLACE FUNCTION public.create_group_message_notification()
RETURNS TRIGGER AS $$
DECLARE
  sender_profile RECORD;
  member_record RECORD;
  group_info RECORD;
BEGIN
  -- Get sender profile and group info
  SELECT display_name, first_name, last_name 
  INTO sender_profile
  FROM public.profiles 
  WHERE user_id = NEW.user_id;
  
  SELECT name INTO group_info
  FROM public.community_groups 
  WHERE id = NEW.group_id;
  
  -- Create notifications for all group members except sender
  FOR member_record IN 
    SELECT user_id FROM public.group_memberships 
    WHERE group_id = NEW.group_id AND user_id != NEW.user_id
  LOOP
    INSERT INTO public.notifications (
      user_id,
      sender_id,
      notification_type,
      title,
      message,
      reference_id
    ) VALUES (
      member_record.user_id,
      NEW.user_id,
      'group_message',
      'New Group Message',
      COALESCE(
        sender_profile.display_name,
        CONCAT(sender_profile.first_name, ' ', sender_profile.last_name),
        'Someone'
      ) || ' posted in ' || COALESCE(group_info.name, 'a group'),
      NEW.id
    );
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers for family_messages
CREATE TRIGGER family_message_notification_trigger
AFTER INSERT ON public.family_messages
FOR EACH ROW EXECUTE FUNCTION public.create_family_message_notification();

-- Create triggers for group_messages  
CREATE TRIGGER group_message_notification_trigger
AFTER INSERT ON public.group_messages
FOR EACH ROW EXECUTE FUNCTION public.create_group_message_notification();