-- Create certificates table
CREATE TABLE public.course_certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  certificate_number TEXT NOT NULL UNIQUE,
  completion_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, course_id)
);

-- Enable RLS
ALTER TABLE public.course_certificates ENABLE ROW LEVEL SECURITY;

-- Create policies for certificates
CREATE POLICY "Users can view their own certificates"
ON public.course_certificates
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "System can create certificates"
ON public.course_certificates
FOR INSERT
WITH CHECK (true);

-- Add updated_at trigger
CREATE TRIGGER update_course_certificates_updated_at
BEFORE UPDATE ON public.course_certificates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to generate certificate number
CREATE OR REPLACE FUNCTION public.generate_certificate_number()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  cert_number TEXT;
BEGIN
  -- Generate a unique certificate number with format: CERT-YYYY-XXXXXXXX
  cert_number := 'CERT-' || EXTRACT(YEAR FROM now()) || '-' || 
                 LPAD(FLOOR(RANDOM() * 100000000)::TEXT, 8, '0');
  
  -- Ensure uniqueness
  WHILE EXISTS (SELECT 1 FROM public.course_certificates WHERE certificate_number = cert_number) LOOP
    cert_number := 'CERT-' || EXTRACT(YEAR FROM now()) || '-' || 
                   LPAD(FLOOR(RANDOM() * 100000000)::TEXT, 8, '0');
  END LOOP;
  
  RETURN cert_number;
END;
$$;

-- Function to automatically create certificate when course is completed
CREATE OR REPLACE FUNCTION public.handle_course_completion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if progress reaches 100% and no certificate exists yet
  IF NEW.progress >= 100 AND (OLD.progress IS NULL OR OLD.progress < 100) THEN
    INSERT INTO public.course_certificates (
      user_id,
      course_id,
      certificate_number
    ) VALUES (
      NEW.user_id,
      NEW.course_id,
      public.generate_certificate_number()
    )
    ON CONFLICT (user_id, course_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for automatic certificate generation
CREATE TRIGGER course_completion_certificate_trigger
AFTER UPDATE ON public.course_enrollments
FOR EACH ROW
EXECUTE FUNCTION public.handle_course_completion();