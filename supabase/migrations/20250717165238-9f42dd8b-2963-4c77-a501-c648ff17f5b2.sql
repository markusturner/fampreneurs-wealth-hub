-- Create categories table
CREATE TABLE public.categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL CHECK (type IN ('course', 'video')),
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- RLS Policies for categories
CREATE POLICY "Categories are viewable by everyone" 
ON public.categories 
FOR SELECT 
USING (true);

CREATE POLICY "Users can create categories" 
ON public.categories 
FOR INSERT 
WITH CHECK (auth.uid() = created_by);

-- Insert default categories
INSERT INTO public.categories (name, type, created_by) VALUES 
  ('Wealth Management', 'course', NULL),
  ('Investment', 'course', NULL),
  ('Estate Planning', 'course', NULL),
  ('Tax Strategy', 'course', NULL),
  ('Business Growth', 'course', NULL),
  ('Family Governance', 'course', NULL);

-- Create trigger for updated_at
CREATE TRIGGER update_categories_updated_at
  BEFORE UPDATE ON public.categories
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();