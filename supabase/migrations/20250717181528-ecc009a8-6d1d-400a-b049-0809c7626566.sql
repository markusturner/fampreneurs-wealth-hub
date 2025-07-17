-- Create groups table for Slack-like functionality
CREATE TABLE public.community_groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  is_private BOOLEAN NOT NULL DEFAULT false,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create group memberships table
CREATE TABLE public.group_memberships (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.community_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'member', -- admin, moderator, member
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(group_id, user_id)
);

-- Create group messages table
CREATE TABLE public.group_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.community_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'text', -- text, image, file
  file_url TEXT,
  reply_to UUID REFERENCES public.group_messages(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.community_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for community_groups
CREATE POLICY "Users can view public groups" 
ON public.community_groups 
FOR SELECT 
USING (NOT is_private);

CREATE POLICY "Users can view private groups they belong to" 
ON public.community_groups 
FOR SELECT 
USING (
  is_private AND EXISTS (
    SELECT 1 FROM public.group_memberships 
    WHERE group_id = community_groups.id AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can create groups" 
ON public.community_groups 
FOR INSERT 
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Group creators can update their groups" 
ON public.community_groups 
FOR UPDATE 
USING (auth.uid() = created_by);

CREATE POLICY "Group creators can delete their groups" 
ON public.community_groups 
FOR DELETE 
USING (auth.uid() = created_by);

-- RLS Policies for group_memberships
CREATE POLICY "Users can view memberships for groups they belong to" 
ON public.group_memberships 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.group_memberships gm 
    WHERE gm.group_id = group_memberships.group_id AND gm.user_id = auth.uid()
  )
);

CREATE POLICY "Users can join public groups" 
ON public.group_memberships 
FOR INSERT 
WITH CHECK (
  auth.uid() = user_id AND (
    EXISTS (
      SELECT 1 FROM public.community_groups 
      WHERE id = group_id AND NOT is_private
    ) OR
    EXISTS (
      SELECT 1 FROM public.community_groups cg
      JOIN public.group_memberships gm ON cg.id = gm.group_id
      WHERE cg.id = group_id AND gm.user_id = auth.uid() AND gm.role IN ('admin', 'moderator')
    )
  )
);

CREATE POLICY "Users can leave groups" 
ON public.group_memberships 
FOR DELETE 
USING (auth.uid() = user_id);

-- RLS Policies for group_messages
CREATE POLICY "Users can view messages in groups they belong to" 
ON public.group_messages 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.group_memberships 
    WHERE group_id = group_messages.group_id AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can send messages to groups they belong to" 
ON public.group_messages 
FOR INSERT 
WITH CHECK (
  auth.uid() = user_id AND EXISTS (
    SELECT 1 FROM public.group_memberships 
    WHERE group_id = group_messages.group_id AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their own messages" 
ON public.group_messages 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own messages" 
ON public.group_messages 
FOR DELETE 
USING (auth.uid() = user_id);

-- Add triggers for updated_at
CREATE TRIGGER update_community_groups_updated_at
BEFORE UPDATE ON public.community_groups
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_group_messages_updated_at
BEFORE UPDATE ON public.group_messages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Default groups have been removed - users can create their own groups