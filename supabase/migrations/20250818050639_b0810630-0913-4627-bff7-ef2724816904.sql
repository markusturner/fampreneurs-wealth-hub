-- Create family messages table
CREATE TABLE public.family_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.family_messages ENABLE ROW LEVEL SECURITY;

-- Create policies for family messages
CREATE POLICY "Family members can view all family messages" 
ON public.family_messages 
FOR SELECT 
USING (true);

CREATE POLICY "Family members can create messages" 
ON public.family_messages 
FOR INSERT 
WITH CHECK (auth.uid() = sender_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_family_messages_updated_at
BEFORE UPDATE ON public.family_messages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for family messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.family_messages;