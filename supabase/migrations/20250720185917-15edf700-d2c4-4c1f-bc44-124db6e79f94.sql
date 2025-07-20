-- Create video call rooms table
CREATE TABLE public.video_call_rooms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_name TEXT NOT NULL,
  room_url TEXT NOT NULL,
  privacy TEXT NOT NULL DEFAULT 'private' CHECK (privacy IN ('public', 'private')),
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on video call rooms
ALTER TABLE public.video_call_rooms ENABLE ROW LEVEL SECURITY;

-- Create policies for video call rooms
CREATE POLICY "Users can view rooms they created or are invited to" 
ON public.video_call_rooms 
FOR SELECT 
USING (created_by = auth.uid() OR privacy = 'public');

CREATE POLICY "Users can create video call rooms" 
ON public.video_call_rooms 
FOR INSERT 
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own rooms" 
ON public.video_call_rooms 
FOR UPDATE 
USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own rooms" 
ON public.video_call_rooms 
FOR DELETE 
USING (auth.uid() = created_by);

-- Create trigger for updated_at
CREATE TRIGGER update_video_call_rooms_updated_at
BEFORE UPDATE ON public.video_call_rooms
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();