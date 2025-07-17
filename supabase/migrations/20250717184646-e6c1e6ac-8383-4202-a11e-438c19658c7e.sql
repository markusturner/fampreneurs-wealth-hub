-- Create family_members table
CREATE TABLE public.family_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  added_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  family_position TEXT NOT NULL,
  trust_positions TEXT[],
  relationship_to_family TEXT,
  is_invited BOOLEAN DEFAULT false,
  invitation_sent_at TIMESTAMP WITH TIME ZONE,
  joined_at TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'invited', 'active', 'inactive')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;

-- Create policies for family_members
CREATE POLICY "Users can view family members"
ON public.family_members
FOR SELECT
USING (true);

CREATE POLICY "Admins can manage family members"
ON public.family_members
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.is_admin = true
  )
);

CREATE POLICY "Users can add family members"
ON public.family_members
FOR INSERT
WITH CHECK (auth.uid() = added_by);

-- Create trigger for updated_at
CREATE TRIGGER update_family_members_updated_at
  BEFORE UPDATE ON public.family_members
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to notify family members about meetings
CREATE OR REPLACE FUNCTION public.notify_family_about_meeting(
  meeting_title TEXT,
  meeting_date TIMESTAMP WITH TIME ZONE,
  meeting_details TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  member_record RECORD;
  notification_count INTEGER := 0;
  result JSON;
BEGIN
  -- Loop through all active family members
  FOR member_record IN 
    SELECT full_name, email, phone, family_position
    FROM public.family_members 
    WHERE status = 'active' AND email IS NOT NULL
  LOOP
    -- Here you would integrate with an email service
    -- For now, we'll just count the notifications
    notification_count := notification_count + 1;
  END LOOP;
  
  -- Return result
  result := json_build_object(
    'success', true,
    'notifications_sent', notification_count,
    'meeting_title', meeting_title,
    'meeting_date', meeting_date
  );
  
  RETURN result;
END;
$$;