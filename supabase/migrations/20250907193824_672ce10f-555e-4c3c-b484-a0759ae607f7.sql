-- Add trial management fields to subscribers table
ALTER TABLE public.subscribers 
ADD COLUMN IF NOT EXISTS trial_start_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS trial_end_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS trial_days_remaining INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS early_payment_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS community_join_date TIMESTAMPTZ;

-- Create community call bookings table
CREATE TABLE IF NOT EXISTS public.community_call_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  current_situation TEXT,
  preferred_time_slots TEXT[],
  notes TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'scheduled', 'completed', 'cancelled')),
  scheduled_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on community_call_bookings
ALTER TABLE public.community_call_bookings ENABLE ROW LEVEL SECURITY;

-- Create policies for community_call_bookings
CREATE POLICY "Users can create their own call bookings" ON public.community_call_bookings
  FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can view their own call bookings" ON public.community_call_bookings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all call bookings" ON public.community_call_bookings
  FOR ALL USING (is_current_user_admin());