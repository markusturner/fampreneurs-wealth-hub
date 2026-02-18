
-- Create direct messages table
CREATE TABLE public.direct_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID NOT NULL,
  receiver_id UUID NOT NULL,
  content TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;

-- Users can see messages they sent or received
CREATE POLICY "Users can view their own messages"
  ON public.direct_messages FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- Users can send messages (insert)
CREATE POLICY "Users can send messages"
  ON public.direct_messages FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

-- Users can update messages they received (mark as read)
CREATE POLICY "Users can mark received messages as read"
  ON public.direct_messages FOR UPDATE
  USING (auth.uid() = receiver_id);

-- Index for fast lookups
CREATE INDEX idx_direct_messages_sender ON public.direct_messages (sender_id, created_at DESC);
CREATE INDEX idx_direct_messages_receiver ON public.direct_messages (receiver_id, created_at DESC);
CREATE INDEX idx_direct_messages_conversation ON public.direct_messages (
  LEAST(sender_id, receiver_id), GREATEST(sender_id, receiver_id), created_at DESC
);

-- Trigger for updated_at
CREATE TRIGGER update_direct_messages_updated_at
  BEFORE UPDATE ON public.direct_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
