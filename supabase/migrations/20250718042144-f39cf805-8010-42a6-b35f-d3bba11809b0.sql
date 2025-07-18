-- Create programs table for organizing groups
CREATE TABLE public.programs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  max_groups INTEGER DEFAULT NULL,
  monthly_group_calls INTEGER DEFAULT 0,
  monthly_individual_calls INTEGER DEFAULT 0,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- Enable RLS on programs
ALTER TABLE public.programs ENABLE ROW LEVEL SECURITY;

-- Programs policies
CREATE POLICY "Admins can manage programs" ON public.programs
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid() AND p.is_admin = true
  )
);

CREATE POLICY "Users can view programs" ON public.programs
FOR SELECT USING (true);

-- Add program_id to community_groups
ALTER TABLE public.community_groups 
ADD COLUMN program_id UUID REFERENCES public.programs(id);

-- Create call quotas tracking table
CREATE TABLE public.group_call_quotas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.community_groups(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  group_calls_used INTEGER NOT NULL DEFAULT 0,
  individual_calls_used INTEGER NOT NULL DEFAULT 0,
  group_calls_limit INTEGER NOT NULL DEFAULT 0,
  individual_calls_limit INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(group_id, period_start)
);

-- Enable RLS on call quotas
ALTER TABLE public.group_call_quotas ENABLE ROW LEVEL SECURITY;

-- Call quotas policies
CREATE POLICY "Group members can view their quotas" ON public.group_call_quotas
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.group_memberships gm
    WHERE gm.group_id = group_call_quotas.group_id
    AND gm.user_id = auth.uid()
  )
);

CREATE POLICY "Admins can manage call quotas" ON public.group_call_quotas
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid() AND p.is_admin = true
  )
);

-- Create message reactions table
CREATE TABLE public.message_reactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID NOT NULL REFERENCES public.group_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  reaction_type TEXT NOT NULL DEFAULT 'like', -- like, love, laugh, angry, sad, etc.
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(message_id, user_id, reaction_type)
);

-- Enable RLS on message reactions
ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;

-- Message reactions policies
CREATE POLICY "Users can react to messages in groups they belong to" ON public.message_reactions
FOR INSERT WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM public.group_messages gm
    JOIN public.group_memberships gmem ON gm.group_id = gmem.group_id
    WHERE gm.id = message_reactions.message_id
    AND gmem.user_id = auth.uid()
  )
);

CREATE POLICY "Users can view reactions in groups they belong to" ON public.message_reactions
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.group_messages gm
    JOIN public.group_memberships gmem ON gm.group_id = gmem.group_id
    WHERE gm.id = message_reactions.message_id
    AND gmem.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete their own reactions" ON public.message_reactions
FOR DELETE USING (auth.uid() = user_id);

-- Create message mentions table
CREATE TABLE public.message_mentions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID NOT NULL REFERENCES public.group_messages(id) ON DELETE CASCADE,
  mentioned_user_id UUID NOT NULL,
  mentioned_by_user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(message_id, mentioned_user_id)
);

-- Enable RLS on message mentions
ALTER TABLE public.message_mentions ENABLE ROW LEVEL SECURITY;

-- Message mentions policies
CREATE POLICY "Users can create mentions in groups they belong to" ON public.message_mentions
FOR INSERT WITH CHECK (
  auth.uid() = mentioned_by_user_id AND
  EXISTS (
    SELECT 1 FROM public.group_messages gm
    JOIN public.group_memberships gmem ON gm.group_id = gmem.group_id
    WHERE gm.id = message_mentions.message_id
    AND gmem.user_id = auth.uid()
  )
);

CREATE POLICY "Users can view mentions in groups they belong to" ON public.message_mentions
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.group_messages gm
    JOIN public.group_memberships gmem ON gm.group_id = gmem.group_id
    WHERE gm.id = message_mentions.message_id
    AND gmem.user_id = auth.uid()
  )
);

