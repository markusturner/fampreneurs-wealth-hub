-- Create coaches table
CREATE TABLE public.coaches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  bio TEXT,
  specialties TEXT[] DEFAULT '{}',
  hourly_rate NUMERIC,
  years_experience INTEGER,
  is_active BOOLEAN DEFAULT true,
  added_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.coaches ENABLE ROW LEVEL SECURITY;

-- Create policies for coaches table
CREATE POLICY "Coaches are viewable by everyone" 
ON public.coaches 
FOR SELECT 
USING (true);

CREATE POLICY "Users can create coaches" 
ON public.coaches 
FOR INSERT 
WITH CHECK (auth.uid() = added_by);

CREATE POLICY "Users can update coaches they added" 
ON public.coaches 
FOR UPDATE 
USING (auth.uid() = added_by);

CREATE POLICY "Users can delete coaches they added" 
ON public.coaches 
FOR DELETE 
USING (auth.uid() = added_by);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_coaches_updated_at
BEFORE UPDATE ON public.coaches
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();