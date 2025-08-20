-- Fix critical security vulnerability in family_messages table
-- Only allow family members to access messages from their own family

-- First, drop the insecure policy that allows everyone to read all messages
DROP POLICY IF EXISTS "Family members can view all family messages" ON public.family_messages;

-- Create a security definer function to check if two users are in the same family
CREATE OR REPLACE FUNCTION public.users_are_family_members(user1_id uuid, user2_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
AS $$
  -- Check if both users are family members added by the same person
  -- OR if one user added the other as a family member
  -- OR if they are the same user
  SELECT 
    user1_id = user2_id OR
    EXISTS (
      SELECT 1 FROM public.family_members fm1
      JOIN public.family_members fm2 ON fm1.added_by = fm2.added_by
      WHERE fm1.email = (SELECT email FROM auth.users WHERE id = user1_id)
        AND fm2.email = (SELECT email FROM auth.users WHERE id = user2_id)
        AND fm1.status = 'active'
        AND fm2.status = 'active'
    ) OR
    EXISTS (
      SELECT 1 FROM public.family_members fm
      WHERE fm.added_by = user1_id 
        AND fm.email = (SELECT email FROM auth.users WHERE id = user2_id)
        AND fm.status = 'active'
    ) OR
    EXISTS (
      SELECT 1 FROM public.family_members fm
      WHERE fm.added_by = user2_id 
        AND fm.email = (SELECT email FROM auth.users WHERE id = user1_id)
        AND fm.status = 'active'
    );
$$;

-- Create secure RLS policies for family_messages
CREATE POLICY "Users can view messages from their family members only"
ON public.family_messages
FOR SELECT 
TO authenticated
USING (
  auth.uid() IS NOT NULL AND (
    -- User can see their own messages
    auth.uid() = sender_id OR
    -- User can see messages from family members
    public.users_are_family_members(auth.uid(), sender_id)
  )
);

-- Update the insert policy to ensure it's properly secured
DROP POLICY IF EXISTS "Family members can create messages" ON public.family_messages;

CREATE POLICY "Users can create messages as themselves"
ON public.family_messages
FOR INSERT 
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL AND 
  auth.uid() = sender_id
);

-- Add policies for UPDATE and DELETE operations
CREATE POLICY "Users can update their own messages"
ON public.family_messages
FOR UPDATE 
TO authenticated
USING (auth.uid() = sender_id)
WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can delete their own messages"
ON public.family_messages
FOR DELETE 
TO authenticated
USING (auth.uid() = sender_id);

-- Add audit logging for family message access
CREATE OR REPLACE FUNCTION public.log_family_message_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
AS $$
BEGIN
  -- Log access to family messages for security monitoring
  IF TG_OP = 'SELECT' AND auth.uid() IS NOT NULL AND auth.uid() != NEW.sender_id THEN
    PERFORM public.log_family_office_action(
      'family_message_accessed',
      'family_messages',
      NEW.id,
      NULL,
      NULL,
      'medium',
      jsonb_build_object(
        'message_sender', NEW.sender_id,
        'accessed_by', auth.uid(),
        'access_time', now()
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for audit logging (optional - uncomment if audit logging is desired)
-- CREATE TRIGGER family_message_access_trigger
--   AFTER SELECT ON public.family_messages
--   FOR EACH ROW
--   EXECUTE FUNCTION public.log_family_message_access();