-- Create feedback responses table
CREATE TABLE public.feedback_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  overall_satisfaction INTEGER CHECK (overall_satisfaction >= 1 AND overall_satisfaction <= 10),
  program_effectiveness INTEGER CHECK (program_effectiveness >= 1 AND program_effectiveness <= 10),
  ease_of_use INTEGER CHECK (ease_of_use >= 1 AND ease_of_use <= 10),
  community_support INTEGER CHECK (community_support >= 1 AND community_support <= 10),
  feature_usefulness INTEGER CHECK (feature_usefulness >= 1 AND feature_usefulness <= 10),
  improvement_suggestions TEXT,
  additional_feedback TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create feedback notifications table to track when users were last notified
CREATE TABLE public.feedback_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  last_notification_sent TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notification_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.feedback_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback_notifications ENABLE ROW LEVEL SECURITY;

-- Create policies for feedback_responses
CREATE POLICY "Users can view their own feedback responses" 
ON public.feedback_responses 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own feedback responses" 
ON public.feedback_responses 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own feedback responses" 
ON public.feedback_responses 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all feedback responses" 
ON public.feedback_responses 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE profiles.user_id = auth.uid() 
  AND profiles.is_admin = true
));

-- Create policies for feedback_notifications
CREATE POLICY "Users can view their own notification status" 
ON public.feedback_notifications 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "System can manage feedback notifications" 
ON public.feedback_notifications 
FOR ALL 
USING (true);

-- Add trigger for updated_at columns
CREATE TRIGGER update_feedback_responses_updated_at
BEFORE UPDATE ON public.feedback_responses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_feedback_notifications_updated_at
BEFORE UPDATE ON public.feedback_notifications
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to check if user needs feedback notification
CREATE OR REPLACE FUNCTION public.user_needs_feedback_notification(target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE SECURITY DEFINER
AS $$
  SELECT COALESCE(
    (
      SELECT last_notification_sent < (now() - INTERVAL '2 weeks')
      FROM public.feedback_notifications 
      WHERE user_id = target_user_id
    ), 
    true -- If no record exists, user needs notification
  );
$$;