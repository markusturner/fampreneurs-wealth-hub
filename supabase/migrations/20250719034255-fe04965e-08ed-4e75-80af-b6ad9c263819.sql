-- Create table for family member notifications
CREATE TABLE public.family_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  family_member_id UUID REFERENCES public.family_members(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL DEFAULT 'meeting_scheduled',
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  meeting_id TEXT,
  meeting_date DATE,
  meeting_time TIME,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.family_notifications ENABLE ROW LEVEL SECURITY;

-- Create policies for family notifications
CREATE POLICY "Users can view notifications for their family members"
ON public.family_notifications
FOR SELECT
USING (
  user_id = auth.uid() OR 
  EXISTS (
    SELECT 1 FROM public.family_members fm
    WHERE fm.id = family_notifications.family_member_id 
    AND fm.added_by = auth.uid()
  )
);

CREATE POLICY "Users can create notifications for their family members"
ON public.family_notifications
FOR INSERT
WITH CHECK (
  user_id = auth.uid() OR 
  EXISTS (
    SELECT 1 FROM public.family_members fm
    WHERE fm.id = family_notifications.family_member_id 
    AND fm.added_by = auth.uid()
  )
);

CREATE POLICY "Users can update their own notifications"
ON public.family_notifications
FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own notifications"
ON public.family_notifications
FOR DELETE
USING (user_id = auth.uid());

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_family_notifications_updated_at
BEFORE UPDATE ON public.family_notifications
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to notify all family members about new meetings
CREATE OR REPLACE FUNCTION public.notify_family_members_about_meeting(
  meeting_title TEXT,
  meeting_date DATE,
  meeting_time TIME,
  meeting_id TEXT,
  creator_user_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  family_member_record RECORD;
  notification_count INTEGER := 0;
BEGIN
  -- Notify all family members added by the creator
  FOR family_member_record IN 
    SELECT id, full_name, email, family_position
    FROM public.family_members 
    WHERE added_by = creator_user_id AND status = 'active'
  LOOP
    -- Insert notification for each family member
    INSERT INTO public.family_notifications (
      user_id,
      family_member_id,
      notification_type,
      title,
      message,
      meeting_id,
      meeting_date,
      meeting_time
    ) VALUES (
      creator_user_id,
      family_member_record.id,
      'meeting_scheduled',
      'New Meeting Scheduled',
      'Meeting "' || meeting_title || '" has been scheduled for ' || 
      TO_CHAR(meeting_date, 'Mon DD, YYYY') || ' at ' || 
      TO_CHAR(meeting_time, 'HH:MI AM'),
      meeting_id,
      meeting_date,
      meeting_time
    );
    
    notification_count := notification_count + 1;
  END LOOP;
  
  RETURN notification_count;
END;
$$;