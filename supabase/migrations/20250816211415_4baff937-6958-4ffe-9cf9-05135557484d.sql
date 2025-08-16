-- Create family_office_members table
CREATE TABLE public.family_office_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  added_by UUID NOT NULL,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  role TEXT,
  company TEXT,
  department TEXT,
  access_level TEXT,
  specialties TEXT[],
  status TEXT NOT NULL DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.family_office_members ENABLE ROW LEVEL SECURITY;

-- Create policies for family office members
CREATE POLICY "Users can manage their own family office members"
ON public.family_office_members
FOR ALL
USING (auth.uid() = added_by)
WITH CHECK (auth.uid() = added_by);

-- Create trigger for updated_at
CREATE TRIGGER update_family_office_members_updated_at
BEFORE UPDATE ON public.family_office_members
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();