-- Create polls table
CREATE TABLE public.message_polls (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID NOT NULL REFERENCES public.group_messages(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  options JSONB NOT NULL, -- Array of poll options
  multiple_choice BOOLEAN NOT NULL DEFAULT false,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on polls
ALTER TABLE public.message_polls ENABLE ROW LEVEL SECURITY;

-- Create poll votes table
CREATE TABLE public.poll_votes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  poll_id UUID NOT NULL REFERENCES public.message_polls(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  option_index INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(poll_id, user_id, option_index)
);

-- Enable RLS on poll votes
ALTER TABLE public.poll_votes ENABLE ROW LEVEL SECURITY;

-- Poll policies
CREATE POLICY "Users can view polls in groups they belong to" ON public.message_polls
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.group_messages gm
    JOIN public.group_memberships gmem ON gm.group_id = gmem.group_id
    WHERE gm.id = message_polls.message_id
    AND gmem.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create polls in groups they belong to" ON public.message_polls
FOR INSERT WITH CHECK (
  auth.uid() = created_by AND
  EXISTS (
    SELECT 1 FROM public.group_messages gm
    JOIN public.group_memberships gmem ON gm.group_id = gmem.group_id
    WHERE gm.id = message_polls.message_id
    AND gmem.user_id = auth.uid()
  )
);

-- Poll votes policies
CREATE POLICY "Users can vote on polls in groups they belong to" ON public.poll_votes
FOR INSERT WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM public.message_polls mp
    JOIN public.group_messages gm ON mp.message_id = gm.id
    JOIN public.group_memberships gmem ON gm.group_id = gmem.group_id
    WHERE mp.id = poll_votes.poll_id
    AND gmem.user_id = auth.uid()
  )
);

CREATE POLICY "Users can view poll votes in groups they belong to" ON public.poll_votes
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.message_polls mp
    JOIN public.group_messages gm ON mp.message_id = gm.id
    JOIN public.group_memberships gmem ON gm.group_id = gmem.group_id
    WHERE mp.id = poll_votes.poll_id
    AND gmem.user_id = auth.uid()
  )
);

-- Add new fields to group_messages for rich content
ALTER TABLE public.group_messages 
ADD COLUMN attachment_url TEXT,
ADD COLUMN attachment_type TEXT, -- image, video, audio, document, gif
ADD COLUMN attachment_name TEXT,
ADD COLUMN attachment_size INTEGER;

-- Create storage bucket for message attachments
INSERT INTO storage.buckets (id, name, public) VALUES ('message-attachments', 'message-attachments', true);

-- Storage policies for message attachments
CREATE POLICY "Users can upload message attachments" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'message-attachments' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view message attachments" ON storage.objects
FOR SELECT USING (bucket_id = 'message-attachments');

CREATE POLICY "Users can delete their own message attachments" ON storage.objects
FOR DELETE USING (
  bucket_id = 'message-attachments' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Create function to automatically set call quotas when groups join programs
CREATE OR REPLACE FUNCTION public.update_group_call_quotas()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- When a group gets assigned to a program, create or update quotas
  IF NEW.program_id IS NOT NULL AND (OLD.program_id IS NULL OR OLD.program_id != NEW.program_id) THEN
    INSERT INTO public.group_call_quotas (
      group_id, 
      period_start, 
      period_end,
      group_calls_limit,
      individual_calls_limit
    )
    SELECT 
      NEW.id,
      DATE_TRUNC('month', CURRENT_DATE),
      (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month' - INTERVAL '1 day')::DATE,
      p.monthly_group_calls,
      p.monthly_individual_calls
    FROM public.programs p 
    WHERE p.id = NEW.program_id
    ON CONFLICT (group_id, period_start) 
    DO UPDATE SET
      group_calls_limit = EXCLUDED.group_calls_limit,
      individual_calls_limit = EXCLUDED.individual_calls_limit,
      updated_at = now();
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for auto-updating call quotas
CREATE TRIGGER update_group_call_quotas_trigger
  AFTER UPDATE ON public.community_groups
  FOR EACH ROW
  EXECUTE FUNCTION public.update_group_call_quotas();

-- Create updated_at triggers
CREATE TRIGGER update_programs_updated_at
  BEFORE UPDATE ON public.programs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_group_call_quotas_updated_at
  BEFORE UPDATE ON public.group_call_quotas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_message_polls_updated_at
  BEFORE UPDATE ON public.message_polls
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();