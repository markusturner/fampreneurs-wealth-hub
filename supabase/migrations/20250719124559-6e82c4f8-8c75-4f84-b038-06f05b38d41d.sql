-- Create weekly checkin tables and functions
CREATE TABLE public.weekly_checkin_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  week_ending DATE NOT NULL,
  overall_week_rating INTEGER NOT NULL CHECK (overall_week_rating >= 1 AND overall_week_rating <= 10),
  business_progress_rating INTEGER NOT NULL CHECK (business_progress_rating >= 1 AND business_progress_rating <= 10),
  family_time_rating INTEGER NOT NULL CHECK (family_time_rating >= 1 AND family_time_rating <= 10),
  health_wellness_rating INTEGER NOT NULL CHECK (health_wellness_rating >= 1 AND health_wellness_rating <= 10),
  financial_goals_rating INTEGER NOT NULL CHECK (financial_goals_rating >= 1 AND financial_goals_rating <= 10),
  week_highlights TEXT,
  biggest_challenge TEXT,
  next_week_priority TEXT,
  support_needed TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on weekly_checkin_responses
ALTER TABLE public.weekly_checkin_responses ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for weekly_checkin_responses
CREATE POLICY "Users can create their own weekly checkin responses" 
ON public.weekly_checkin_responses 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own weekly checkin responses" 
ON public.weekly_checkin_responses 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own weekly checkin responses" 
ON public.weekly_checkin_responses 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all weekly checkin responses" 
ON public.weekly_checkin_responses 
FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE profiles.user_id = auth.uid() 
  AND profiles.is_admin = true
));

-- Create weekly_checkin_notifications table
CREATE TABLE public.weekly_checkin_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  last_notification_sent TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notification_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS on weekly_checkin_notifications
ALTER TABLE public.weekly_checkin_notifications ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for weekly_checkin_notifications
CREATE POLICY "System can manage weekly checkin notifications" 
ON public.weekly_checkin_notifications 
FOR ALL
USING (true);

CREATE POLICY "Users can view their own weekly checkin notification status" 
ON public.weekly_checkin_notifications 
FOR SELECT 
USING (auth.uid() = user_id);

-- Create function to check if user needs weekly checkin
CREATE OR REPLACE FUNCTION public.user_needs_weekly_checkin(target_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE(
    (
      -- Check if it's Friday and no notification sent this week
      SELECT EXTRACT(DOW FROM CURRENT_DATE) = 5 -- Friday
      AND (
        last_notification_sent < DATE_TRUNC('week', CURRENT_DATE)
        OR last_notification_sent IS NULL
      )
      FROM public.weekly_checkin_notifications 
      WHERE user_id = target_user_id
    ), 
    EXTRACT(DOW FROM CURRENT_DATE) = 5 -- If no record exists and it's Friday, user needs notification
  );
$$;

-- Create trigger for timestamp updates
CREATE TRIGGER update_weekly_checkin_responses_updated_at
BEFORE UPDATE ON public.weekly_checkin_responses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_weekly_checkin_notifications_updated_at
BEFORE UPDATE ON public.weekly_checkin_notifications
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();