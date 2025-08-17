-- First check if RLS is enabled and see current policies
SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'meeting_types';

-- Drop and recreate the policies to ensure they work correctly
DROP POLICY IF EXISTS "Users can manage their own meeting types" ON public.meeting_types;
DROP POLICY IF EXISTS "Users can view their own meeting types" ON public.meeting_types;

-- Enable RLS if not already enabled
ALTER TABLE public.meeting_types ENABLE ROW LEVEL SECURITY;

-- Create comprehensive policies for meeting types
CREATE POLICY "Users can view their own meeting types" 
ON public.meeting_types 
FOR SELECT 
USING (created_by = auth.uid());

CREATE POLICY "Users can create their own meeting types" 
ON public.meeting_types 
FOR INSERT 
WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update their own meeting types" 
ON public.meeting_types 
FOR UPDATE 
USING (created_by = auth.uid()) 
WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can delete their own meeting types" 
ON public.meeting_types 
FOR DELETE 
USING (created_by = auth.uid());