-- Create a general notifications table for messages and posts
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL CHECK (notification_type IN ('message', 'post', 'comment')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  reference_id UUID, -- ID of the message, post, or comment
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own notifications" 
ON public.notifications 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "System can create notifications" 
ON public.notifications 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Users can update their own notifications" 
ON public.notifications 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notifications" 
ON public.notifications 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX idx_notifications_is_read ON public.notifications(is_read);

-- Create trigger for updated_at
CREATE TRIGGER update_notifications_updated_at
  BEFORE UPDATE ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for notifications table
ALTER TABLE notifications REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- Function to create message notification
CREATE OR REPLACE FUNCTION public.create_message_notification()
RETURNS TRIGGER AS $$
DECLARE
  sender_profile RECORD;
BEGIN
  -- Get sender profile info
  SELECT display_name, first_name, last_name 
  INTO sender_profile
  FROM public.profiles 
  WHERE user_id = NEW.sender_id;
  
  -- Create notification for recipient
  INSERT INTO public.notifications (
    user_id,
    sender_id,
    notification_type,
    title,
    message,
    reference_id
  ) VALUES (
    NEW.recipient_id,
    NEW.sender_id,
    'message',
    'New Message',
    COALESCE(
      sender_profile.display_name,
      CONCAT(sender_profile.first_name, ' ', sender_profile.last_name),
      'Someone'
    ) || ' sent you a message',
    NEW.id
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create post notification
CREATE OR REPLACE FUNCTION public.create_post_notification()
RETURNS TRIGGER AS $$
DECLARE
  sender_profile RECORD;
  member_record RECORD;
BEGIN
  -- Get sender profile info
  SELECT display_name, first_name, last_name 
  INTO sender_profile
  FROM public.profiles 
  WHERE user_id = NEW.user_id;
  
  -- Create notifications for all users except the poster
  FOR member_record IN 
    SELECT DISTINCT user_id 
    FROM public.profiles 
    WHERE user_id != NEW.user_id
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
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers
CREATE TRIGGER trigger_message_notification
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.create_message_notification();

CREATE TRIGGER trigger_post_notification
  AFTER INSERT ON public.community_posts
  FOR EACH ROW
  EXECUTE FUNCTION public.create_post_notification();